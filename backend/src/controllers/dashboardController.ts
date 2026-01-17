import { Response } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product';
import Order, { OrderStatus } from '../models/Order';
import PurchaseOrder, { POStatus } from '../models/PurchaseOrder';
import StockMovement from '../models/StockMovement';
import { AuthRequest } from '../middlewares/authMiddleware';
import { subDays, subMonths, startOfDay, endOfDay, startOfWeek, startOfMonth, format } from 'date-fns';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);

    try {
        // Parse filter parameters
        const { year, month, startDate, endDate } = req.query;

        // Calculate date range based on filters
        let dateRangeFilter: any = {};

        if (year && month) {
            // Filter by specific month
            const yearNum = parseInt(year as string);
            const monthNum = parseInt(month as string);
            const startOfMonthDate = new Date(yearNum, monthNum - 1, 1);
            const endOfMonthDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
            dateRangeFilter = { $gte: startOfMonthDate, $lte: endOfMonthDate };
        } else if (year) {
            // Filter by year
            const yearNum = parseInt(year as string);
            const startOfYearDate = new Date(yearNum, 0, 1);
            const endOfYearDate = new Date(yearNum, 11, 31, 23, 59, 59, 999);
            dateRangeFilter = { $gte: startOfYearDate, $lte: endOfYearDate };
        } else if (startDate && endDate) {
            // Custom date range
            const start = new Date(startDate as string);
            const end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999);
            dateRangeFilter = { $gte: start, $lte: end };
        } else {
            // Default: no filter (all time)
            dateRangeFilter = { $gte: new Date(0) }; // From epoch
        }

        // 1. Calculate Total Inventory Value with Buying & Selling Prices
        const inventoryStats = await Product.aggregate([
            { $match: { tenantId } },
            { $unwind: '$variants' },
            {
                $group: {
                    _id: null,
                    totalBuyingValue: { $sum: { $multiply: ['$variants.stock', '$variants.buyingPrice'] } },
                    totalSellingValue: { $sum: { $multiply: ['$variants.stock', '$variants.sellingPrice'] } },
                    totalUnits: { $sum: '$variants.stock' },
                    variants: {
                        $push: {
                            sku: '$variants.sku',
                            name: { $concat: ['$name', ' (', '$variants.name', ')'] },
                            stock: '$variants.stock',
                            reorderLevel: '$variants.reorderLevel',
                            buyingPrice: '$variants.buyingPrice',
                            sellingPrice: '$variants.sellingPrice'
                        }
                    }
                }
            }
        ]);

        const stats = inventoryStats[0] || { totalBuyingValue: 0, totalSellingValue: 0, totalUnits: 0, variants: [] };
        const potentialProfit = stats.totalSellingValue - stats.totalBuyingValue;

        // 2. Smart Low Stock Detection (considering pending POs)
        const pendingPOs = await PurchaseOrder.aggregate([
            { $match: { tenantId, status: { $in: [POStatus.SENT, POStatus.CONFIRMED, POStatus.PARTIALLY_RECEIVED] } } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.sku',
                    pending: { $sum: { $subtract: ['$items.quantity', '$items.receivedQuantity'] } }
                }
            }
        ]);

        const pendingMap: Record<string, number> = {};
        pendingPOs.forEach(p => { pendingMap[p._id] = p.pending; });

        const lowStockItems = stats.variants.filter((v: any) => {
            const pending = pendingMap[v.sku] || 0;
            return v.stock + pending < v.reorderLevel;
        }).map((v: any) => ({
            ...v,
            pending: pendingMap[v.sku] || 0
        }));

        // 3. Monthly Sales Trend
        const monthlySales = await Order.aggregate([
            {
                $match: {
                    tenantId,
                    createdAt: dateRangeFilter,
                    status: { $ne: OrderStatus.CANCELLED }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    revenue: { $sum: '$totalAmount' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // 4. Weekly Sales Trend
        const weeklySales = await Order.aggregate([
            {
                $match: {
                    tenantId,
                    createdAt: dateRangeFilter,
                    status: { $ne: OrderStatus.CANCELLED }
                }
            },
            {
                $group: {
                    _id: {
                        week: { $week: '$createdAt' },
                        year: { $year: '$createdAt' }
                    },
                    revenue: { $sum: '$totalAmount' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.week': 1 } }
        ]);

        // 5. Buying vs Selling Analysis
        // Total Purchases
        const purchaseData = await PurchaseOrder.aggregate([
            {
                $match: {
                    tenantId,
                    createdAt: dateRangeFilter,
                    status: { $ne: POStatus.CANCELLED }
                }
            },
            {
                $group: {
                    _id: null,
                    totalPurchases: { $sum: '$totalAmount' },
                    purchaseOrders: { $sum: 1 }
                }
            }
        ]);

        // Total Sales
        const salesData = await Order.aggregate([
            {
                $match: {
                    tenantId,
                    createdAt: dateRangeFilter,
                    status: { $ne: OrderStatus.CANCELLED }
                }
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$totalAmount' },
                    salesOrders: { $sum: 1 }
                }
            }
        ]);

        const purchases = purchaseData[0] || { totalPurchases: 0, purchaseOrders: 0 };
        const sales = salesData[0] || { totalSales: 0, salesOrders: 0 };
        const profitLast30Days = sales.totalSales - purchases.totalPurchases;

        // 6. Top Selling Products
        const topSellers = await Order.aggregate([
            {
                $match: {
                    tenantId,
                    createdAt: dateRangeFilter,
                    status: { $ne: OrderStatus.CANCELLED }
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.sku',
                    totalSold: { $sum: '$items.quantity' },
                    revenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 10 }
        ]);

        // 7. Daily Revenue Trend
        const dailyRevenue = await Order.aggregate([
            {
                $match: {
                    tenantId,
                    createdAt: dateRangeFilter,
                    status: { $ne: OrderStatus.CANCELLED }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: '$totalAmount' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        // 8. Active Orders Count
        const activeOrders = await Order.countDocuments({
            tenantId,
            status: { $in: [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.SHIPPED] }
        });

        // 9. Profit Margin Analysis
        const profitMarginData = await Order.aggregate([
            {
                $match: {
                    tenantId,
                    createdAt: dateRangeFilter,
                    status: OrderStatus.DELIVERED
                }
            },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    let: { sku: '$items.sku' },
                    pipeline: [
                        { $unwind: '$variants' },
                        { $match: { $expr: { $eq: ['$variants.sku', '$$sku'] } } },
                        { $project: { buyingPrice: '$variants.buyingPrice', sellingPrice: '$variants.sellingPrice' } }
                    ],
                    as: 'productInfo'
                }
            },
            { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
                    totalCost: {
                        $sum: {
                            $multiply: [
                                '$items.quantity',
                                { $ifNull: ['$productInfo.buyingPrice', 0] }
                            ]
                        }
                    }
                }
            }
        ]);

        const profitMargin = profitMarginData[0] || { totalRevenue: 0, totalCost: 0 };
        const actualProfit = profitMargin.totalRevenue - profitMargin.totalCost;
        const profitPercentage = profitMargin.totalRevenue > 0
            ? ((actualProfit / profitMargin.totalRevenue) * 100).toFixed(2)
            : 0;

        res.json({
            // Filter Info
            filterApplied: {
                type: year && month ? 'month' : year ? 'year' : startDate && endDate ? 'custom' : 'all',
                year: year ? parseInt(year as string) : undefined,
                month: month ? parseInt(month as string) : undefined,
                startDate: startDate as string,
                endDate: endDate as string
            },

            // Inventory Metrics
            inventoryValue: stats.totalSellingValue,
            inventoryBuyingValue: stats.totalBuyingValue,
            potentialProfit,
            totalUnits: stats.totalUnits,

            // Low Stock
            lowStockCount: lowStockItems.length,
            lowStockItems: lowStockItems.slice(0, 10),

            // Sales Performance
            activeOrders,
            totalRevenue30Days: sales.totalSales,
            totalPurchases30Days: purchases.totalPurchases,
            profit30Days: profitLast30Days,
            profitMargin: profitPercentage,

            // Trends
            monthlySales,
            weeklySales,
            dailyRevenue,

            // Top Products
            topSellers,

            // Buying vs Selling
            buyingVsSelling: {
                purchases: purchases.totalPurchases,
                sales: sales.totalSales,
                profit: profitLast30Days,
                purchaseOrders: purchases.purchaseOrders,
                salesOrders: sales.salesOrders
            }
        });
    } catch (error: any) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: error.message });
    }
};
