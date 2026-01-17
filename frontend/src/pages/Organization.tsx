import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
    Users,
    UserPlus,
    Mail,
    Shield,
    Upload,
    Download,
    Trash2,
    CheckCircle2,
    Clock,
    UserCheck,
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import * as XLSX from 'xlsx';

const Organization = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

    const isOwner = user?.role === 'OWNER';
    const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';

    // Fetch members
    const { data: members, isLoading } = useQuery({
        queryKey: ['members'],
        queryFn: async () => {
            const { data } = await client.get('/auth/users');
            return data;
        },
        enabled: canManage
    });

    // Single Add Mutation
    const addMemberMutation = useMutation({
        mutationFn: async (userData: any) => {
            await client.post('/auth/users', { ...userData, password: 'password123' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['members'] });
            toast.success('Member added successfully! Default password: password123');
            setIsAddModalOpen(false);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to add member');
        }
    });

    // Bulk Add Mutation
    const bulkAddMutation = useMutation({
        mutationFn: async (users: any[]) => {
            await client.post('/auth/users/bulk', { users });
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['members'] });
            toast.success(data.message || 'Bulk import successful!');
            setIsBulkModalOpen(false);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Bulk import failed');
        }
    });

    // Role Update Mutation
    const updateRoleMutation = useMutation({
        mutationFn: async ({ id, role }: { id: string, role: string }) => {
            await client.put(`/auth/users/${id}/role`, { role });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['members'] });
            toast.success('Role updated successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update role');
        }
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await client.delete(`/auth/users/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['members'] });
            toast.success('Member removed');
        }
    });

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
                name: item.Name || item.name,
                email: item.Email || item.email,
                role: (item.Role || item.role || 'STAFF').toUpperCase()
            }));

            bulkAddMutation.mutate(items);
        };
        reader.readAsBinaryString(file);
    };

    const downloadTemplate = () => {
        const template = [
            { Name: 'John Doe', Email: 'john@example.com', Role: 'MANAGER' },
            { Name: 'Jane Smith', Email: 'jane@example.com', Role: 'STAFF' }
        ];
        const worksheet = XLSX.utils.json_to_sheet(template);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
        XLSX.writeFile(workbook, "user_import_template.xlsx");
    };

    if (!canManage) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <Shield size={64} className="text-danger opacity-20" />
                <h2 className="text-2xl font-black text-white">Access Restricted</h2>
                <p className="text-text-secondary max-w-md">
                    You do not have administrative privileges to manage organization members.
                </p>
            </div>
        );
    }

    const filteredMembers = members?.filter((m: any) =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10 pb-10"
        >
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Organization</h1>
                    <p className="text-text-secondary flex items-center gap-2">
                        <Users size={14} /> Total Members: {members?.length || 0}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={downloadTemplate}
                        className="btn btn-secondary h-14 px-6 rounded-2xl font-black text-xs uppercase tracking-widest bg-white/5 border-white/10 hover:bg-white/10 flex items-center gap-2"
                    >
                        <Download size={18} />
                        Get Template
                    </button>
                    <button
                        onClick={() => setIsBulkModalOpen(true)}
                        className="btn btn-secondary h-14 px-6 rounded-2xl font-black text-xs uppercase tracking-widest bg-white/5 border-white/10 hover:bg-white/10 flex items-center gap-2"
                    >
                        <Upload size={18} />
                        Bulk Add
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn btn-primary h-14 px-8 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-accent/25 hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <UserPlus size={20} />
                        Add Member
                    </button>
                </div>
            </header>

            {/* Search Bar */}
            <div className="relative group max-w-2xl">
                {/* <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent transition-colors" /> */}
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    className="input pl-12 h-14 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-text-secondary/50 focus:bg-white/10 transition-all font-medium text-base shadow-inner w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Members Table */}
            <div className="glass-card border-none bg-secondary/20 overflow-hidden shadow-2xl">
                <div className="table-container border-none rounded-none overflow-visible">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-8 py-6 font-black text-[10px] uppercase tracking-[0.2em] text-text-secondary text-left">Member Info</th>
                                <th className="px-8 py-6 font-black text-[10px] uppercase tracking-[0.2em] text-text-secondary text-left">Role & Permissions</th>
                                <th className="px-8 py-6 font-black text-[10px] uppercase tracking-[0.2em] text-text-secondary text-left">Status</th>
                                <th className="px-8 py-6 font-black text-[10px] uppercase tracking-[0.2em] text-text-secondary text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-32">
                                        <div className="flex flex-col items-center">
                                            <Users className="animate-pulse text-accent mb-4" size={48} />
                                            <p className="font-bold uppercase tracking-[0.2em] text-sm opacity-50 text-white">Loading organization...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredMembers?.map((member: any, idx: number) => (
                                <motion.tr
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={member._id}
                                    className="group/row hover:bg-white/5 transition-all"
                                >
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-black">
                                                {member.name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-black text-white text-base tracking-tight">{member.name}</span>
                                                <span className="text-xs text-text-secondary font-medium flex items-center gap-1.5 grayscale group-hover/row:grayscale-0 transition-all">
                                                    <Mail size={12} /> {member.email}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${member.role === 'OWNER' ? 'bg-accent/10 text-accent border-accent/20' :
                                                member.role === 'MANAGER' ? 'bg-success/10 text-success border-success/20' :
                                                    'bg-white/5 text-text-secondary border-white/10'
                                                }`}>
                                                {member.role}
                                            </span>
                                            {isOwner && member.role !== 'OWNER' && (
                                                <select
                                                    value={member.role}
                                                    onChange={(e) => updateRoleMutation.mutate({ id: member._id, role: e.target.value })}
                                                    className="bg-transparent text-[10px] font-black uppercase tracking-widest text-text-secondary cursor-pointer hover:text-white transition-colors border-none outline-none"
                                                >
                                                    <option value="MANAGER">Promote to Manager</option>
                                                    <option value="STAFF">Assign Staff Role</option>
                                                </select>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={14} className="text-success" />
                                            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Active</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity translate-x-4 group-hover/row:translate-x-0 transition-transform">
                                            {isOwner && member.role !== 'OWNER' && (
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Are you sure you want to remove ${member.name}?`)) {
                                                            deleteMutation.mutate(member._id);
                                                        }
                                                    }}
                                                    className="w-10 h-10 rounded-xl bg-danger/10 text-danger border border-danger/20 flex items-center justify-center hover:bg-danger/20 transition-all"
                                                    title="Remove Member"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Member Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add New Member"
            >
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    addMemberMutation.mutate({
                        name: formData.get('name'),
                        email: formData.get('email'),
                        role: formData.get('role')
                    });
                }} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-text-secondary tracking-widest ml-1">Full Name</label>
                        <input name="name" required className="input h-14 rounded-2xl bg-white/5 border-white/10" placeholder="e.g. Robert Fox" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-text-secondary tracking-widest ml-1">Work Email</label>
                        <input name="email" type="email" required className="input h-14 rounded-2xl bg-white/5 border-white/10" placeholder="robert@organization.com" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-text-secondary tracking-widest ml-1">Initial Role</label>
                        <select name="role" required className="input h-14 rounded-2xl bg-white/5 border-white/10 font-bold">
                            <option value="STAFF">Staff (Inventory & Orders)</option>
                            <option value="MANAGER">Manager (Full Catalog & Supplier Access)</option>
                        </select>
                    </div>
                    <div className="p-4 rounded-xl bg-accent/5 border border-accent/10 flex items-start gap-3">
                        <UserCheck size={20} className="text-accent shrink-0 mt-0.5" />
                        <p className="text-xs text-text-secondary leading-relaxed">
                            New members will be initialized with the temporary password <span className="font-black text-white">password123</span>. They should update it upon first login.
                        </p>
                    </div>
                    <button
                        type="submit"
                        disabled={addMemberMutation.isPending}
                        className="btn btn-primary w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-accent/20"
                    >
                        {addMemberMutation.isPending ? 'Synchronizing...' : 'Provision Access'}
                    </button>
                </form>
            </Modal>

            {/* Bulk Modal */}
            <Modal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                title="Bulk Member Import"
            >
                <div className="space-y-8 py-4">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl p-12 hover:border-accent/40 hover:bg-white/5 transition-all text-center group cursor-pointer relative">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform">
                            <Upload size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">Click or drag Excel file</h3>
                        <p className="text-sm text-text-secondary opacity-60">Wait for indexing to complete after selecting</p>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Instructions</h4>
                        <ul className="space-y-3">
                            <li className="flex gap-3 text-sm text-text-secondary">
                                <div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center shrink-0 font-bold text-xs">1</div>
                                <span>Download the <button onClick={downloadTemplate} className="text-accent font-bold hover:underline">Import Template</button> to see required columns.</span>
                            </li>
                            <li className="flex gap-3 text-sm text-text-secondary">
                                <div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center shrink-0 font-bold text-xs">2</div>
                                <span>Ensure all email addresses are unique within your organization.</span>
                            </li>
                            <li className="flex gap-3 text-sm text-text-secondary">
                                <div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center shrink-0 font-bold text-xs">3</div>
                                <span>Valid roles are: <code className="text-white font-mono bg-white/5 px-1">OWNER</code>, <code className="text-white font-mono bg-white/5 px-1">MANAGER</code>, <code className="text-white font-mono bg-white/5 px-1">STAFF</code>.</span>
                            </li>
                        </ul>
                    </div>
                    {bulkAddMutation.isPending && (
                        <div className="flex items-center gap-3 justify-center text-accent animate-pulse">
                            <Clock size={16} />
                            <span className="text-xs font-black uppercase tracking-widest">Syncing ledger...</span>
                        </div>
                    )}
                </div>
            </Modal>
        </motion.div>
    );
};

export default Organization;
