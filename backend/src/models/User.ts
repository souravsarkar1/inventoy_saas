import mongoose, { Schema, Document } from 'mongoose';

export enum UserRole {
    OWNER = 'OWNER',
    MANAGER = 'MANAGER',
    STAFF = 'STAFF',
}

export interface IUser extends Document {
    tenantId: mongoose.Types.ObjectId;
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema(
    {
        tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
        name: { type: String, required: true },
        email: { type: String, required: true },
        password: { type: String, required: true },
        role: {
            type: String,
            enum: Object.values(UserRole),
            default: UserRole.STAFF,
        },
    },
    { timestamps: true }
);

// Ensure email is unique within a tenant
UserSchema.index({ email: 1, tenantId: 1 }, { unique: true });

export default mongoose.model<IUser>('User', UserSchema);
