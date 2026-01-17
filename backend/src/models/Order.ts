import mongoose, { Schema, Document } from 'mongoose';

export enum OrderStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    SHIPPED = 'SHIPPED',
    DELIVERED = 'DELIVERED',
    CANCELLED = 'CANCELLED',
    RETURNED = 'RETURNED',
}

export interface IOrderItem {
    productId: mongoose.Types.ObjectId;
    sku: string;
    quantity: number;
    unitPrice: number;
}

export interface IOrder extends Document {
    tenantId: mongoose.Types.ObjectId;
    customerName: string;
    shippingAddress: string;
    supplierId?: mongoose.Types.ObjectId;
    items: IOrderItem[];
    status: OrderStatus;
    totalAmount: number;
    createdAt: Date;
    updatedAt: Date;
}

const OrderItemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
});

const OrderSchema: Schema = new Schema(
    {
        tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
        customerName: { type: String, required: true },
        shippingAddress: { type: String, required: true },
        supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
        items: [OrderItemSchema],
        status: { type: String, enum: Object.values(OrderStatus), default: OrderStatus.PENDING },
        totalAmount: { type: Number, required: true },
    },
    { timestamps: true }
);

export default mongoose.model<IOrder>('Order', OrderSchema);
