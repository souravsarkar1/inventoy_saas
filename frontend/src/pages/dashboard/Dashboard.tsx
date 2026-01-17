import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import {
    XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid,
    BarChart, Bar, LineChart, Line
} from 'recharts';
import {
    TrendingUp,
    Package,
    AlertCircle,
    DollarSign,
    Download,
    Activity,
    ShoppingCart,
    Truck,
    Clock,
    CheckCircle2,
    Calendar,
    BarChart3,
    Filter,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { currencies } from '../../utils/appConstants';
import { useState } from 'react';

type FilterType = 'all' | 'year' | 'month' | 'custom';

interface DateFilter {
    type: FilterType;
    year?: number;
    month?: number;
    startDate?: string;
    endDate?: string;
}

const Dashboard = () => {
    const [dateFilter, setDateFilter] = useState<DateFilter>({ type: 'all' });
    const [showFilters, setShowFilters] = useState(false);

    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats', dateFilter],
        queryFn: async () => {
            const params = new URLSearchParams();

            if (dateFilter.type === 'year' && dateFilter.year) {
                params.append('year', dateFilter.year.toString());
            } else if (dateFilter.type === 'month' && dateFilter.year && dateFilter.month) {
                params.append('year', dateFilter.year.toString());
                params.append('month', dateFilter.month.toString());
            } else if (dateFilter.type === 'custom' && dateFilter.startDate && dateFilter.endDate) {
                params.append('startDate', dateFilter.startDate);
                params.append('endDate', dateFilter.endDate);
            }

            const { data } = await client.get(`/dashboard/stats?${params.toString()}`);
            return data;
        },
        refetchInterval: 30000,
    });
    const { user } = useAuth();

    // Generate year options (last 5 years)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    // Month options
    const months = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' },
    ];

    const handleFilterChange = (newFilter: DateFilter) => {
        setDateFilter(newFilter);
        toast.success('📊 Filter applied');
    };

    const clearFilters = () => {
        setDateFilter({ type: 'all' });
        toast.success('🔄 Filters cleared');
    };

    const getFilterLabel = () => {
        if (dateFilter.type === 'all') return 'All Time';
        if (dateFilter.type === 'year') return `Year: ${dateFilter.year}`;
        if (dateFilter.type === 'month') {
            const monthName = months.find(m => m.value === dateFilter.month)?.label;
            return `${monthName} ${dateFilter.year}`;
        }
        if (dateFilter.type === 'custom') {
            return `${dateFilter.startDate} to ${dateFilter.endDate}`;
        }
        return 'All Time';
    };

    const handleExport = () => {
        if (!stats) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stats, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `analytics_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        toast.success('📊 Analytics exported successfully');
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
            <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-accent/20 border-t-accent"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="text-accent animate-pulse" size={24} />
                </div>
            </div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-text-secondary animate-pulse">Loading Analytics...</p>
        </div>
    );

    const currencySymbol = currencies.find((currency) => currency.value === user?.currency)?.symbol || '$';

    // Get period label for metrics
    const getPeriodLabel = () => {
        if (dateFilter.type === 'all') return '';
        if (dateFilter.type === 'year') return ` (${dateFilter.year})`;
        if (dateFilter.type === 'month') {
            const monthName = months.find(m => m.value === dateFilter.month)?.label;
            return ` (${monthName} ${dateFilter.year})`;
        }
        if (dateFilter.type === 'custom') return ' (Custom)';
        return '';
    };

    // Format monthly sales data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySalesData = stats?.monthlySales?.map((item: any) => ({
        month: monthNames[item._id.month - 1],
        revenue: item.revenue,
        orders: item.orders
    })) || [];

    // Format daily revenue data
    const dailyRevenueData = stats?.dailyRevenue?.map((item: any) => ({
        date: new Date(item._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: item.revenue,
        orders: item.orders
    })) || [];

    // Buying vs Selling data
    const buyingVsSellingData = [
        { name: 'Purchases', value: stats?.buyingVsSelling?.purchases || 0, fill: '#ef4444' },
        { name: 'Sales', value: stats?.buyingVsSelling?.sales || 0, fill: '#22c55e' },
    ];

    const profitMarginPercent = parseFloat(stats?.profitMargin || 0);

    const primaryMetrics = [
        {
            label: `Total Revenue${getPeriodLabel()}`,
            value: `${currencySymbol}${stats?.totalRevenue30Days?.toLocaleString() || '0'}`,
            icon: DollarSign,
            color: 'text-success',
            bg: 'bg-success/10',
            trend: `${stats?.buyingVsSelling?.salesOrders || 0} orders`,
            trendUp: true,
            description: dateFilter.type === 'all' ? 'All-time sales' : 'Sales in period'
        },
        {
            label: `Net Profit${getPeriodLabel()}`,
            value: `${currencySymbol}${stats?.profit30Days?.toLocaleString() || '0'}`,
            icon: TrendingUp,
            color: 'text-accent',
            bg: 'bg-accent/10',
            trend: `${profitMarginPercent}% margin`,
            trendUp: profitMarginPercent > 0,
            description: 'Profit after costs'
        },
        {
            label: 'Active Orders',
            value: stats?.activeOrders || 0,
            icon: ShoppingCart,
            color: 'text-purple-400',
            bg: 'bg-purple-400/10',
            trend: 'In progress',
            trendUp: true,
            description: 'Pending fulfillment'
        },
        {
            label: 'Low Stock Alerts',
            value: stats?.lowStockCount || 0,
            icon: AlertCircle,
            color: 'text-danger',
            bg: 'bg-danger/10',
            trend: stats?.lowStockCount > 0 ? 'Action needed' : 'All clear',
            trendUp: false,
            description: 'Critical inventory levels'
        },
    ];

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100 } }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8 pb-10"
        >
            {/* Enhanced Header */}
            <motion.header variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-5xl font-extrabold tracking-tight text-white">Business Analytics</h1>
                        <div className="w-3 h-3 rounded-full bg-success animate-pulse shadow-lg shadow-success/50"></div>
                    </div>
                    <div className="flex items-center gap-3 text-text-secondary">
                        <Activity size={16} className="text-accent animate-pulse" />
                        <span className="text-sm font-bold">Real-time Intelligence Dashboard</span>
                        <span className="text-xs opacity-50">•</span>
                        <span className="text-xs font-mono opacity-70">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest bg-white/5 hover:bg-white/10 transition-all flex items-center gap-2 border border-white/10 hover:border-white/20 text-white shadow-lg hover:shadow-xl"
                    >
                        <Download size={16} />
                        Export Data
                    </button>
                </div>
            </motion.header>

            {/* Filter Panel */}
            <motion.div variants={item} className="glass-card p-6 border-none shadow-xl bg-gradient-to-br from-secondary/40 to-bg-primary">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    {/* Current Filter Display */}
                    <div className="flex items-center gap-4 flex-1">
                        <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
                            <Filter className="text-accent" size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-black mb-1">Active Filter</p>
                            <p className="text-lg font-black text-white">{getFilterLabel()}</p>
                        </div>
                        {dateFilter.type !== 'all' && (
                            <button
                                onClick={clearFilters}
                                className="ml-4 p-2 rounded-lg bg-danger/10 hover:bg-danger/20 border border-danger/20 hover:border-danger/30 transition-all group"
                                title="Clear filters"
                            >
                                <X className="text-danger group-hover:rotate-90 transition-transform" size={16} />
                            </button>
                        )}
                    </div>

                    {/* Filter Toggle Button */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest bg-accent/10 hover:bg-accent/20 transition-all flex items-center gap-2 border border-accent/20 hover:border-accent/30 text-accent shadow-lg hover:shadow-xl"
                    >
                        <Filter size={16} />
                        {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </button>
                </div>

                {/* Expandable Filter Options */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-6 mt-6 border-t border-white/10">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {/* All Time */}
                                    <button
                                        onClick={() => handleFilterChange({ type: 'all' })}
                                        className={`p-6 rounded-2xl border-2 transition-all text-left group ${dateFilter.type === 'all'
                                            ? 'bg-accent/20 border-accent shadow-lg shadow-accent/20'
                                            : 'bg-white/5 border-white/10 hover:border-accent/30 hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`p-2 rounded-lg ${dateFilter.type === 'all' ? 'bg-accent/20' : 'bg-white/10'}`}>
                                                <Calendar className={dateFilter.type === 'all' ? 'text-accent' : 'text-text-secondary'} size={20} />
                                            </div>
                                            <p className={`font-black text-sm uppercase tracking-wider ${dateFilter.type === 'all' ? 'text-accent' : 'text-white'}`}>
                                                All Time
                                            </p>
                                        </div>
                                        <p className="text-xs text-text-secondary font-medium">View complete history</p>
                                    </button>

                                    {/* Year Filter */}
                                    <div className={`p-6 rounded-2xl border-2 transition-all ${dateFilter.type === 'year'
                                        ? 'bg-accent/20 border-accent shadow-lg shadow-accent/20'
                                        : 'bg-white/5 border-white/10'
                                        }`}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`p-2 rounded-lg ${dateFilter.type === 'year' ? 'bg-accent/20' : 'bg-white/10'}`}>
                                                <Calendar className={dateFilter.type === 'year' ? 'text-accent' : 'text-text-secondary'} size={20} />
                                            </div>
                                            <p className={`font-black text-sm uppercase tracking-wider ${dateFilter.type === 'year' ? 'text-accent' : 'text-white'}`}>
                                                By Year
                                            </p>
                                        </div>
                                        <select
                                            value={dateFilter.type === 'year' ? dateFilter.year : ''}
                                            onChange={(e) => handleFilterChange({ type: 'year', year: parseInt(e.target.value) })}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all"
                                        >
                                            <option value="">Select Year</option>
                                            {years.map(year => (
                                                <option key={year} value={year} className="bg-secondary text-white">
                                                    {year}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Month Filter */}
                                    <div className={`p-6 rounded-2xl border-2 transition-all ${dateFilter.type === 'month'
                                        ? 'bg-accent/20 border-accent shadow-lg shadow-accent/20'
                                        : 'bg-white/5 border-white/10'
                                        }`}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`p-2 rounded-lg ${dateFilter.type === 'month' ? 'bg-accent/20' : 'bg-white/10'}`}>
                                                <Calendar className={dateFilter.type === 'month' ? 'text-accent' : 'text-text-secondary'} size={20} />
                                            </div>
                                            <p className={`font-black text-sm uppercase tracking-wider ${dateFilter.type === 'month' ? 'text-accent' : 'text-white'}`}>
                                                By Month
                                            </p>
                                        </div>
                                        <div className="space-y-3">
                                            <select
                                                value={dateFilter.type === 'month' ? dateFilter.year : ''}
                                                onChange={(e) => {
                                                    const year = parseInt(e.target.value);
                                                    handleFilterChange({
                                                        type: 'month',
                                                        year,
                                                        month: dateFilter.month || new Date().getMonth() + 1
                                                    });
                                                }}
                                                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all"
                                            >
                                                <option value="">Year</option>
                                                {years.map(year => (
                                                    <option key={year} value={year} className="bg-secondary text-white">
                                                        {year}
                                                    </option>
                                                ))}
                                            </select>
                                            <select
                                                value={dateFilter.type === 'month' ? dateFilter.month : ''}
                                                onChange={(e) => {
                                                    const month = parseInt(e.target.value);
                                                    handleFilterChange({
                                                        type: 'month',
                                                        year: dateFilter.year || currentYear,
                                                        month
                                                    });
                                                }}
                                                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all"
                                            >
                                                <option value="">Month</option>
                                                {months.map(month => (
                                                    <option key={month.value} value={month.value} className="bg-secondary text-white">
                                                        {month.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Custom Date Range */}
                                    <div className={`p-6 rounded-2xl border-2 transition-all ${dateFilter.type === 'custom'
                                        ? 'bg-accent/20 border-accent shadow-lg shadow-accent/20'
                                        : 'bg-white/5 border-white/10'
                                        }`}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`p-2 rounded-lg ${dateFilter.type === 'custom' ? 'bg-accent/20' : 'bg-white/10'}`}>
                                                <Calendar className={dateFilter.type === 'custom' ? 'text-accent' : 'text-text-secondary'} size={20} />
                                            </div>
                                            <p className={`font-black text-sm uppercase tracking-wider ${dateFilter.type === 'custom' ? 'text-accent' : 'text-white'}`}>
                                                Custom Range
                                            </p>
                                        </div>
                                        <div className="space-y-3">
                                            <input
                                                type="date"
                                                value={dateFilter.type === 'custom' ? dateFilter.startDate : ''}
                                                onChange={(e) => {
                                                    handleFilterChange({
                                                        type: 'custom',
                                                        startDate: e.target.value,
                                                        endDate: dateFilter.endDate || new Date().toISOString().split('T')[0]
                                                    });
                                                }}
                                                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all"
                                            />
                                            <input
                                                type="date"
                                                value={dateFilter.type === 'custom' ? dateFilter.endDate : ''}
                                                onChange={(e) => {
                                                    handleFilterChange({
                                                        type: 'custom',
                                                        startDate: dateFilter.startDate || new Date().toISOString().split('T')[0],
                                                        endDate: e.target.value
                                                    });
                                                }}
                                                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Primary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {primaryMetrics.map((metric, i) => (
                    <motion.div
                        key={i}
                        variants={item}
                        whileHover={{ y: -8, scale: 1.02 }}
                        className="glass-card p-6 relative group overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all"
                    >
                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${metric.color.replace('text', 'from')} to-transparent`}></div>
                        <div className={`absolute -top-10 -right-10 w-32 h-32 ${metric.bg} rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity`}></div>

                        <div className="relative">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-black mb-2 opacity-70">{metric.label}</p>
                                    <h2 className="text-4xl font-black text-white mb-2 group-hover:text-accent transition-colors">{metric.value}</h2>
                                    <p className="text-xs text-text-secondary font-medium">{metric.description}</p>
                                </div>
                                <div className={`p-4 rounded-2xl ${metric.bg} border border-white/5 flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-6 shadow-lg`}>
                                    <metric.icon size={24} className={metric.color} />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                                {metric.trendUp ? (
                                    <TrendingUp size={14} className="text-success" />
                                ) : (
                                    <Clock size={14} className="text-warning" />
                                )}
                                <span className={`text-xs font-bold ${metric.trendUp ? 'text-success' : 'text-warning'}`}>
                                    {metric.trend}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Buying vs Selling Comparison */}
            <motion.div variants={item} className="glass-card p-8 border-none shadow-2xl bg-gradient-to-br from-secondary/50 to-bg-primary">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-2xl font-black text-white mb-1 flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-accent/10 border border-accent/20">
                                <BarChart3 size={20} className="text-accent" />
                            </div>
                            Purchases vs Sales{getPeriodLabel()}
                        </h3>
                        <p className="text-sm text-text-secondary font-medium">Financial performance comparison</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Chart */}
                    <div className="lg:col-span-2 h-[450px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={buyingVsSellingData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                    tickFormatter={(value) => `${currencySymbol}${(value / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#0a0a0c',
                                        border: '1px solid rgba(99, 102, 241, 0.3)',
                                        borderRadius: '16px',
                                        boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
                                        padding: '12px 16px'
                                    }}
                                    itemStyle={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '14px' }}
                                    formatter={(value: any) => [`${currencySymbol}${value.toLocaleString()}`, 'Amount']}
                                />
                                <Bar dataKey="value" radius={[12, 12, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Stats */}
                    <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-danger/10 border border-danger/20">
                            <div className="flex items-center gap-3 mb-3">
                                <Truck className="text-danger" size={24} />
                                <p className="text-xs font-black uppercase tracking-wider text-danger">Total Purchases</p>
                            </div>
                            <p className="text-3xl font-black text-white mb-1">{currencySymbol}{stats?.buyingVsSelling?.purchases?.toLocaleString() || 0}</p>
                            <p className="text-xs text-text-secondary font-medium">{stats?.buyingVsSelling?.purchaseOrders || 0} purchase orders</p>
                        </div>

                        <div className="p-6 rounded-2xl bg-success/10 border border-success/20">
                            <div className="flex items-center gap-3 mb-3">
                                <ShoppingCart className="text-success" size={24} />
                                <p className="text-xs font-black uppercase tracking-wider text-success">Total Sales</p>
                            </div>
                            <p className="text-3xl font-black text-white mb-1">{currencySymbol}{stats?.buyingVsSelling?.sales?.toLocaleString() || 0}</p>
                            <p className="text-xs text-text-secondary font-medium">{stats?.buyingVsSelling?.salesOrders || 0} sales orders</p>
                        </div>

                        <div className="p-6 rounded-2xl bg-accent/10 border border-accent/20">
                            <div className="flex items-center gap-3 mb-3">
                                <TrendingUp className="text-accent" size={24} />
                                <p className="text-xs font-black uppercase tracking-wider text-accent">Net Profit</p>
                            </div>
                            <p className="text-3xl font-black text-white mb-1">{currencySymbol}{stats?.buyingVsSelling?.profit?.toLocaleString() || 0}</p>
                            <p className="text-xs text-text-secondary font-medium">{profitMarginPercent}% profit margin</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Monthly Sales Trend */}
                <motion.div variants={item} className="glass-card p-8 border-none bg-gradient-to-br from-secondary/50 to-bg-primary shadow-2xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-2xl font-black text-white mb-1 flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                    <Calendar size={20} className="text-purple-400" />
                                </div>
                                Monthly Sales Trend{getPeriodLabel()}
                            </h3>
                            <p className="text-sm text-text-secondary font-medium">
                                {dateFilter.type === 'all' ? 'Historical revenue performance' : 'Revenue performance'}
                            </p>
                        </div>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlySalesData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.5} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                    tickFormatter={(value) => `${currencySymbol}${(value / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#0a0a0c',
                                        border: '1px solid rgba(168, 85, 247, 0.3)',
                                        borderRadius: '16px',
                                        boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
                                        padding: '12px 16px'
                                    }}
                                    itemStyle={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '14px' }}
                                    formatter={(value: any) => [`${currencySymbol}${value.toLocaleString()}`, 'Revenue']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#a855f7"
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                    strokeWidth={3}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Daily Revenue Trend */}
                <motion.div variants={item} className="glass-card p-8 border-none bg-gradient-to-br from-secondary/50 to-bg-primary shadow-2xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-2xl font-black text-white mb-1 flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-success/10 border border-success/20">
                                    <Activity size={20} className="text-success" />
                                </div>
                                Daily Revenue{getPeriodLabel()}
                            </h3>
                            <p className="text-sm text-text-secondary font-medium">Day-by-day sales performance</p>
                        </div>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyRevenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                    tickFormatter={(value) => `${currencySymbol}${(value / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#0a0a0c',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                        borderRadius: '16px',
                                        boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
                                        padding: '12px 16px'
                                    }}
                                    itemStyle={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '14px' }}
                                    formatter={(value: any) => [`${currencySymbol}${value.toLocaleString()}`, 'Revenue']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#22c55e"
                                    strokeWidth={3}
                                    dot={{ fill: '#22c55e', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Top Sellers & Inventory */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Top Sellers */}
                <motion.div variants={item} className="lg:col-span-2 glass-card p-8 bg-gradient-to-br from-secondary/30 to-transparent backdrop-blur-3xl border-white/5 shadow-2xl">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-2xl font-black text-white flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-accent/10 border border-accent/20">
                                <TrendingUp className="text-accent" size={20} />
                            </div>
                            Top Selling Products{getPeriodLabel()}
                        </h3>
                        <span className="text-xs font-black uppercase tracking-wider text-text-secondary">
                            {dateFilter.type === 'all' ? 'All Time' : 'In Period'}
                        </span>
                    </div>
                    <div className="space-y-4">
                        <AnimatePresence>
                            {stats?.topSellers?.slice(0, 5).map((product: any, i: number) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-center justify-between group cursor-pointer hover:bg-white/5 p-4 rounded-xl transition-all"
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-purple-500/20 border border-white/10 flex items-center justify-center font-black text-lg text-accent transition-all group-hover:scale-110 shadow-lg">
                                                {i + 1}
                                            </div>
                                            {i === 0 && (
                                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full border-2 border-bg-primary flex items-center justify-center text-[10px] shadow-lg">
                                                    👑
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-white group-hover:text-accent transition-colors truncate">{product._id}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <CheckCircle2 size={12} className="text-success" />
                                                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">{product.totalSold} Units Sold</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-success group-hover:scale-110 transition-transform">
                                            {currencySymbol}{product.revenue.toLocaleString()}
                                        </p>
                                        <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Revenue</p>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Inventory Summary */}
                <motion.div variants={item} className="glass-card p-8 bg-gradient-to-br from-secondary/30 to-transparent backdrop-blur-3xl border-white/5 shadow-2xl">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-2xl font-black text-white flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-warning/10 border border-warning/20">
                                <Package className="text-warning" size={20} />
                            </div>
                            Inventory
                        </h3>
                    </div>
                    <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                            <p className="text-xs font-black uppercase tracking-wider text-text-secondary mb-2">Total Value</p>
                            <p className="text-3xl font-black text-white mb-1">{currencySymbol}{stats?.inventoryValue?.toLocaleString() || 0}</p>
                            <p className="text-xs text-text-secondary font-medium">Selling price valuation</p>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                            <p className="text-xs font-black uppercase tracking-wider text-text-secondary mb-2">Cost Basis</p>
                            <p className="text-3xl font-black text-white mb-1">{currencySymbol}{stats?.inventoryBuyingValue?.toLocaleString() || 0}</p>
                            <p className="text-xs text-text-secondary font-medium">Buying price valuation</p>
                        </div>

                        <div className="p-6 rounded-2xl bg-accent/10 border border-accent/20">
                            <p className="text-xs font-black uppercase tracking-wider text-accent mb-2">Potential Profit</p>
                            <p className="text-3xl font-black text-white mb-1">{currencySymbol}{stats?.potentialProfit?.toLocaleString() || 0}</p>
                            <p className="text-xs text-text-secondary font-medium">If all stock sold</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Critical Alerts Table */}
            {stats?.lowStockItems && stats.lowStockItems.length > 0 && (
                <motion.div variants={item} className="glass-card p-0 overflow-hidden border-none shadow-2xl">
                    <div className="p-8 pb-6 flex items-center justify-between bg-gradient-to-r from-danger/5 to-transparent">
                        <div>
                            <h3 className="text-2xl font-black text-white flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-danger/10 border border-danger/20">
                                    <AlertCircle className="text-danger" size={20} />
                                </div>
                                Critical Inventory Alerts
                            </h3>
                            <p className="text-sm text-text-secondary font-medium">Items requiring immediate attention</p>
                        </div>
                        <span className="px-5 py-2 rounded-full bg-danger/10 text-danger text-xs font-black border border-danger/20 shadow-lg">
                            {stats?.lowStockCount || 0} Critical
                        </span>
                    </div>
                    <div className="table-container border-none rounded-none bg-secondary/5">
                        <table className="min-w-full">
                            <thead className="bg-white/5 border-b border-white/5">
                                <tr>
                                    <th className="px-8 py-5 font-black text-[10px] uppercase tracking-[0.25em] text-text-secondary text-left">Product</th>
                                    <th className="px-8 py-5 font-black text-[10px] uppercase tracking-[0.25em] text-text-secondary text-center">Stock</th>
                                    <th className="px-8 py-5 font-black text-[10px] uppercase tracking-[0.25em] text-text-secondary text-center">Incoming</th>
                                    <th className="px-8 py-5 font-black text-[10px] uppercase tracking-[0.25em] text-text-secondary text-center">Threshold</th>
                                    <th className="px-8 py-5 font-black text-[10px] uppercase tracking-[0.25em] text-text-secondary text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {stats?.lowStockItems?.map((item: any, idx: number) => (
                                    <motion.tr
                                        key={item.sku}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="hover:bg-accent/5 transition-all group"
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-black group-hover:bg-accent group-hover:text-white transition-all">
                                                    <Package size={18} />
                                                </div>
                                                <div>
                                                    <span className="font-black text-white text-base block group-hover:text-accent transition-colors">{item.name}</span>
                                                    <span className="text-[10px] font-mono text-text-secondary tracking-widest uppercase mt-1 block">SKU: {item.sku}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`text-2xl font-black ${item.stock === 0 ? 'text-danger' : 'text-warning'}`}>
                                                {item.stock}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {item.pending > 0 ? (
                                                    <>
                                                        <Truck size={14} className="text-success" />
                                                        <span className="text-sm font-black text-success">+{item.pending}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-sm font-bold text-text-secondary opacity-30">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className="text-lg font-black text-text-secondary">{item.reorderLevel}</span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <span className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 shadow-lg ${item.stock === 0
                                                ? 'bg-danger/20 text-danger border border-danger/30'
                                                : 'bg-warning/20 text-warning border border-warning/30'
                                                }`}>
                                                <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                                                {item.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default Dashboard;
