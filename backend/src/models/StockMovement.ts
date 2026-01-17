import mongoose, { Schema, Document } from 'mongoose';

export enum MovementType {
    IN = 'IN', // Purchase, Return from customer
    OUT = 'OUT', // Sale, Return to supplier
    ADJUSTMENT = 'ADJUSTMENT', // Stock take adjustment
}

export enum MovementReason {
    PURCHASE = 'PURCHASE',
    SALE = 'SALE',
    RETURN_FROM_CUSTOMER = 'RETURN_FROM_CUSTOMER',
    RETURN_TO_SUPPLIER = 'RETURN_TO_SUPPLIER',
    STOCK_TAKEX = 'STOCK_TAKE',
    DAMAGED = 'DAMAGED',
}

export interface IStockMovement extends Document {
    tenantId: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;
    sku: string;
    type: MovementType;
    quantity: number; // Always positive
    reason: MovementReason;
    referenceId?: mongoose.Types.ObjectId; // PurchaseOrderId or SalesOrderId
    user: mongoose.Types.ObjectId;
    timestamp: Date;
}

const StockMovementSchema: Schema = new Schema(
    {
        tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
        sku: { type: String, required: true },
        type: { type: String, enum: Object.values(MovementType), required: true },
        quantity: { type: Number, required: true, min: 1 },
        reason: { type: String, enum: Object.values(MovementReason), required: true },
        referenceId: { type: Schema.Types.ObjectId },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: { createdAt: 'timestamp', updatedAt: false } }
);

export default mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
