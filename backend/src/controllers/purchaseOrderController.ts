import { Response } from 'express';
import mongoose from 'mongoose';
import PurchaseOrder, { POStatus } from '../models/PurchaseOrder';
import Product from '../models/Product';
import StockMovement, { MovementType, MovementReason } from '../models/StockMovement';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getPurchaseOrders = async (req: AuthRequest, res: Response) => {
    try {
        const pos = await PurchaseOrder.find({ tenantId: req.tenantId }).populate('vendorId', 'name');
        res.json(pos);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createPurchaseOrder = async (req: AuthRequest, res: Response) => {
    const { vendorId, items, totalAmount } = req.body;
    try {
        const po = await PurchaseOrder.create({
            tenantId: req.tenantId,
            vendorId,
            items,
            totalAmount,
            status: POStatus.DRAFT,
        });
        res.status(201).json(po);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updatePOStatus = async (req: AuthRequest, res: Response) => {
    const { status } = req.body;
    const poId = req.params.id;

    try {
        const po = await PurchaseOrder.findOneAndUpdate(
            { _id: poId, tenantId: req.tenantId },
            { status },
            { new: true }
        );
        if (!po) {
            return res.status(404).json({ message: 'Purchase Order not found' });
        }

        const io = req.app.get('io');
        io.to(req.tenantId).emit('po-updated', po);

        res.json(po);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const receiveItems = async (req: AuthRequest, res: Response) => {
    const { items } = req.body; // Array of { sku: string, quantity: number }
    const poId = req.params.id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const po = await PurchaseOrder.findOne({ _id: poId, tenantId: req.tenantId }).session(session);
        if (!po) {
            throw new Error('Purchase Order not found');
        }

        if (po.status === POStatus.RECEIVED || po.status === POStatus.CANCELLED) {
            throw new Error('PO cannot be updated in its current status');
        }

        let totalVariance = 0;
        for (const receivedItem of items) {
            const poItem = po.items.find(i => i.sku === receivedItem.sku);
            if (!poItem) continue;

            const remaining = poItem.quantity - poItem.receivedQuantity;
            const toReceive = Math.min(receivedItem.quantity, remaining);

            if (toReceive <= 0) continue;

            // Handle price variance
            if (receivedItem.actualUnitCost !== undefined && receivedItem.actualUnitCost !== poItem.unitCost) {
                totalVariance += (receivedItem.actualUnitCost - poItem.unitCost) * poItem.quantity;
                poItem.unitCost = receivedItem.actualUnitCost;
            }

            poItem.receivedQuantity += toReceive;

            // Update product stock
            const product = await Product.findOneAndUpdate(
                {
                    tenantId: req.tenantId,
                    'variants.sku': receivedItem.sku
                },
                { $inc: { 'variants.$.stock': toReceive } },
                { session, new: true }
            );

            if (product) {
                // Log stock movement
                await StockMovement.create([{
                    tenantId: req.tenantId,
                    productId: product._id,
                    sku: receivedItem.sku,
                    type: MovementType.IN,
                    quantity: toReceive,
                    reason: MovementReason.PURCHASE,
                    referenceId: po._id,
                    user: req.user?._id,
                }], { session });
            }
        }

        po.totalAmount += totalVariance;

        // Update PO status
        const allReceived = po.items.every(i => i.receivedQuantity >= i.quantity);
        po.status = allReceived ? POStatus.RECEIVED : POStatus.PARTIALLY_RECEIVED;
        if (allReceived) {
            po.receivedDate = new Date();
        }

        await po.save({ session });
        await session.commitTransaction();
        session.endSession();

        const io = req.app.get('io');
        io.to(req.tenantId).emit('po-updated', po);

        res.json(po);
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ message: error.message });
    }
};
