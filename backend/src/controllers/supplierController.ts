import { Response } from 'express';
import Supplier from '../models/Supplier';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getSuppliers = async (req: AuthRequest, res: Response) => {
    try {
        const suppliers = await Supplier.find({ tenantId: req.tenantId });
        res.json(suppliers);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createSupplier = async (req: AuthRequest, res: Response) => {
    try {
        const supplier = await Supplier.create({
            ...req.body,
            tenantId: req.tenantId,
        });
        res.status(201).json(supplier);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateSupplier = async (req: AuthRequest, res: Response) => {
    try {
        const supplier = await Supplier.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId },
            req.body,
            { new: true }
        );
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }
        res.json(supplier);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
