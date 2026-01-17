import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { User, Mail, Shield, Building, Edit2, Save, X } from 'lucide-react';

const Profile = () => {
    const { user, setUser } = useAuth();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
    });

    const isAuthorized = user?.role === 'OWNER' || user?.role === 'MANAGER';

    const updateProfileMutation = useMutation({
        mutationFn: async (data: { name: string; email: string }) => {
            const { data: updatedUser } = await client.put('/auth/profile', data);
            return updatedUser;
        },
        onSuccess: (updatedUser) => {
            queryClient.invalidateQueries({ queryKey: ['user'] });

            // Update AuthContext and LocalStorage
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const newUser = { ...currentUser, ...updatedUser };
            localStorage.setItem('user', JSON.stringify(newUser));
            setUser(newUser);

            toast.success('Profile updated successfully!');
            setIsEditing(false);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateProfileMutation.mutate(formData);
    };

    const getTenantName = () => {
        if (!user?.tenantId) return 'N/A';
        if (typeof user.tenantId === 'string') return user.tenantId;
        return (user.tenantId as any).name || 'N/A';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto space-y-10 pb-10"
        >
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">My Profile</h1>
                    <p className="text-text-secondary flex items-center gap-2">
                        Manage your personal identity and security preferences
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Overview Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card p-8 bg-secondary/20 flex flex-col items-center text-center">
                        <div className="w-24 h-24 rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center text-accent mb-6">
                            <User size={48} />
                        </div>
                        <h2 className="text-xl font-black text-white">{user?.name}</h2>
                        <span className="inline-flex px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest border border-accent/20 mt-2">
                            {user?.role}
                        </span>
                        <div className="w-full h-px bg-white/5 my-6" />
                        <div className="w-full space-y-4 text-left">
                            <div className="flex items-center gap-3 text-text-secondary">
                                <Building size={16} className="shrink-0" />
                                <div className="overflow-hidden">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Organization</p>
                                    <p className="text-sm font-bold text-white truncate">{getTenantName()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-text-secondary">
                                <Shield size={16} className="shrink-0" />
                                <div className="overflow-hidden">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Permissions</p>
                                    <p className="text-sm font-bold text-white truncate">{user?.role === 'OWNER' ? 'Full Access' : 'Limited Access'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Profile Form */}
                <div className="lg:col-span-2">
                    <div className="glass-card bg-secondary/20 overflow-hidden">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-text-secondary">
                                    <Edit2 size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-white">General Information</h3>
                            </div>
                            {isAuthorized && !isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="btn btn-secondary px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2"
                                >
                                    <Edit2 size={14} />
                                    Edit Profile
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest ml-1 flex items-center gap-2">
                                        <User size={12} className="text-accent" /> Full Name
                                    </label>
                                    <input
                                        type="text"
                                        disabled={!isEditing}
                                        className="input h-14 rounded-2xl bg-white/5 border-white/10 text-white focus:bg-white/10 transition-all font-bold placeholder:opacity-20"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest ml-1 flex items-center gap-2">
                                        <Mail size={12} className="text-accent" /> Email Address
                                    </label>
                                    <input
                                        type="email"
                                        disabled={!isEditing}
                                        className="input h-14 rounded-2xl bg-white/5 border-white/10 text-white focus:bg-white/10 transition-all font-bold placeholder:opacity-20"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            {!isAuthorized && (
                                <div className="p-4 rounded-2xl bg-danger/5 border border-danger/20 flex items-start gap-4">
                                    <Shield size={20} className="text-danger shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-danger uppercase tracking-widest mb-1">Access Restricted</p>
                                        <p className="text-sm text-text-secondary leading-relaxed">
                                            Your current role ({user?.role}) does not have permission to modify profile data.
                                            Please contact your system administrator or organization owner for changes.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {isEditing && (
                                <div className="flex items-center gap-4 pt-4">
                                    <button
                                        type="submit"
                                        disabled={updateProfileMutation.isPending}
                                        className="btn btn-primary h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2"
                                    >
                                        {updateProfileMutation.isPending ? 'Saving...' : (
                                            <>
                                                <Save size={18} />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditing(false);
                                            setFormData({ name: user?.name || '', email: user?.email || '' });
                                        }}
                                        className="btn btn-secondary h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <X size={18} />
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default Profile;