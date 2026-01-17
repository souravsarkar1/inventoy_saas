import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { CheckCircle, Clock, AlertCircle, Plus, Hash, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../components/ui/Modal';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { currencies, permissions } from '../utils/appConstants';
import { useAuth } from '../contexts/AuthContext';

const PurchaseOrders = () => {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isQuickAddVendor, setIsQuickAddVendor] = useState(false);
    const [newVendorName, setNewVendorName] = useState('');
    const { user } = useAuth();
    const currencySymbol = currencies.find((currency) => currency.value === user?.currency)?.symbol || '$';

    console.log(user);
    const [formData, setFormData] = useState({
        vendorId: '',
        items: [] as any[]
    });

    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const { data } = await client.get('/products');
            return data;
        },
    });

    const { data: vendors } = useQuery({
        queryKey: ['vendors'],
        queryFn: async () => {
            const { data } = await client.get('/vendors');
            return data;
        },
    });

    const { data: pos, isLoading } = useQuery({
        queryKey: ['purchase-orders'],
        queryFn: async () => {
            const { data } = await client.get('/purchase-orders');
            return data;
        },
        refetchInterval: 5000,
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            await client.put(`/purchase-orders/${id}/status`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            toast.success('Manifest status updated');
        },
    });

    const createPOMutation = useMutation({
        mutationFn: async (poData: any) => {
            await client.post('/purchase-orders', poData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            setIsModalOpen(false);
            setFormData({ vendorId: '', items: [] });
            toast.success('Procurement manifest issued');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Issuance failed');
        }
    });

    const quickAddVendorMutation = useMutation({
        mutationFn: async (name: string) => {
            const { data } = await client.post('/vendors', { name });
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            setFormData(prev => ({ ...prev, vendorId: data._id }));
            setIsQuickAddVendor(false);
            setNewVendorName('');
            toast.success('Production partner onboarded');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Onboarding failed');
        }
    });

    const handleAddItem = (productId: string, sku: string, buyingPrice: number) => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { productId, sku, quantity: 1, unitCost: buyingPrice }]
        }));
    };

    const handleRemoveItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const updateItem = (index: number, field: string, value: any) => {
        const updated = [...formData.items];
        updated[index] = { ...updated[index], [field]: value };
        setFormData({ ...formData, items: updated });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.vendorId) return toast.error('Select production partner');
        if (formData.items.length === 0) return toast.error('Manifest must contain assets');

        const totalAmount = formData.items.reduce((acc, item) => acc + (item.unitCost * item.quantity), 0);
        createPOMutation.mutate({ ...formData, totalAmount });
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'RECEIVED': return { icon: CheckCircle, class: 'bg-success/20 text-success border-success/30', label: 'Completed' };
            case 'PARTIALLY_RECEIVED': return { icon: Clock, class: 'bg-warning/20 text-warning border-warning/30', label: 'Partial Load' };
            case 'SENT': return { icon: Clock, class: 'bg-warning/20 text-warning border-warning/30', label: 'Transit' };
            case 'CONFIRMED': return { icon: CheckCircle, class: 'bg-accent/20 text-accent border-accent/30', label: 'Confirmed' };
            case 'DRAFT': return { icon: FileText, class: 'bg-text-secondary/10 text-text-secondary border-white/5', label: 'Drafting' };
            case 'CANCELLED': return { icon: Plus, class: 'bg-danger/20 text-danger border-danger/30', label: 'Nullified' };
            default: return { icon: AlertCircle, class: 'bg-accent/10 text-accent border-accent/20', label: status };
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Restock Manifests</h1>
                    <p className="text-text-secondary font-medium italic">Inbound logistics and supply chain authorization</p>
                </div>
                {(user?.role === permissions.OWNER ||
                    user?.role === permissions.MANAGER) && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="btn btn-primary h-14 px-8 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-accent/25 hover:scale-105 transition-all text-white"
                        >
                            <Plus size={20} className="mr-2" />
                            Issue Manifest
                        </button>
                    )}

            </header>

            <div className="grid grid-cols-1 gap-8">
                <AnimatePresence>
                    {isLoading ? (
                        <div className="py-20 text-center opacity-30 italic uppercase tracking-widest text-sm">Querying logistics server...</div>
                    ) : pos?.map((po: any, idx: number) => {
                        const config = getStatusConfig(po.status);
                        return (
                            <motion.div
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={po._id}
                                className="glass-card p-0 overflow-hidden border-none shadow-2xl bg-gradient-to-br from-secondary/50 to-bg-primary"
                            >
                                <div className="p-8 pb-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center transition-all ${config.class}`}>
                                            <config.icon size={po.status === 'CANCELLED' ? 24 : 32} className={po.status === 'CANCELLED' ? 'rotate-45' : ''} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent mb-1">
                                                <Hash size={12} />
                                                ID: {po._id.slice(-8).toUpperCase()}
                                            </div>
                                            <h3 className="text-2xl font-black text-white">{po.supplierId?.name || 'External Manufacturer'}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${config.class}`}>
                                                    {config.label}
                                                </span>
                                                <span className="text-[10px] text-text-secondary font-bold">• Issued: {format(new Date(po.createdAt), 'MMM dd, yyyy')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <p className="text-[10px] text-text-secondary uppercase font-black tracking-widest mb-1">Contract Valuation</p>
                                            <p className="text-3xl font-black text-white">{currencySymbol} {po.totalAmount.toLocaleString()}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {po.status === 'DRAFT' && (
                                                <button
                                                    onClick={() => updateStatusMutation.mutate({ id: po._id, status: 'SENT' })}
                                                    className="btn btn-primary h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-lg shadow-accent/20"
                                                >
                                                    Dispatch Manifest
                                                </button>
                                            )}
                                            {po.status === 'SENT' && (
                                                <button
                                                    onClick={() => updateStatusMutation.mutate({ id: po._id, status: 'CONFIRMED' })}
                                                    className="btn btn-primary h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-lg shadow-accent/20"
                                                >
                                                    Confirm Order
                                                </button>
                                            )}
                                            {(po.status === 'CONFIRMED' || po.status === 'PARTIALLY_RECEIVED') && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            const sku = po.items[0].sku;
                                                            const remaining = po.items[0].quantity - po.items[0].receivedQuantity;
                                                            const qty = prompt(`Enter quantity to receive for ${sku} (Remaining: ${remaining}):`, remaining.toString());
                                                            if (!qty) return;

                                                            const cost = prompt(`Enter ACTUAL unit cost for ${sku} (Contract: ${po.items[0].unitCost}):`, po.items[0].unitCost.toString());

                                                            client.post(`/purchase-orders/${po._id}/receive`, {
                                                                items: [{
                                                                    sku,
                                                                    quantity: parseInt(qty),
                                                                    actualUnitCost: cost ? parseFloat(cost) : undefined
                                                                }]
                                                            }).then(() => {
                                                                queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
                                                                toast.success('Inventory manifest updated');
                                                            });
                                                        }}
                                                        className="btn btn-secondary h-14 px-6 rounded-2xl font-black text-xs uppercase tracking-widest border border-white/10 hover:bg-white/10"
                                                    >
                                                        Partial Load
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const itemsToReceive = po.items.map((i: any) => ({
                                                                sku: i.sku,
                                                                quantity: i.quantity - i.receivedQuantity
                                                            })).filter((i: any) => i.quantity > 0);

                                                            client.post(`/purchase-orders/${po._id}/receive`, { items: itemsToReceive })
                                                                .then(() => {
                                                                    queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
                                                                    toast.success('Total inventory absorption successful');
                                                                });
                                                        }}
                                                        className="btn btn-primary h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-accent/20 text-white"
                                                        disabled={updateStatusMutation.isPending}
                                                    >
                                                        Finalize Manifest
                                                    </button>
                                                </>
                                            )}
                                            {['DRAFT', 'SENT', 'CONFIRMED'].includes(po.status) && (
                                                <button
                                                    onClick={() => updateStatusMutation.mutate({ id: po._id, status: 'CANCELLED' })}
                                                    className="w-14 h-14 rounded-2xl border border-danger/20 flex items-center justify-center text-danger hover:bg-danger/10 transition-all"
                                                >
                                                    <Plus size={20} className="rotate-45" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 py-4 bg-white/[0.02]">
                                    <div className="table-container border-none p-0 bg-transparent">
                                        <table className="min-w-full">
                                            <thead>
                                                <tr className="text-left border-b border-white/5 opacity-50">
                                                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-text-secondary">Identifier</th>
                                                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-text-secondary text-center">Commitment Volume</th>
                                                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-text-secondary text-center">Received</th>
                                                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-text-secondary text-center">Per Unit Base</th>
                                                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-text-secondary text-right">Extended Value</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {po.items.map((item: any) => (
                                                    <tr key={item.sku} className="group/item">
                                                        <td className="py-4">
                                                            <span className="font-mono text-xs font-black text-white group-hover/item:text-accent transition-colors">{item.sku}</span>
                                                        </td>
                                                        <td className="py-4 text-center font-black text-white">{item.quantity}</td>
                                                        <td className="py-4 text-center font-bold text-success">{item.receivedQuantity}</td>
                                                        <td className="py-4 text-center font-bold text-text-secondary">{currencySymbol} {item.unitCost}</td>
                                                        <td className="py-4 text-right font-black text-white">{currencySymbol} {(item.quantity * item.unitCost).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {po.receivedDate && (
                                    <div className="p-8 py-3 bg-success/5 border-t border-success/10 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-success">
                                            <CheckCircle size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Validated & Absorbed into stock</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-success/70">Signature: AUTH_{po._id.slice(0, 4)}</span>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Issue Procurement Manifest"
            >
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest ml-1">Supplier Selection</label>
                            <button
                                type="button"
                                onClick={() => setIsQuickAddVendor(!isQuickAddVendor)}
                                className="text-[9px] font-black uppercase text-accent hover:underline flex items-center gap-1"
                            >
                                <Plus size={10} /> {isQuickAddVendor ? 'Cancel' : 'Onboard Partner'}
                            </button>
                        </div>

                        {isQuickAddVendor ? (
                            <div className="flex gap-2">
                                <input
                                    value={newVendorName}
                                    onChange={e => setNewVendorName(e.target.value)}
                                    className="input h-12 rounded-xl bg-white/5 border-white/10 flex-1 px-4 text-sm"
                                    placeholder="Enter Supplier Name"
                                />
                                <button
                                    type="button"
                                    onClick={() => quickAddVendorMutation.mutate(newVendorName)}
                                    disabled={!newVendorName || quickAddVendorMutation.isPending}
                                    className="btn btn-primary px-4 rounded-xl h-12 text-[10px] font-black uppercase text-white shadow-lg shadow-accent/20"
                                >
                                    {quickAddVendorMutation.isPending ? '...' : 'Add'}
                                </button>
                            </div>
                        ) : (
                            <select
                                required
                                value={formData.vendorId}
                                onChange={e => setFormData({ ...formData, vendorId: e.target.value })}
                                className="input h-14 rounded-2xl bg-white/5 border-white/10 w-full appearance-none cursor-pointer hover:bg-white/10 transition-all font-bold text-white px-6"
                            >
                                <option value="" className="bg-bg-primary">External Manufacturer Selection</option>
                                {vendors?.map((s: any) => (
                                    <option key={s._id} value={s._id} className="bg-bg-primary">{s.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest ml-1">Asset Catalog</label>
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {products?.map((p: any) =>
                                p.variants.map((v: any) => (
                                    <button
                                        key={v.sku}
                                        type="button"
                                        onClick={() => handleAddItem(p._id, v.sku, v.buyingPrice)}
                                        className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-left group"
                                    >
                                        <div>
                                            <p className="font-bold text-white text-sm">{p.name} - {v.name}</p>
                                            <p className="text-[10px] text-text-secondary font-mono tracking-tighter uppercase">{v.sku} • Stock: {v.stock}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-black text-accent">${v.buyingPrice}</span>
                                            <Plus size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest ml-1">Proposed Items</label>
                        <div className="space-y-3">
                            {formData.items.map((item, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-accent/5 border border-accent/10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-white text-sm">{item.sku}</p>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(idx)}
                                            className="text-danger"
                                        >
                                            <Plus size={20} className="rotate-45" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase text-accent tracking-widest">Quantity</label>
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value))}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-bold text-white"
                                                min="1"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase text-accent tracking-widest">Negotiated Cost</label>
                                            <input
                                                type="number"
                                                value={item.unitCost}
                                                onChange={e => updateItem(idx, 'unitCost', parseFloat(e.target.value))}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-bold text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={createPOMutation.isPending}
                        className="btn btn-primary w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-accent/20 text-white"
                    >
                        {createPOMutation.isPending ? 'Issuing...' : 'Authorize Manifest'}
                    </button>
                </form>
            </Modal>
        </motion.div>
    );
};

export default PurchaseOrders;
