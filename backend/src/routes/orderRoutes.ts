import express from 'express';
import { getOrders, createOrder, cancelOrder, updateOrderStatus } from '../controllers/orderController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, getOrders)
    .post(protect, createOrder);

router.post('/:id/cancel', protect, cancelOrder);
router.patch('/:id/status', protect, updateOrderStatus);

export default router;
