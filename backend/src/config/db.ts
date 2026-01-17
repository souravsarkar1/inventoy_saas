import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';

dotenv.config();

const connectDB = async () => {
    try {
        let uri = process.env.MONGO_URI;

        if (!uri || uri.includes('localhost') || uri.includes('127.0.0.1')) {
            // Check if we can connect to a local mongo, otherwise use memory server
            try {
                await mongoose.connect(uri || 'mongodb://localhost:27017/inventory-saas', {
                    serverSelectionTimeoutMS: 2000,
                });
                console.log('Connected to local MongoDB');
                return;
            } catch (e) {
                console.log('Local MongoDB not found, starting Memory Server...');
                const mongod = await MongoMemoryServer.create();
                uri = mongod.getUri();
            }
        }

        const conn = await mongoose.connect(uri!);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
