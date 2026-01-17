import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { ShoppingBag, Plus, Calendar, User, Hash, Box, ArrowRight, Truck, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../components/ui/Modal';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { currencies } from '../utils/appConstants';
import { useAuth } from '../contexts/AuthContext';

const Orders = () => {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isQuickAddSupplier, setIsQuickAddSupplier] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const { user } = useAuth();

    const [formData, setFormData] = useState({
        customerName: '',
        shippingAddress: '',
        supplierId: '',
        items: [] as any[]
    });

    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const { data } = await client.get('/products');
            return data;
        },
    });

    const { data: suppliers } = useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const { data } = await client.get('/suppliers');
            return data;
        },
    });

    const { data: orders, isLoading } = useQuery({
        queryKey: ['orders'],
        queryFn: async () => {
            const { data } = await client.get('/orders');
            return data;
        },
        refetchInterval: 5000,
    });

    const createOrderMutation = useMutation({
        mutationFn: async (orderData: any) => {
            await client.post('/orders', orderData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            setIsModalOpen(false);
            setFormData({ customerName: '', shippingAddress: '', supplierId: '', items: [] });
            toast.success('Transaction authorized successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Transaction aborted');
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            await client.patch(`/orders/${id}/status`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success('Inventory status updated');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Update failed');
        }
    });

    const cancelOrderMutation = useMutation({
        mutationFn: async (id: string) => {
            await client.post(`/orders/${id}/cancel`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setIsDetailsModalOpen(false);
            toast.success('Transaction nullified & inventory returned');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Cancellation failed');
        }
    });

    const quickAddSupplierMutation = useMutation({
        mutationFn: async (name: string) => {
            const { data } = await client.post('/suppliers', { name });
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            setFormData(prev => ({ ...prev, supplierId: data._id }));
            setIsQuickAddSupplier(false);
            setNewSupplierName('');
            toast.success('Production partner onboarded');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Onboarding failed');
        }
    });

    const handleAddItem = (productId: string, sku: string, sellingPrice: number) => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { productId, sku, quantity: 1, unitPrice: sellingPrice }]
        }));
    };

    const handleRemoveItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const updateItemQuantity = (index: number, quantity: number) => {
        const updated = [...formData.items];
        updated[index].quantity = quantity;
        setFormData({ ...formData, items: updated });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.items.length === 0) {
            toast.error('Manifest must contain at least one asset');
            return;
        }
        const totalAmount = formData.items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
        createOrderMutation.mutate({ ...formData, totalAmount });
    };


    const currencySymbol = currencies.find((currency) => currency.value === user?.currency)?.symbol || '$';


    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-10 pb-10"
        >
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Sales Ledger</h1>
                    <p className="text-text-secondary font-medium italic">Operational transaction history for the current period</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn btn-primary h-14 px-8 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-accent/40 hover:scale-105 active:scale-95 transition-all text-white"
                >
                    <Plus size={20} className="mr-2" />
                    Dispatch Inventory
                </button>
            </header>

            <div className="grid grid-cols-1 gap-8">
                <AnimatePresence mode="popLayout">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-40 opacity-30">
                            <div className="animate-spin rounded-full h-10 w-10 border-2 border-accent border-t-transparent mb-4"></div>
                            <p className="font-black uppercase tracking-widest text-sm">Refreshing Ledgers</p>
                        </div>
                    ) : orders?.map((order: any, idx: number) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={order._id}
                            className="glass-card p-0 overflow-hidden group hover:border-accent/30 transition-all shadow-xl"
                        >
                            <div className="flex flex-col lg:flex-row">
                                {/* ID Panel */}
                                <div className="lg:w-64 bg-white/5 p-8 flex flex-col justify-between border-r border-white/5">
                                    <div>
                                        <div className="flex items-center gap-2 text-accent mb-2">
                                            <Hash size={16} />
                                            <span className="text-xs font-black uppercase tracking-widest">Transaction ID</span>
                                        </div>
                                        <h3 className="font-mono text-xl font-bold text-white break-all leading-tight">
                                            {order._id.slice(-8).toUpperCase()}
                                        </h3>
                                    </div>
                                    <div className="mt-8 flex flex-col gap-3">
                                        <span className={`w-fit px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg border ${order.status === 'DELIVERED' ? 'bg-success/20 text-success border-success/30' :
                                            order.status === 'CANCELLED' ? 'bg-danger/20 text-danger border-danger/30' : 'bg-accent/20 text-accent border-accent/30'
                                            }`}>
                                            {order.status}
                                        </span>
                                        {order.supplierId && (
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary">
                                                <Truck size={12} className="text-accent" />
                                                {order.supplierId.name}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Content Panel */}
                                <div className="flex-1 p-8">
                                    <div className="flex flex-wrap items-center gap-6 mb-8 text-xs font-bold text-text-secondary uppercase tracking-widest">
                                        <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-xl border border-white/5">
                                            <Calendar size={14} className="text-accent" />
                                            {format(new Date(order.createdAt), 'MMM dd, yyyy • HH:mm:ss')}
                                        </div>
                                        <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-xl border border-white/5">
                                            <User size={14} className="text-accent" />
                                            {order.customerName}
                                        </div>
                                        <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-xl border border-white/5 uppercase">
                                            <Box size={14} className="text-accent" />
                                            {order.shippingAddress}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {order.items.map((item: any) => (
                                            <div key={item.sku} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-transparent hover:border-white/10 hover:bg-white/[0.07] transition-all group/item">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover/item:scale-110 transition-transform">
                                                        <Box size={20} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-white">{item.sku}</span>
                                                        <span className="text-[10px] text-text-secondary uppercase tracking-tighter">Quantity Restricted: {item.quantity} units</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-sm font-black text-white">{currencySymbol} {item.unitPrice}</span>
                                                    <p className="text-[10px] text-text-secondary uppercase tracking-tighter opacity-50">Unit Yield</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Total Panel */}
                                <div className="lg:w-48 p-8 flex flex-col justify-center items-end bg-gradient-to-l from-accent/[0.03] to-transparent">
                                    <p className="text-[10px] text-text-secondary uppercase font-black tracking-[0.3em] mb-1">Total Yield</p>
                                    <p className="text-2xl font-black text-white">{currencySymbol} {order.totalAmount.toLocaleString()}</p>
                                    <button
                                        onClick={() => {
                                            setSelectedOrder(order);
                                            setIsDetailsModalOpen(true);
                                        }}
                                        className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent hover:gap-4 transition-all"
                                    >
                                        Details <ArrowRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {orders?.length === 0 && !isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="glass-card py-32 text-center flex flex-col items-center justify-center gap-6"
                    >
                        <div className="w-24 h-24 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center opacity-30">
                            <ShoppingBag size={48} className="text-text-secondary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-widest">No Active Commerce</h2>
                            <p className="text-text-secondary mt-2 font-medium opacity-50 italic">The transaction ledger is currently empty for this sector.</p>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Create Order Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Authorize Inventory Dispatch"
            >
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest ml-1">Customer Name</label>
                            <input
                                required
                                value={formData.customerName}
                                onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                                className="input h-14 rounded-2xl bg-white/5 border-white/10 text-white"
                                placeholder="Legal Entity or Individual"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest ml-1">Shipping Destination</label>
                            <input
                                required
                                value={formData.shippingAddress}
                                onChange={e => setFormData({ ...formData, shippingAddress: e.target.value })}
                                className="input h-14 rounded-2xl bg-white/5 border-white/10 text-white"
                                placeholder="Full Delivery Address"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest ml-1">Source Supplier (Optional)</label>
                            <button
                                type="button"
                                onClick={() => setIsQuickAddSupplier(!isQuickAddSupplier)}
                                className="text-[9px] font-black uppercase text-accent hover:underline flex items-center gap-1"
                            >
                                <Plus size={10} /> {isQuickAddSupplier ? 'Cancel' : 'Onboard Partner'}
                            </button>
                        </div>

                        {isQuickAddSupplier ? (
                            <div className="flex gap-2">
                                <input
                                    value={newSupplierName}
                                    onChange={e => setNewSupplierName(e.target.value)}
                                    className="input h-12 rounded-xl bg-white/5 border-white/10 flex-1 px-4 text-sm text-white"
                                    placeholder="Enter Supplier Name"
                                />
                                <button
                                    type="button"
                                    onClick={() => quickAddSupplierMutation.mutate(newSupplierName)}
                                    disabled={!newSupplierName || quickAddSupplierMutation.isPending}
                                    className="btn btn-primary px-4 rounded-xl h-12 text-[10px] font-black uppercase text-white shadow-lg shadow-accent/20"
                                >
                                    {quickAddSupplierMutation.isPending ? '...' : 'Add'}
                                </button>
                            </div>
                        ) : (
                            <select
                                value={formData.supplierId}
                                onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                                className="input h-14 rounded-2xl bg-white/5 border-white/10 w-full appearance-none cursor-pointer hover:bg-white/10 transition-all font-bold text-white px-6"
                            >
                                <option value="" className="bg-bg-primary">Internal Inventory Source</option>
                                {suppliers?.map((s: any) => (
                                    <option key={s._id} value={s._id} className="bg-bg-primary">{s.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest ml-1">Inventory Selection</label>
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {products?.map((p: any) =>
                                p.variants.map((v: any) => (
                                    <button
                                        key={v.sku}
                                        type="button"
                                        onClick={() => handleAddItem(p._id, v.sku, v.sellingPrice)}
                                        className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-left group"
                                    >
                                        <div>
                                            <p className="font-bold text-white text-sm">{p.name} - {v.name}</p>
                                            <p className="text-[10px] text-text-secondary font-mono tracking-tighter uppercase">{v.sku} • Stock: {v.stock}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-black text-accent">${v.sellingPrice}</span>
                                            <Plus size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest ml-1">Manifest Items</label>
                        <div className="space-y-3">
                            {formData.items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-accent/5 border border-accent/10">
                                    <div className="flex-1">
                                        <p className="font-bold text-white text-sm">{item.sku}</p>
                                        <p className="text-[10px] text-accent font-black tracking-widest uppercase">${item.unitPrice} / unit</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={e => updateItemQuantity(idx, parseInt(e.target.value))}
                                            className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-center font-bold text-white"
                                            min="1"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(idx)}
                                            className="text-danger hover:scale-110 transition-transform"
                                        >
                                            <Plus size={20} className="rotate-45" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={createOrderMutation.isPending}
                        className="btn btn-primary w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-accent/20 text-white"
                    >
                        {createOrderMutation.isPending ? 'Authorizing...' : 'Authorize Dispatch'}
                    </button>
                </form>
            </Modal>

            {/* Details Modal */}
            <Modal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                title="Transaction Intelligence"
            >
                {selectedOrder && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <p className="text-[10px] font-black uppercase text-text-secondary tracking-widest mb-2">Legal Customer</p>
                                <p className="text-lg font-bold text-white">{selectedOrder.customerName}</p>
                                <p className="text-xs text-text-secondary mt-1">{selectedOrder.shippingAddress}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase text-text-secondary tracking-widest mb-2">Valuation</p>
                                <p className="text-3xl font-black text-accent">${selectedOrder.totalAmount.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                            <p className="text-[10px] font-black uppercase text-text-secondary tracking-widest">Manifest Status</p>
                            <div className="flex flex-wrap gap-2">
                                {['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => updateStatusMutation.mutate({ id: selectedOrder._id, status })}
                                        disabled={selectedOrder.status === 'CANCELLED' || selectedOrder.status === 'DELIVERED'}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${selectedOrder.status === status
                                            ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20'
                                            : 'bg-white/5 text-text-secondary border-white/5 hover:bg-white/10'
                                            }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase text-text-secondary tracking-widest">Asset Detail</p>
                            {selectedOrder.items.map((item: any) => (
                                <div key={item.sku} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-4">
                                        <Box size={18} className="text-accent/50" />
                                        <div>
                                            <p className="text-sm font-bold text-white">{item.sku}</p>
                                            <p className="text-[10px] text-text-secondary uppercase">Unit Price: ${item.unitPrice}</p>
                                        </div>
                                    </div>
                                    <p className="font-black text-white">{item.quantity} Units</p>
                                </div>
                            ))}
                        </div>

                        {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'DELIVERED' && (
                            <button
                                onClick={() => {
                                    if (confirm('Confirm permanent nullification of this transaction? Inventory will be returned to stock.')) {
                                        cancelOrderMutation.mutate(selectedOrder._id);
                                    }
                                }}
                                className="w-full h-14 rounded-2xl border border-danger/20 text-danger font-black uppercase tracking-widest text-[10px] hover:bg-danger/10 transition-all flex items-center justify-center gap-2"
                            >
                                <XCircle size={16} />
                                Nullify Transaction
                            </button>
                        )}

                        {selectedOrder.status === 'CANCELLED' && (
                            <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 flex items-center gap-3 text-danger">
                                <AlertTriangle size={16} />
                                <p className="text-[10px] font-black uppercase tracking-widest">This manifest has been nullified.</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </motion.div>
    );
};

const AlertTriangle = ({ size = 16, className = "" }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

export default Orders;
