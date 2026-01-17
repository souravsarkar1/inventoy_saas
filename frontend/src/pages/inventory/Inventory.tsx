import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import {
    Plus,
    Filter,
    Box,
    Layers,
    Activity,
    Upload,
    Download,
    AlertTriangle,
    History,
    RefreshCw,
    X,
    Edit2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import CoachMarks from '../../components/CoachMarks';
import type { Step } from '../../components/CoachMarks';
import { Sparkles } from 'lucide-react';
import { currencies, permissions } from '../../utils/appConstants';
import { useAuth } from '../../contexts/AuthContext';

const Inventory = () => {
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [brandFilter, setBrandFilter] = useState('');
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTourOpen, setIsTourOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);

    const tourSteps: Step[] = [
        {
            targetId: 'tour-header',
            title: 'Inventory Dashboard',
            description: 'Welcome to your Global Catalog! Here you can monitor all your assets and current stock levels across the organization.'
        },
        {
            targetId: 'tour-bulk',
            title: 'Bulk Management',
            description: 'Scale your operations by importing thousands of products at once using our Excel integration.'
        },
        {
            targetId: 'tour-create',
            title: 'Manual Entry',
            description: 'Need to add a single item quickly? Use the Create Entry button to initialize new assets in the catalog.'
        },
        {
            targetId: 'tour-search',
            title: 'Intelligent Search',
            description: 'Find any product instantly using name, SKU, or category filters. Our search is optimized for speed.'
        },
        {
            targetId: 'tour-filters',
            title: 'Precision Filtering',
            description: 'Slice and dice your inventory data by brand or category to get the exact view you need.'
        }
    ];

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        brand: '',
        description: '',
        variants: [
            {
                sku: '',
                name: 'Default',
                buyingPrice: 0,
                sellingPrice: 0,
                stock: 0,
                reorderLevel: 10
            }
        ]
    });

    const addVariantField = () => {
        setFormData({
            ...formData,
            variants: [...formData.variants, { sku: '', name: '', buyingPrice: 0, sellingPrice: 0, stock: 0, reorderLevel: 10 }]
        });
    };

    const removeVariantField = (index: number) => {
        const updated = formData.variants.filter((_, i) => i !== index);
        setFormData({ ...formData, variants: updated });
    };

    const updateVariantField = (index: number, field: string, value: any) => {
        const updated = [...formData.variants];
        updated[index] = { ...updated[index], [field]: value };
        setFormData({ ...formData, variants: updated });
    };

    const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
    const [adjustmentFormData, setAdjustmentFormData] = useState({
        sku: '',
        quantity: 0
    });
    const { user } = useAuth();
    const { data: products, isLoading } = useQuery({
        queryKey: ['products', search, categoryFilter, brandFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (categoryFilter) params.append('category', categoryFilter);
            if (brandFilter) params.append('brand', brandFilter);
            const { data } = await client.get(`/products?${params.toString()}`);
            return data;
        },
    });

    // Extract unique categories and brands for filters
    const allProductsNoFilter = useQuery({
        queryKey: ['products-all'],
        queryFn: async () => {
            const { data } = await client.get('/products');
            return data;
        }
    });

    const categories = Array.from(new Set(allProductsNoFilter.data?.map((p: any) => p.category) || [])) as string[];
    const brands = Array.from(new Set(allProductsNoFilter.data?.map((p: any) => p.brand) || [])) as string[];

    const { data: lowStockAlerts } = useQuery({
        queryKey: ['low-stock'],
        queryFn: async () => {
            const { data } = await client.get('/products/low-stock');
            return data;
        }
    });

    const { data: stockMovements } = useQuery({
        queryKey: ['stock-movements'],
        queryFn: async () => {
            const { data } = await client.get('/products/movements');
            return data;
        }
    });

    const [activeTab, setActiveTab] = useState<'inventory' | 'movements' | 'alerts'>('inventory');


    const bulkCreateMutation = useMutation({
        mutationFn: async (products: any[]) => {
            await client.post('/products/bulk-create', products);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Bulk import successful!');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Bulk indexing failed');
        }
    });

    const downloadDemoExcel = () => {
        const demoData = [
            {
                Name: 'Sample Product 1',
                Brand: 'Brand A',
                Category: 'Category X',
                Description: 'This is a sample product description',
                SKU: 'SAMP-SKU-01',
                BuyingPrice: 69.99,
                SellingPrice: 99.99,
                Stock: 50,
                ReorderLevel: 10
            },
            {
                Name: 'Sample Product 2',
                Brand: 'Brand B',
                Category: 'Category Y',
                Description: 'This is another sample product description',
                SKU: 'SAMP-SKU-02',
                BuyingPrice: 104.99,
                SellingPrice: 149.99,
                Stock: 30,
                ReorderLevel: 5
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(demoData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory_Demo");
        XLSX.writeFile(workbook, "inventory_demo.xlsx");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const bstr = event.target?.result;
            const workbook = XLSX.read(bstr, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data: any[] = XLSX.utils.sheet_to_json(worksheet);

            const items = data.map(item => ({
                name: item.Name,
                brand: item.Brand,
                category: item.Category,
                description: item.Description,
                variants: [{
                    sku: item.SKU,
                    name: 'Default',
                    buyingPrice: parseFloat(item.BuyingPrice) || 0,
                    sellingPrice: parseFloat(item.SellingPrice) || 0,
                    stock: parseInt(item.Stock) || 0,
                    reorderLevel: parseInt(item.ReorderLevel) || 10
                }]
            }));

            bulkCreateMutation.mutate(items);
        };
        reader.readAsBinaryString(file);
    };

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            await client.post('/products', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setIsModalOpen(false);
            resetForm();
            toast.success('Asset added to catalog');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Indexing failed');
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            await client.put(`/products/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setIsModalOpen(false);
            resetForm();
            toast.success('Asset updated in catalog');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Update failed');
        }
    });

    const resetForm = () => {
        setFormData({
            name: '',
            category: '',
            brand: '',
            description: '',
            variants: [
                {
                    sku: '',
                    name: 'Default',
                    buyingPrice: 0,
                    sellingPrice: 0,
                    stock: 0,
                    reorderLevel: 10
                }
            ]
        });
        setIsEditMode(false);
        setEditingProductId(null);
    };

    const handleEdit = (product: any) => {
        setFormData({
            name: product.name,
            category: product.category,
            brand: product.brand,
            description: product.description || '',
            variants: product.variants.map((v: any) => ({
                sku: v.sku,
                name: v.name,
                buyingPrice: v.buyingPrice,
                sellingPrice: v.sellingPrice,
                stock: v.stock,
                reorderLevel: v.reorderLevel
            }))
        });
        setEditingProductId(product._id);
        setIsEditMode(true);
        setIsModalOpen(true);
    };
    const adjustStockMutation = useMutation({
        mutationFn: async (data: { sku: string; quantity: number }) => {
            await client.post('/products/stock-adjustment', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Inventory balance reconciled');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Adjustment failed');
        }
    });

    const handleAdjustmentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        adjustStockMutation.mutate(adjustmentFormData);
        setAdjustmentModalOpen(false);
    };



    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditMode && editingProductId) {
            updateMutation.mutate({ id: editingProductId, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const currencySymbol = currencies.find((currency) => currency.value === user?.currency)?.symbol || '$';


    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10 pb-10"
        >
            <CoachMarks
                steps={tourSteps}
                isOpen={isTourOpen}
                onClose={() => setIsTourOpen(false)}
            />

            <header id="tour-header" className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Global Catalog</h1>
                    <p className="text-text-secondary flex items-center gap-2">
                        <Layers size={14} /> Total SKUs under management: {products?.reduce((acc: number, p: any) => acc + p.variants.length, 0) || 0}
                    </p>
                </div>
                {user?.role === permissions.MANAGER || user?.role === permissions.OWNER && <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={downloadDemoExcel}
                        className="btn btn-secondary h-14 px-6 rounded-2xl font-black text-xs uppercase tracking-widest bg-white/5 border-white/10 hover:bg-white/10 flex items-center gap-2"
                    >
                        <Download size={18} />
                        Download Demo
                    </button>
                    <div id="tour-bulk" className="relative">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            id="excel-upload"
                            onChange={handleFileUpload}
                        />
                        <label
                            htmlFor="excel-upload"
                            className="btn btn-secondary h-14 px-6 rounded-2xl font-black text-xs uppercase tracking-widest bg-white/5 border-white/10 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                        >
                            <Upload size={18} />
                            Bulk Import
                        </label>
                    </div>
                    <button
                        id="tour-create"
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="btn btn-primary h-14 px-8 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-accent/25 hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Create Entry
                    </button>
                    <button
                        onClick={() => setIsTourOpen(true)}
                        className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center hover:bg-accent/20 transition-all group"
                        title="Start Discovery Tour"
                    >
                        <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                    </button>
                </div>}
            </header>

            <div className="flex gap-4 border-b border-white/5 pb-1">
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`pb-4 px-2 font-black text-xs uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === 'inventory' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-white'}`}
                >
                    Live Inventory
                </button>
                <button
                    onClick={() => setActiveTab('movements')}
                    className={`pb-4 px-2 font-black text-xs uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === 'movements' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-white'}`}
                >
                    Stock History
                </button>
                <button
                    onClick={() => setActiveTab('alerts')}
                    className={`pb-4 px-2 font-black text-xs uppercase tracking-[0.2em] transition-all border-b-2 relative ${activeTab === 'alerts' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-white'}`}
                >
                    Critical Alerts
                    {lowStockAlerts?.length > 0 && (
                        <span className="absolute -top-1 -right-2 w-5 h-5 bg-danger text-white text-[10px] flex items-center justify-center rounded-full animate-pulse border-2 border-bg-primary">
                            {lowStockAlerts.length}
                        </span>
                    )}
                </button>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); resetForm(); }}
                title={isEditMode ? "Modify Global Catalog Asset" : "Initialize New Asset"}
            >
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-text-secondary tracking-widest">Product Name</label>
                            <input
                                type="text"
                                className="input"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="iPhone 15 Pro"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-text-secondary tracking-widest">Brand</label>
                            <input
                                type="text"
                                className="input"
                                required
                                value={formData.brand}
                                onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                placeholder="Apple"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-text-secondary tracking-widest">Category</label>
                            <input
                                type="text"
                                className="input"
                                required
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                placeholder="Electronics"
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black uppercase text-text-secondary tracking-widest">Product Variants</label>
                            <button
                                type="button"
                                onClick={addVariantField}
                                className="text-accent text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1"
                            >
                                <Plus size={12} /> Add Variant
                            </button>
                        </div>
                        {formData.variants.map((variant, index) => (
                            <div key={index} className="space-y-4 p-4 rounded-2xl bg-white/5 border border-white/5 relative group">
                                {formData.variants.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeVariantField(index)}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-danger text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-text-secondary uppercase">Variant Name (e.g. Red / Large)</label>
                                        <input
                                            type="text"
                                            className="input h-10 text-sm"
                                            required
                                            value={variant.name}
                                            onChange={e => updateVariantField(index, 'name', e.target.value)}
                                            placeholder="Standard"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-text-secondary uppercase">SKU</label>
                                        <input
                                            type="text"
                                            className="input h-10 text-sm font-mono"
                                            required
                                            value={variant.sku}
                                            onChange={e => updateVariantField(index, 'sku', e.target.value)}
                                            placeholder="SKU-001"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-text-secondary uppercase text-accent">Buy Price</label>
                                        <input
                                            type="number"
                                            className="input h-10 text-sm font-black"
                                            required
                                            value={variant.buyingPrice}
                                            onChange={e => updateVariantField(index, 'buyingPrice', parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-text-secondary uppercase text-accent">Sell Price</label>
                                        <input
                                            type="number"
                                            className="input h-10 text-sm font-black"
                                            required
                                            value={variant.sellingPrice}
                                            onChange={e => updateVariantField(index, 'sellingPrice', parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-text-secondary uppercase text-accent">Stock</label>
                                        <input
                                            type="number"
                                            className="input h-10 text-sm font-black"
                                            required
                                            value={variant.stock}
                                            onChange={e => updateVariantField(index, 'stock', parseInt(e.target.value))}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-text-secondary uppercase text-accent">Safety</label>
                                        <input
                                            type="number"
                                            className="input h-10 text-sm font-black"
                                            required
                                            value={variant.reorderLevel}
                                            onChange={e => updateVariantField(index, 'reorderLevel', parseInt(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="btn btn-primary w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-accent/20"
                    >
                        {createMutation.isPending || updateMutation.isPending ? 'Syncing Catalog...' : isEditMode ? 'Authorize Modifications' : 'Authorize Entry'}
                    </button>
                </form>
            </Modal>

            {
                activeTab === 'inventory' && (
                    <>
                        <div className="flex flex-col lg:flex-row gap-4 items-end">
                            <div id="tour-search" className="relative flex-1 group">
                                <input
                                    type="text"
                                    placeholder="🔍 Query by product title, brand, category, or cross-reference SKU..."
                                    className="input pl-12 h-16 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-text-secondary/50 focus:bg-white/10 transition-all font-medium text-base shadow-inner w-full"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div id="tour-filters" className="flex flex-col md:flex-row gap-4">
                                <div className="flex flex-col gap-2 min-w-[200px]">
                                    <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest ml-1">Category</label>
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="input h-16 rounded-2xl bg-white/5 border-white/10 text-white font-bold cursor-pointer"
                                    >
                                        <option value="" className="bg-bg-primary">All Categories</option>
                                        {categories.map(c => <option key={c} value={c} className="bg-bg-primary">{c}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-2 min-w-[200px]">
                                    <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest ml-1">Brand</label>
                                    <select
                                        value={brandFilter}
                                        onChange={(e) => setBrandFilter(e.target.value)}
                                        className="input h-16 rounded-2xl bg-white/5 border-white/10 text-white font-bold cursor-pointer"
                                    >
                                        <option value="" className="bg-bg-primary">All Brands</option>
                                        {brands.map(b => <option key={b} value={b} className="bg-bg-primary">{b}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-2 h-16">
                                {(search || categoryFilter || brandFilter) && (
                                    <button
                                        onClick={() => { setSearch(''); setCategoryFilter(''); setBrandFilter(''); }}
                                        className="btn btn-secondary h-full px-6 rounded-2xl bg-danger/10 text-danger border-danger/20 hover:bg-danger/20 font-black text-xs uppercase tracking-widest"
                                    >
                                        Reset
                                    </button>
                                )}
                                <button className="btn btn-secondary h-full w-16 rounded-2xl flex items-center justify-center p-0 bg-white/5 border-white/10 hover:bg-white/10">
                                    <Filter size={24} className="text-text-secondary" />
                                </button>
                            </div>
                        </div>

                        <div className="glass-card border-none bg-secondary/20 overflow-hidden shadow-2xl">
                            <div className="table-container border-none rounded-none overflow-visible">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-white/5">
                                            <th className="px-8 py-6 font-black text-[10px] uppercase tracking-[0.2em] text-text-secondary text-left">Asset Details</th>
                                            <th className="px-8 py-6 font-black text-[10px] uppercase tracking-[0.2em] text-text-secondary text-left">Taxonomy</th>
                                            <th className="px-8 py-6 font-black text-[10px] uppercase tracking-[0.2em] text-text-secondary text-left">Reference ID</th>
                                            <th className="px-8 py-6 font-black text-[10px] uppercase tracking-[0.15em] text-text-secondary text-center">Buy/Sell Value</th>
                                            <th className="px-8 py-6 font-black text-[10px] uppercase tracking-[0.2em] text-text-secondary text-center">Current Vol.</th>
                                            <th className="px-8 py-6 font-black text-[10px] uppercase tracking-[0.2em] text-text-secondary text-right">Ops</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-32">
                                                    <div className="flex flex-col items-center">
                                                        <Activity className="animate-pulse text-accent mb-4" size={48} />
                                                        <p className="font-bold uppercase tracking-[0.2em] text-sm opacity-50 text-white">Indexing catalog...</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : products?.map((product: any, pIdx: number) => (
                                            <AnimatePresence key={product._id}>
                                                <motion.tr
                                                    className="bg-white/[0.02]"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                >
                                                    <td colSpan={6} className="px-8 py-2">
                                                        <div className="flex items-center justify-between group">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                                                                    <Box size={16} />
                                                                </div>
                                                                <span className="font-black text-white text-base tracking-tight">{product.name}</span>
                                                                <span className="text-[10px] font-black uppercase bg-white/5 px-2 py-0.5 rounded text-text-secondary border border-white/10">{product.category}</span>
                                                            </div>
                                                            {user?.role !== permissions.STAFF && (
                                                                <button
                                                                    onClick={() => handleEdit(product)}
                                                                    className="p-2 mr-2 rounded-lg bg-white/5 text-text-secondary hover:bg-accent/10 hover:text-accent transition-all opacity-0 group-hover:opacity-100"
                                                                    title="Edit Asset"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                                {product.variants.map((variant: any, vIdx: number) => (
                                                    <motion.tr
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: (pIdx * 0.05) + (vIdx * 0.02) }}
                                                        key={variant.sku}
                                                        className="group/row hover:bg-white/5 transition-all"
                                                    >
                                                        <td className="px-8 py-6">
                                                            <div className="pl-12 flex items-center gap-3">
                                                                <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
                                                                <span className="text-base font-bold text-white/90">{variant.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-text-secondary opacity-60 italic font-mono">{product.brand}</span>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 w-fit">
                                                                <span className="text-[11px] font-mono font-bold text-text-secondary tracking-tighter uppercase">
                                                                    {variant.sku}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-xl font-black text-white">{currencySymbol} {variant.sellingPrice.toLocaleString()}</span>
                                                                <span className="text-[9px] font-black uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full text-text-secondary mt-1">
                                                                    Cost: {currencySymbol} {variant.buyingPrice.toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className={`text-3xl font-black ${variant.stock <= variant.reorderLevel ? 'text-danger' : 'text-success'}`}>
                                                                    {variant.stock}
                                                                </span>
                                                                <span className="text-[9px] font-black uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full text-text-secondary mt-1">
                                                                    Safety: {variant.reorderLevel}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-right">
                                                            <button
                                                                onClick={() => {
                                                                    setAdjustmentFormData({ sku: variant.sku, quantity: variant.stock });
                                                                    setAdjustmentModalOpen(true);
                                                                }}
                                                                className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-accent hover:border-accent transition-all group/btn"
                                                            >
                                                                <RefreshCw size={14} className="group-hover/btn:rotate-180 transition-transform duration-500" />
                                                            </button>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </AnimatePresence>
                                        ))}
                                        {products?.length === 0 && !isLoading && (
                                            <tr>
                                                <td colSpan={6} className="text-center py-32 opacity-20 italic">
                                                    No matches found in standard ledger.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )
            }

            {
                activeTab === 'movements' && (
                    <div className="glass-card border-none bg-secondary/20 p-8 space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <History size={24} className="text-accent" />
                                <h2 className="text-2xl font-black text-white">Stock Movement History</h2>
                            </div>
                            <button
                                onClick={() => queryClient.invalidateQueries({ queryKey: ['stock-movements'] })}
                                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <RefreshCw size={20} className="text-text-secondary" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {stockMovements?.map((movement: any) => (
                                <div key={movement._id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-accent/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${movement.type === 'IN' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                            {movement.type === 'IN' ? '↑' : '↓'}
                                        </div>
                                        <div>
                                            <div className="font-black text-white flex items-center gap-2">
                                                {movement.productId.name}
                                                <span className="text-[10px] font-bold text-text-secondary bg-white/5 px-2 py-0.5 rounded font-mono">{movement.sku}</span>
                                            </div>
                                            <div className="text-xs text-text-secondary font-medium mt-1">
                                                Reason: <span className="text-white font-bold">{movement.reason}</span> • By {movement.user?.name || 'System'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-xl font-black ${movement.type === 'IN' ? 'text-success' : 'text-danger'}`}>
                                            {movement.type === 'IN' ? '+' : '-'}{movement.quantity}
                                        </div>
                                        <div className="text-[10px] font-black uppercase text-text-secondary tracking-widest mt-1 opacity-50">
                                            {new Date(movement.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {
                activeTab === 'alerts' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle size={24} className="text-danger" />
                            <h2 className="text-2xl font-black text-white">Critical Low Stock Alerts</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {lowStockAlerts?.length === 0 ? (
                                <div className="col-span-full py-20 bg-success/5 border border-success/10 rounded-3xl flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center text-success mb-4">
                                        <Layers size={32} />
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-2">Inventory Levels Healthy</h3>
                                    <p className="text-text-secondary font-medium">No critical alerts detected in the current cycle.</p>
                                </div>
                            ) : lowStockAlerts?.map((alert: any) => (
                                <div key={alert.sku} className="glass-card bg-danger/5 border border-danger/10 p-6 flex flex-col justify-between group hover:bg-danger/10 transition-all">
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <span className="text-[10px] font-black uppercase text-danger tracking-widest bg-danger/10 px-2 py-1 rounded">Critical</span>
                                                <h3 className="text-lg font-black text-white mt-2 mb-1">{alert.productName}</h3>
                                                <p className="text-xs font-bold text-text-secondary font-mono bg-white/5 w-fit px-2 py-0.5 rounded">{alert.sku} ({alert.variantName})</p>
                                            </div>
                                            <div className="w-10 h-10 rounded-xl bg-danger/20 flex items-center justify-center text-danger">
                                                <AlertTriangle size={20} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 rounded-xl bg-white/5">
                                                <p className="text-[10px] font-black uppercase text-text-secondary tracking-widest opacity-50 mb-1">Current</p>
                                                <p className="text-lg font-black text-white">{alert.currentStock}</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-white/5">
                                                <p className="text-[10px] font-black uppercase text-text-secondary tracking-widest opacity-50 mb-1">Safety</p>
                                                <p className="text-lg font-black text-white">{alert.reorderLevel}</p>
                                            </div>
                                        </div>

                                        {alert.pendingStock > 0 && (
                                            <div className="flex items-center gap-2 p-3 rounded-xl bg-accent/10 border border-accent/20">
                                                <RefreshCw size={14} className="text-accent animate-spin-slow" />
                                                <span className="text-[10px] font-black uppercase text-accent tracking-widest">Replenishment in Progress (+{alert.pendingStock})</span>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => {
                                            setAdjustmentFormData({ sku: alert.sku, quantity: 0 });
                                            setAdjustmentModalOpen(true);
                                        }}
                                        className="mt-6 w-full py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-black text-[10px] uppercase tracking-widest text-white flex items-center justify-center gap-2"
                                    >
                                        Reconcile Stock
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }
            <Modal
                isOpen={adjustmentModalOpen}
                onClose={() => setAdjustmentModalOpen(false)}
                title="Adjust Stock"
            >
                <form onSubmit={handleAdjustmentSubmit} className="space-y-10">
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-text-secondary tracking-[0.2em] ml-1">SKU Identification</label>
                            <input
                                type="text"
                                value={adjustmentFormData.sku}
                                disabled
                                className="input h-14 rounded-2xl bg-white/5 border-white/10 text-text-secondary font-mono font-bold cursor-not-allowed opacity-50"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-text-secondary tracking-[0.2em] ml-1">Delta Quantity</label>
                            <input
                                type="number"
                                autoFocus
                                value={adjustmentFormData.quantity}
                                onChange={(e) => setAdjustmentFormData({ ...adjustmentFormData, quantity: +e.target.value })}
                                className="input h-14 rounded-2xl bg-white/5 border-white/10 text-white font-black text-xl focus:bg-white/10 transition-all"
                                placeholder="0"
                            />
                            <p className="text-[10px] text-text-secondary font-medium ml-1">Positive for IN, Negative for OUT (e.g. -5)</p>
                        </div>
                    </div>
                    <div className="flex justify-end items-center gap-6">
                        <button
                            type="button"
                            onClick={() => setAdjustmentModalOpen(false)}
                            className="text-xs font-black uppercase tracking-widest text-text-secondary hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary h-14 px-10 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-accent/25 hover:scale-105 transition-all"
                        >
                            Confirm Adjustment
                        </button>
                    </div>
                </form>
            </Modal>
        </motion.div >
    );
};

export default Inventory;
