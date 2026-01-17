import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Tenant from '../models/Tenant';
import User, { UserRole } from '../models/User';
import generateToken from '../utils/generateToken';
import { AuthRequest } from '../middlewares/authMiddleware';

// @desc    Register a new tenant and owner
// @route   POST /api/auth/register-tenant
export const registerTenant = async (req: Request, res: Response) => {
    const { tenantName, email, password, userName } = req.body;

    try {
        const tenantExists = await Tenant.findOne({ email });
        if (tenantExists) {
            return res.status(400).json({ message: 'Tenant email already registered' });
        }

        const tenant = await Tenant.create({
            name: tenantName,
            email,
        });

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            tenantId: tenant._id,
            name: userName,
            email,
            password: hashedPassword,
            role: UserRole.OWNER,
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            currency: tenant.currency,
            token: generateToken((user._id as any).toString()),
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
export const loginUser = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email }).populate('tenantId');

        if (user && (await bcrypt.compare(password, user.password!))) {
            const tenant = user.tenantId as any;
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
                currency: tenant.currency,
                token: generateToken((user._id as any).toString()),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add collaborator (Manager/Staff)
// @route   POST /api/auth/users
export const addUser = async (req: AuthRequest, res: Response) => {
    const { name, email, password, role } = req.body;

    try {
        const userExists = await User.findOne({ email, tenantId: req.tenantId });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists in this tenant' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            tenantId: req.tenantId,
            name,
            email,
            password: hashedPassword,
            role,
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


export const getUserProfile = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user?._id).populate('tenantId');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const tenant = user.tenantId as any;
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            currency: tenant.currency,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user?._id).populate('tenantId');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        await user.save();
        const tenant = user.tenantId as any;
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            currency: tenant.currency,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Bulk create users
// @route   POST /api/auth/users/bulk
export const bulkCreateUsers = async (req: AuthRequest, res: Response) => {
    const { users } = req.body;

    try {
        const hashedPassword = await bcrypt.hash('password123', 10);

        const userPromises = users.map(async (u: any) => {
            const userExists = await User.findOne({ email: u.email, tenantId: req.tenantId });
            if (userExists) return null;

            return User.create({
                tenantId: req.tenantId,
                name: u.name,
                email: u.email,
                password: hashedPassword,
                role: u.role || UserRole.STAFF,
            });
        });

        const results = await Promise.all(userPromises);
        const createdUsers = results.filter(u => u !== null);

        res.status(201).json({
            message: `Successfully created ${createdUsers.length} users.`,
            count: createdUsers.length
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all users in tenant
// @route   GET /api/auth/users
export const getAllUsers = async (req: AuthRequest, res: Response) => {
    try {
        const users = await User.find({ tenantId: req.tenantId }).select('-password');
        res.json(users);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user role (Owner only)
// @route   PUT /api/auth/users/:id/role
export const updateMemberRole = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === UserRole.OWNER) {
            return res.status(400).json({ message: 'Cannot change Owner role' });
        }

        user.role = req.body.role;
        await user.save();
        res.json(user);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
export const deleteUser = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === UserRole.OWNER) {
            return res.status(400).json({ message: 'Cannot delete Owner' });
        }

        await User.deleteOne({ _id: req.params.id });
        res.json({ message: 'User removed' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};