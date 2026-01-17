import mongoose, { Schema, Document } from 'mongoose';

export interface IVendor extends Document {
    tenantId: mongoose.Types.ObjectId;
    name: string;
    contactName?: string;
    email: string;
    phone?: string;
    address?: string;
    products: mongoose.Types.ObjectId[]; // Products they supply
    pricing: Record<string, number>; // { sku: price }
    isActive: boolean;
}

const VendorSchema: Schema = new Schema(
    {
        tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
        name: { type: String, required: true },
        contactName: { type: String },
        email: { type: String, required: true },
        phone: { type: String },
        address: { type: String },
        products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
        pricing: { type: Map, of: Number, default: {} },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

VendorSchema.index({ name: 1, tenantId: 1 }, { unique: true });

export default mongoose.model<IVendor>('Vendor', VendorSchema);
