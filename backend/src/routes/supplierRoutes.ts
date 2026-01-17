import express from 'express';
import { getSuppliers, createSupplier, updateSupplier } from '../controllers/supplierController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, getSuppliers)
    .post(protect, createSupplier);

router.route('/:id')
    .put(protect, updateSupplier);

export default router;
