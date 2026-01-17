import { Response } from 'express';
import Vendor from '../models/vendors';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getVendors = async (req: AuthRequest, res: Response) => {
    try {
        const vendors = await Vendor.find({ tenantId: req.tenantId });
        res.json(vendors);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createVendor = async (req: AuthRequest, res: Response) => {
    try {
        const vendor = await Vendor.create({
            ...req.body,
            tenantId: req.tenantId,
        });
        res.status(201).json(vendor);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateVendor = async (req: AuthRequest, res: Response) => {
    try {
        const vendor = await Vendor.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId },
            req.body,
            { new: true }
        );
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }
        res.json(vendor);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
