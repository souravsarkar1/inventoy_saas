import mongoose, { Schema, Document } from 'mongoose';

export interface IVariant {
    sku: string;
    name: string; // e.g. "Red / Large"
    attributes: Record<string, string>; // { color: "Red", size: "Large" }
    buyingPrice: number;
    sellingPrice: number;
    stock: number;
    reorderLevel: number;
}

export interface IProduct extends Document {
    tenantId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    category: string;
    brand: string;
    variants: IVariant[];
    createdAt: Date;
    updatedAt: Date;
}

const VariantSchema = new Schema({
    sku: { type: String, required: true },
    name: { type: String, required: true },
    attributes: { type: Map, of: String },
    buyingPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    reorderLevel: { type: Number, required: true, default: 10 },
});

const ProductSchema: Schema = new Schema(
    {
        tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
        name: { type: String, required: true },
        description: { type: String },
        category: { type: String, required: true },
        brand: { type: String, required: true },
        variants: [VariantSchema],
    },
    { timestamps: true }
);

// SKU must be unique per tenant
ProductSchema.index({ 'variants.sku': 1, tenantId: 1 }, { unique: true });
ProductSchema.index({ name: 'text', category: 'text' });

export default mongoose.model<IProduct>('Product', ProductSchema);
