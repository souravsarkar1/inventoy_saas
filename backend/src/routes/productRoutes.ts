import express from 'express';
import { getProducts, createProduct, updateProduct, adjustStock, bulkCreateProducts, getLowStockAlerts, getStockMovements } from '../controllers/productController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, getProducts)
    .post(protect, createProduct);

router.route('/:id')
    .put(protect, updateProduct);

router.post('/bulk-create', protect, bulkCreateProducts);
router.post('/stock-adjustment', protect, adjustStock);
router.get('/low-stock', protect, getLowStockAlerts);
router.get('/movements', protect, getStockMovements);

export default router;
