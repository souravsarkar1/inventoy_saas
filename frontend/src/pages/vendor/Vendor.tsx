import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import { Truck, Mail, Phone, MapPin, Plus, ShieldCheck, Globe, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Modal from '../../components/ui/Modal';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import SuppliersModal from '../suppliers/components/SuppliersModal';

const Vendor = () => {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        contactName: ''
    });
    const { user } = useAuth();
    const { data: vendors, isLoading } = useQuery({
        queryKey: ['vendors'],
        queryFn: async () => {
            const { data } = await client.get('/vendors');
            return data;
        },
    });

    const [vendorModalOpen, setVendorModalOpen] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<any>(null);
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            await client.post('/vendors', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            setIsModalOpen(false);
            setFormData({ name: '', email: '', phone: '', address: '', contactName: '' });
            toast.success('Vendor onboarded successfully!');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to onboard vendor');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-10 pb-10"
        >
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Vendors & Partners</h1>
                    <p className="text-text-secondary font-medium flex items-center gap-2 italic">
                        <Globe size={14} className="text-accent" /> Managing relationships across {vendors?.length || 0} active global suppliers
                    </p>
                </div>
                {user?.role === 'OWNER' && <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn btn-primary h-14 px-8 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-accent/25 hover:scale-105 transition-all"
                >
                    <Plus size={20} className="mr-2" />
                    Onboard Partner
                </button>}
            </header>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Onboard New Partner"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-text-secondary">Company Name</label>
                            <input
                                type="text"
                                className="input"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Acme Corp"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-text-secondary">Contact Person</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.contactName}
                                onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-text-secondary">Email Address</label>
                            <input
                                type="email"
                                className="input"
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="contact@acme.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-text-secondary">Phone Number</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+1 234 567 890"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-text-secondary">Full Address</label>
                        <textarea
                            className="input min-h-[100px] py-4"
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Street, City, Country"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="btn btn-primary w-full h-14 rounded-2xl font-black uppercase tracking-widest"
                    >
                        {createMutation.isPending ? 'Onboarding...' : 'Confirm Authorization'}
                    </button>
                </form>
            </Modal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {isLoading ? (
                    <div className="col-span-full py-20 text-center uppercase tracking-[0.3em] font-black text-sm opacity-20 animate-pulse">
                        Connecting to partner network...
                    </div>
                ) : vendors?.map((vendor: any, idx: number) => (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ y: -5 }}
                        key={vendor._id}
                        className={`glass-card p-8 border-none bg-gradient-to-br from-secondary/50 to-white/[0.02] shadow-2xl relative overflow-hidden group transition-all ${vendor.isActive === false ? 'opacity-60 saturate-50' : ''}`}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                            <Truck size={120} className="-mr-10 -mt-10" />
                        </div>

                        <div className="flex items-center gap-5 mb-8">
                            <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-white shadow-xl shadow-accent/40 group-hover:rotate-6 transition-transform">
                                <ShieldCheck size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-black text-white truncate group-hover:text-accent transition-colors">{vendor.name}</h3>
                                    <div className={`w-2 h-2 rounded-full ${vendor.isActive !== false ? 'bg-success animate-pulse' : 'bg-danger'}`} />
                                </div>
                                <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${vendor.isActive !== false ? 'text-success/70' : 'text-danger/70'}`}>
                                    {vendor.isActive !== false ? 'Operational' : 'Deactivated'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="group/info cursor-pointer">
                                <div className="flex items-center gap-4 text-sm font-bold text-text-secondary group-hover/info:text-white transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover/info:bg-accent/20">
                                        <Mail size={16} className="text-accent" />
                                    </div>
                                    <span>{vendor.email}</span>
                                </div>
                            </div>
                            <div className="group/info cursor-pointer">
                                <div className="flex items-center gap-4 text-sm font-bold text-text-secondary group-hover/info:text-white transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover/info:bg-accent/20">
                                        <Phone size={16} className="text-accent" />
                                    </div>
                                    <span>{vendor.phone || '00-0000-0000'}</span>
                                </div>
                            </div>
                            <div className="group/info cursor-pointer">
                                <div className="flex items-center gap-4 text-sm font-bold text-text-secondary group-hover/info:text-white transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover/info:bg-accent/20">
                                        <MapPin size={16} className="text-accent" />
                                    </div>
                                    <span className="truncate">{vendor.address || 'Global Distribution Center'}</span>
                                </div>
                            </div>
                            {vendor.pricing && Object.keys(vendor.pricing).length > 0 && (
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-2">Price Sheet Snapshot</p>
                                    <div className="space-y-1">
                                        {Object.entries(vendor.pricing).slice(0, 3).map(([sku, price]: any) => (
                                            <div key={sku} className="flex justify-between text-[10px] font-bold">
                                                <span className="text-text-secondary">{sku}</span>
                                                <span className="text-white">${price}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-10 pt-8 border-t border-white/5 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1 opacity-50">Authorized Rep</p>
                                <p className="text-sm font-bold text-white">{vendor.contactName || 'Executive Lead'}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedVendor(vendor);
                                    setVendorModalOpen(true);
                                }}
                                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-accent hover:bg-accent hover:text-white transition-all shadow-lg active:scale-95"
                            >
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </motion.div>
                ))}
                {vendors?.length === 0 && !isLoading && (
                    <div className="col-span-full py-40 text-center bg-white/5 rounded-[40px] border border-dashed border-white/10 opacity-30 italic">
                        No active partners found in procurement ledger.
                    </div>
                )}
            </div>
            <SuppliersModal
                isOpen={vendorModalOpen}
                onClose={() => {
                    setVendorModalOpen(false);
                    setSelectedVendor(null);
                }}
                supplier={selectedVendor}
            />
        </motion.div>
    );
};

export default Vendor;
