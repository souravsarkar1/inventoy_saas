import express from 'express';
import { registerTenant, loginUser, addUser, getUserProfile, updateProfile, bulkCreateUsers, getAllUsers, updateMemberRole, deleteUser } from '../controllers/authController';
import { protect, authorize } from '../middlewares/authMiddleware';
import { UserRole } from '../models/User';

const router = express.Router();

router.post('/register-tenant', registerTenant);
router.post('/login', loginUser);
router.post('/users', protect, authorize(UserRole.OWNER, UserRole.MANAGER), addUser);
router.post('/users/bulk', protect, authorize(UserRole.OWNER, UserRole.MANAGER), bulkCreateUsers);
router.get('/users', protect, authorize(UserRole.OWNER, UserRole.MANAGER), getAllUsers);
router.put('/users/:id/role', protect, authorize(UserRole.OWNER), updateMemberRole);
router.delete('/users/:id', protect, authorize(UserRole.OWNER), deleteUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, authorize(UserRole.OWNER, UserRole.MANAGER), updateProfile);

export default router;
