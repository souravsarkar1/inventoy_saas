import { Response } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product';
import StockMovement, { MovementType, MovementReason } from '../models/StockMovement';
import { AuthRequest } from '../middlewares/authMiddleware';

// @desc    Get all products
// @route   GET /api/products
export const getProducts = async (req: AuthRequest, res: Response) => {
    const { search, category, brand } = req.query;
    const query: any = { tenantId: req.tenantId as any };

    if (search) {
        query.$text = { $search: search as string };
    }
    if (category) {
        query.category = category;
    }
    if (brand) {
        query.brand = brand;
    }

    try {
        const products = await Product.find(query);
        res.json(products);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a product
// @route   POST /api/products
export const createProduct = async (req: AuthRequest, res: Response) => {
    const { name, description, category, brand, variants } = req.body;

    try {
        const product = await Product.create({
            tenantId: req.tenantId,
            name,
            description,
            category,
            brand,
            variants,
        });

        // Initial stock movement logs
        const movements = variants.map((v: any) => ({
            tenantId: req.tenantId,
            productId: product._id,
            sku: v.sku,
            type: MovementType.IN,
            quantity: v.stock,
            reason: MovementReason.PURCHASE,
            user: req.user?._id,
        }));

        if (movements.length > 0) {
            await StockMovement.insertMany(movements);
        }

        res.status(201).json(product);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update stock adjustment
// @route   POST /api/products/stock-adjustment
export const adjustStock = async (req: AuthRequest, res: Response) => {
    const { sku, quantity, reason } = req.body;

    try {
        // Use atomic update to prevent race conditions
        const product = await Product.findOneAndUpdate(
            {
                tenantId: req.tenantId,
                'variants.sku': sku,
                ...(quantity < 0 ? { 'variants': { $elemMatch: { sku, stock: { $gte: Math.abs(quantity) } } } } : {})
            },
            { $inc: { 'variants.$.stock': quantity } },
            { new: true }
        );

        if (!product) {
            // Check if product exists at all or if stock was insufficient
            const exists = await Product.findOne({ tenantId: req.tenantId, 'variants.sku': sku });
            if (!exists) {
                return res.status(404).json({ message: 'Product variant not found' });
            }
            return res.status(400).json({ message: 'Insufficient stock for adjustment' });
        }

        await StockMovement.create({
            tenantId: req.tenantId,
            productId: product._id,
            sku: sku,
            type: quantity > 0 ? MovementType.IN : MovementType.OUT,
            quantity: Math.abs(quantity),
            reason: reason || MovementReason.STOCK_TAKEX,
            user: req.user?._id,
        });

        res.json(product);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const bulkCreateProducts = async (req: AuthRequest, res: Response) => {
    const products = req.body; // Array of product objects

    try {
        const results = [];
        for (const prodData of products) {
            const product = await Product.create({
                ...prodData,
                tenantId: req.tenantId,
            });

            // Initial stock movement logs
            const movements = prodData.variants.map((v: any) => ({
                tenantId: req.tenantId,
                productId: product._id,
                sku: v.sku,
                type: MovementType.IN,
                quantity: v.stock,
                reason: MovementReason.PURCHASE,
                user: req.user?._id,
            }));

            if (movements.length > 0) {
                await StockMovement.insertMany(movements);
            }
            results.push(product);
        }

        res.status(201).json(results);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
    const { name, description, category, brand, variants } = req.body;

    try {
        const product = await Product.findOne({ _id: req.params.id, tenantId: req.tenantId });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (variants) {
            for (const newVariant of variants) {
                const oldVariant = product.variants.find(v => v.sku === newVariant.sku);
                if (oldVariant && oldVariant.stock !== newVariant.stock) {
                    const diff = newVariant.stock - oldVariant.stock;
                    await StockMovement.create({
                        tenantId: req.tenantId,
                        productId: product._id,
                        sku: newVariant.sku,
                        type: diff > 0 ? MovementType.IN : MovementType.OUT,
                        quantity: Math.abs(diff),
                        reason: MovementReason.STOCK_TAKEX,
                        user: req.user?._id,
                    });
                } else if (!oldVariant) {
                    await StockMovement.create({
                        tenantId: req.tenantId,
                        productId: product._id,
                        sku: newVariant.sku,
                        type: MovementType.IN,
                        quantity: newVariant.stock,
                        reason: MovementReason.STOCK_TAKEX,
                        user: req.user?._id,
                    });
                }
            }
        }

        product.name = name || product.name;
        product.description = description || product.description;
        product.category = category || product.category;
        product.brand = brand || product.brand;
        product.variants = variants || product.variants;

        await product.save();

        res.json(product);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get low stock alerts (Smart logic)
// @route   GET /api/products/low-stock
export const getLowStockAlerts = async (req: AuthRequest, res: Response) => {
    try {
        const tenantId = req.tenantId;

        // 1. Get all products with variants below reorderLevel
        const lowStockProducts = await Product.find({
            tenantId,
            $expr: {
                $anyElementTrue: {
                    $map: {
                        input: "$variants",
                        as: "v",
                        in: { $lte: ["$$v.stock", "$$v.reorderLevel"] }
                    }
                }
            }
        });

        // 2. Get all pending Purchase Orders for this tenant
        const PurchaseOrder = mongoose.model('PurchaseOrder');
        const pendingPOs = await PurchaseOrder.find({
            tenantId,
            status: { $in: ['DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED'] }
        });

        // 3. Aggregate pending quantities per SKU
        const pendingStockMap: Record<string, number> = {};
        pendingPOs.forEach((po: any) => {
            po.items.forEach((item: any) => {
                const pendingQty = item.quantity - (item.receivedQuantity || 0);
                if (pendingQty > 0) {
                    pendingStockMap[item.sku] = (pendingStockMap[item.sku] || 0) + pendingQty;
                }
            });
        });

        // 4. Filter products/variants that actually need alerts
        const alerts: any[] = [];
        lowStockProducts.forEach(product => {
            product.variants.forEach(variant => {
                if (variant.stock <= variant.reorderLevel) {
                    const pendingQty = pendingStockMap[variant.sku] || 0;
                    const willHaveStock = variant.stock + pendingQty;

                    if (willHaveStock <= variant.reorderLevel) {
                        alerts.push({
                            productId: product._id,
                            productName: product.name,
                            sku: variant.sku,
                            variantName: variant.name,
                            currentStock: variant.stock,
                            reorderLevel: variant.reorderLevel,
                            pendingStock: pendingQty,
                            category: product.category
                        });
                    }
                }
            });
        });

        res.json(alerts);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get stock movements history
// @route   GET /api/products/movements
export const getStockMovements = async (req: AuthRequest, res: Response) => {
    const { productId, sku } = req.query;
    const query: any = { tenantId: req.tenantId };

    if (productId) query.productId = productId;
    if (sku) query.sku = sku;

    try {
        const movements = await StockMovement.find(query)
            .sort({ timestamp: -1 })
            .populate('productId', 'name')
            .populate('user', 'name');
        res.json(movements);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
