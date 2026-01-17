import mongoose, { Schema, Document } from 'mongoose';

export enum POStatus {
    DRAFT = 'DRAFT',
    SENT = 'SENT',
    CONFIRMED = 'CONFIRMED',
    RECEIVED = 'RECEIVED',
    PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
    CANCELLED = 'CANCELLED',
}

export interface IPOItem {
    productId: mongoose.Types.ObjectId;
    sku: string;
    quantity: number;
    receivedQuantity: number;
    unitCost: number;
}

export interface IPurchaseOrder extends Document {
    tenantId: mongoose.Types.ObjectId;
    vendorId: mongoose.Types.ObjectId;
    items: IPOItem[];
    status: POStatus;
    totalAmount: number;
    expectedDate?: Date;
    receivedDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const POItemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
});

const PurchaseOrderSchema: Schema = new Schema(
    {
        tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
        vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
        items: [POItemSchema],
        status: { type: String, enum: Object.values(POStatus), default: POStatus.DRAFT },
        totalAmount: { type: Number, required: true },
        expectedDate: { type: Date },
        receivedDate: { type: Date },
    },
    { timestamps: true }
);

export default mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);
