import bcrypt from 'bcryptjs';
import Tenant from '../models/Tenant';
import User, { UserRole } from '../models/User';
import Product from '../models/Product';
import Supplier from '../models/Supplier';
import Order, { OrderStatus } from '../models/Order';
import PurchaseOrder, { POStatus } from '../models/PurchaseOrder';
import StockMovement, { MovementType, MovementReason } from '../models/StockMovement';
import { subDays } from 'date-fns';

export const seedData = async () => {
    try {
        const hashedPassword = await bcrypt.hash('password123', 10);

        // Tenant 1: Tech Gadgets Inc.
        const tenant1 = await Tenant.create({ name: 'Tech Gadgets Inc.', email: 'owner1@techgadgets.com' });
        const user1 = await User.create({
            tenantId: tenant1._id,
            name: 'John Owner',
            email: 'owner1@techgadgets.com',
            password: hashedPassword,
            role: UserRole.OWNER,
        });

        const supplier1 = await Supplier.create({
            tenantId: tenant1._id,
            name: 'Global Electronics',
            email: 'sales@globalelex.com',
        });

        const product1 = await Product.create({
            tenantId: tenant1._id,
            name: 'Smartphone X',
            category: 'Electronics',
            brand: 'TechG',
            variants: [
                { sku: 'SPX-BLK-64', name: 'Black / 64GB', attributes: { color: 'Black', storage: '64GB' }, buyingPrice: 489, sellingPrice: 699, stock: 45, reorderLevel: 10 },
                { sku: 'SPX-WHT-128', name: 'White / 128GB', attributes: { color: 'White', storage: '128GB' }, buyingPrice: 559, sellingPrice: 799, stock: 5, reorderLevel: 10 }
            ]
        });

        const product2 = await Product.create({
            tenantId: tenant1._id,
            name: 'Wireless Earbuds',
            category: 'Audio',
            brand: 'SoundPro',
            variants: [
                { sku: 'WE-01', name: 'Default', attributes: { color: 'White' }, buyingPrice: 90, sellingPrice: 129, stock: 15, reorderLevel: 20 }
            ]
        });

        // Create some orders for Tenant 1
        for (let i = 0; i < 10; i++) {
            const date = subDays(new Date(), Math.floor(Math.random() * 7));
            await Order.create({
                tenantId: tenant1._id,
                items: [{
                    productId: product1._id,
                    sku: 'SPX-BLK-64',
                    name: 'Smartphone X (Black / 64GB)',
                    quantity: 1,
                    unitPrice: 699
                }],
                totalAmount: 699,
                status: OrderStatus.DELIVERED,
                createdAt: date
            });

            await StockMovement.create({
                tenantId: tenant1._id,
                productId: product1._id,
                sku: 'SPX-BLK-64',
                type: MovementType.OUT,
                quantity: 1,
                reason: MovementReason.SALE,
                user: user1._id,
                timestamp: date
            });
        }

        // Create a Purchase Order for Tenant 1
        await PurchaseOrder.create({
            tenantId: tenant1._id,
            supplierId: supplier1._id,
            items: [{
                sku: 'SPX-WHT-128',
                name: 'Smartphone X (White / 128GB)',
                quantity: 20,
                unitPrice: 500,
                receivedQuantity: 0
            }],
            totalAmount: 10000,
            status: POStatus.SENT
        });

        // Tenant 2: Fashion Hub
        const tenant2 = await Tenant.create({ name: 'Fashion Hub', email: 'owner2@fashionhub.com' });
        await User.create({
            tenantId: tenant2._id,
            name: 'Jane Fashion',
            email: 'owner2@fashionhub.com',
            password: hashedPassword,
            role: UserRole.OWNER,
        });

        await Product.create({
            tenantId: tenant2._id,
            name: 'Cotton T-Shirt',
            category: 'Apparel',
            brand: 'BasicStyle',
            variants: [
                { sku: 'TSH-RED-S', name: 'Red / S', attributes: { color: 'Red', size: 'S' }, buyingPrice: 12, sellingPrice: 19.99, stock: 100, reorderLevel: 20 },
                { sku: 'TSH-BLU-M', name: 'Blue / M', attributes: { color: 'Blue', size: 'M' }, buyingPrice: 12, sellingPrice: 19.99, stock: 2, reorderLevel: 20 }
            ]
        });

        console.log('Seeding completed successfully!');
    } catch (error) {
        console.error('Seeding failed:', error);
    }
};
