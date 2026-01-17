import { Response } from 'express';
import mongoose from 'mongoose';
import Order, { OrderStatus } from '../models/Order';
import Product from '../models/Product';
import StockMovement, { MovementType, MovementReason } from '../models/StockMovement';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getOrders = async (req: AuthRequest, res: Response) => {
    try {
        const orders = await Order.find({ tenantId: req.tenantId })
            .populate('supplierId', 'name')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createOrder = async (req: AuthRequest, res: Response) => {
    const { items, totalAmount, customerName, shippingAddress, supplierId } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Check stock for all items
        for (const item of items) {
            const product = await Product.findOne({
                _id: item.productId,
                tenantId: req.tenantId,
                'variants.sku': item.sku,
            }).session(session);

            if (!product) {
                throw new Error(`Product variant ${item.sku} not found`);
            }

            const variant = product.variants.find(v => v.sku === item.sku);
            if (!variant || variant.stock < item.quantity) {
                throw new Error(`Insufficient stock for ${item.sku}. Available: ${variant?.stock || 0}`);
            }

            // 2. Deduct stock
            variant.stock -= item.quantity;
            await product.save({ session });

            // 3. Log movement
            await StockMovement.create([{
                tenantId: req.tenantId,
                productId: product._id,
                sku: item.sku,
                type: MovementType.OUT,
                quantity: item.quantity,
                reason: MovementReason.SALE,
                user: req.user?._id,
            }], { session });
        }

        // 4. Create Order
        const order = await Order.create([{
            tenantId: req.tenantId,
            customerName,
            shippingAddress,
            supplierId,
            items,
            totalAmount,
            status: OrderStatus.PENDING,
        }], { session });

        await session.commitTransaction();
        session.endSession();

        // Notify via socket
        const io = req.app.get('io');
        io.to(req.tenantId).emit('order-created', order[0]);

        res.status(201).json(order[0]);
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ message: error.message });
    }
};

// @desc    Cancel an order
// @route   POST /api/orders/:id/cancel
export const cancelOrder = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const order = await Order.findOne({ _id: id, tenantId: req.tenantId }).session(session);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status === OrderStatus.CANCELLED) {
            return res.status(400).json({ message: 'Order is already cancelled' });
        }

        // Return stock to inventory
        for (const item of order.items) {
            await Product.findOneAndUpdate(
                { tenantId: req.tenantId, 'variants.sku': item.sku },
                { $inc: { 'variants.$.stock': item.quantity } },
                { session }
            );

            // Log movement
            await StockMovement.create([{
                tenantId: req.tenantId,
                productId: item.productId,
                sku: item.sku,
                type: MovementType.IN,
                quantity: item.quantity,
                reason: MovementReason.RETURN_FROM_CUSTOMER,
                user: req.user?._id,
            }], { session });
        }

        order.status = OrderStatus.CANCELLED;
        await order.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json(order);
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const order = await Order.findOneAndUpdate(
            { _id: id, tenantId: req.tenantId },
            { status },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(order);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
