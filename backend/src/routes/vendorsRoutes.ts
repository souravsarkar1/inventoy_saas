import express from 'express';
import { getVendors, createVendor, updateVendor } from '../controllers/vendorContoller';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, getVendors)
    .post(protect, createVendor);

router.route('/:id')
    .put(protect, updateVendor);

export default router;
