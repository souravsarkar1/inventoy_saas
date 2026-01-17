import express from 'express';
import { getPurchaseOrders, createPurchaseOrder, updatePOStatus, receiveItems } from '../controllers/purchaseOrderController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, getPurchaseOrders)
    .post(protect, createPurchaseOrder);

router.put('/:id/status', protect, updatePOStatus);
router.post('/:id/receive', protect, receiveItems);

export default router;
