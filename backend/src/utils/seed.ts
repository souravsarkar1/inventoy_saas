import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Tenant from '../models/Tenant';
import User, { UserRole } from '../models/User';
import Product from '../models/Product';
import Supplier from '../models/Supplier';

dotenv.config();

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-saas');
        console.log('Connected to MongoDB for seeding...');

        // Clear existing data
        await Tenant.deleteMany({});
        await User.deleteMany({});
        await Product.deleteMany({});
        await Supplier.deleteMany({});

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

        await Product.create({
            tenantId: tenant1._id,
            name: 'Smartphone X',
            category: 'Electronics',
            brand: 'TechG',
            variants: [
                { sku: 'SPX-BLK-64', name: 'Black / 64GB', attributes: { color: 'Black', storage: '64GB' }, buyingPrice: 489, sellingPrice: 699, stock: 50, reorderLevel: 10 },
                { sku: 'SPX-WHT-128', name: 'White / 128GB', attributes: { color: 'White', storage: '128GB' }, buyingPrice: 559, sellingPrice: 799, stock: 5, reorderLevel: 10 }
            ]
        });

        // Tenant 2: Fashion Hub
        const tenant2 = await Tenant.create({ name: 'Fashion Hub', email: 'owner2@fashionhub.com' });
        const user2 = await User.create({
            tenantId: tenant2._id,
            name: 'Jane Fashion',
            email: 'owner2@fashionhub.com',
            password: hashedPassword,
            role: UserRole.OWNER,
        });

        const supplier2 = await Supplier.create({
            tenantId: tenant2._id,
            name: 'Textile Pro',
            email: 'info@textilepro.com',
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
        process.exit();
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seed();
