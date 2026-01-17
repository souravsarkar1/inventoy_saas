import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  email: string;
  plan: 'Basic' | 'Pro' | 'Enterprise';
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    plan: { type: String, enum: ['Basic', 'Pro', 'Enterprise'], default: 'Basic' },
    currency: { type: String, enum: ['USD', 'EUR', 'INR', 'GBP', 'AUD', 'CAD', 'NZD', 'CHF', 'JPY', 'CNY'], default: 'USD' },
  },
  { timestamps: true }
);

export default mongoose.model<ITenant>('Tenant', TenantSchema);
