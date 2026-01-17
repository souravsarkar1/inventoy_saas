import { useEffect, useState } from 'react'
import Modal from '../../../components/ui/Modal'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../../../api/client'
import toast from 'react-hot-toast'
import { Shield, Mail, Phone, MapPin, Power, Activity } from 'lucide-react'

const SuppliersModal = ({ isOpen, onClose, supplier }: { isOpen: boolean, onClose: () => void, supplier: any }) => {
    const queryClient = useQueryClient();
    const [isActive, setIsActive] = useState(true);
    const [pricing, setPricing] = useState<Record<string, number>>({});
    const [newSku, setNewSku] = useState('');
    const [newPrice, setNewPrice] = useState('');

    useEffect(() => {
        if (supplier) {
            setIsActive(supplier.isActive !== false);
            setPricing(supplier.pricing || {});
        }
    }, [supplier]);

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            await client.put(`/suppliers/${supplier._id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            toast.success('Supplier status updated');
            onClose();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update supplier');
        }
    });

    const handleToggle = () => {
        const nextState = !isActive;
        setIsActive(nextState);
        updateMutation.mutate({ isActive: nextState });
    };

    const handleAddPrice = () => {
        if (!newSku || !newPrice) return;
        const updated = { ...pricing, [newSku]: parseFloat(newPrice) };
        setPricing(updated);
        updateMutation.mutate({ pricing: updated });
        setNewSku('');
        setNewPrice('');
    };

    const handleRemovePrice = (sku: string) => {
        const updated = { ...pricing };
        delete updated[sku];
        setPricing(updated);
        updateMutation.mutate({ pricing: updated });
    };

    if (!supplier) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Partner Management">
            <div className="space-y-8">
                <div className="flex items-center gap-6 p-6 rounded-2xl bg-white/5 border border-white/5">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all ${isActive ? 'bg-success shadow-success/20' : 'bg-danger shadow-danger/20'}`}>
                        <Shield size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white">{supplier.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-success animate-pulse' : 'bg-danger'}`}></div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-success' : 'text-danger'}`}>
                                {isActive ? 'Operational' : 'Deactivated'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
                        <Mail className="text-accent" size={18} />
                        <div>
                            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Digital Contact</p>
                            <p className="text-sm font-bold text-white">{supplier.email}</p>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
                        <Phone className="text-accent" size={18} />
                        <div>
                            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Hotline</p>
                            <p className="text-sm font-bold text-white">{supplier.phone || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
                        <MapPin className="text-accent" size={18} />
                        <div>
                            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Base of Operations</p>
                            <p className="text-sm font-bold text-white italic opacity-80">{supplier.address || 'Global distribution network'}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-accent tracking-[0.2em] ml-1">Asset Price Sheet</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {Object.entries(pricing).map(([sku, price]) => (
                            <div key={sku} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group">
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-mono font-bold text-white uppercase">{sku}</span>
                                    <span className="text-xs font-black text-accent">${price}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemovePrice(sku)}
                                    className="text-danger opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                >
                                    <Activity size={12} className="rotate-45" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            placeholder="SKU"
                            value={newSku}
                            onChange={e => setNewSku(e.target.value)}
                            className="flex-1 h-10 rounded-lg bg-white/5 border border-white/10 px-3 text-xs text-white"
                        />
                        <input
                            placeholder="Cost"
                            type="number"
                            value={newPrice}
                            onChange={e => setNewPrice(e.target.value)}
                            className="w-24 h-10 rounded-lg bg-white/5 border border-white/10 px-3 text-xs text-white"
                        />
                        <button
                            type="button"
                            onClick={handleAddPrice}
                            className="p-2 h-10 rounded-lg bg-accent text-white hover:bg-accent/80 transition-colors"
                        >
                            <Shield size={18} />
                        </button>
                    </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                    <button
                        onClick={handleToggle}
                        disabled={updateMutation.isPending}
                        className={`w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${isActive
                            ? 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20'
                            : 'bg-success/10 text-success border border-success/20 hover:bg-success/20'
                            }`}
                    >
                        {updateMutation.isPending ? (
                            <Activity className="animate-spin" size={20} />
                        ) : (
                            <>
                                <Power size={20} />
                                {isActive ? 'Terminate Connection' : 'Restore Connection'}
                            </>
                        )}
                    </button>
                    <p className="text-center text-[10px] text-text-secondary mt-4 font-bold uppercase tracking-widest opacity-40">
                        Status changes propagate through procurement modules instantly
                    </p>
                </div>
            </div>
        </Modal>
    )
}

export default SuppliersModal