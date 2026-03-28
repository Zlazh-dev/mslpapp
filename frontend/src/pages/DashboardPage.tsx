import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import { DashboardStats } from '../types';
import { Users, GraduationCap, Home, UserCheck, TrendingUp, TrendingDown, PlusCircle, Printer, Database, AlertCircle, Download, Activity, Server } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex items-center gap-4 transition hover:shadow-md">
            <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                {icon}
            </div>
            <div>
                <p className="text-gray-500 text-sm font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900 leading-tight">{value.toLocaleString()}</p>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/laporan/dashboard')
            .then(res => setStats(res.data.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const exportToCSV = () => {
        if (!stats) return;
        const csvRows = [
            ['Kategori', 'Metrik', 'Nilai'],
            ['Ringkasan', 'Total Santri', stats.summary.totalSantri],
            ['Ringkasan', 'Santri Aktif', stats.summary.santriActive],
            ['Ringkasan', 'Santri Non-Aktif', stats.summary.santriInactive],
            ['Ringkasan', 'Total Kelas', stats.summary.totalKelas],
            ['Ringkasan', 'Total Kamar', stats.summary.totalKamar],
            ['Anomali', 'Santri Tanpa Kelas/Kamar', stats.anomalies.unassignedSantri],
            ['Anomali', 'Kamar Kelebihan Kapasitas', stats.anomalies.overcapacityRooms],
        ];

        stats.seriesData.forEach(s => {
            csvRows.push(['Tren Bulanan', `Pendaftaran ${s.name}`, s.pendaftaran]);
            csvRows.push(['Tren Bulanan', `Mutasi ${s.name}`, s.mutasi]);
        });

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
        const a = document.createElement('a');
        a.href = encodeURI(csvContent);
        a.download = `Laporan_Dashboard_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
            </div>
        );
    }

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

    return (
        <div className="space-y-6 max-w-7xl mx-auto">

            {/* Header & Welcome */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard Utama</h1>
                    <p className="text-gray-500 text-sm mt-1">Ringkasan data, analitik, dan kesehatan sistem pesantren.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportToCSV} className="btn btn-secondary flex items-center gap-2 text-sm bg-white border border-gray-200">
                        <Download size={16} /> Ekspor CSV
                    </button>
                </div>
            </div>

            {/* Quick Actions */}
            {(user?.role === 'ADMIN' || user?.role === 'STAF_PENDATAAN') && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Link to="/santri/baru" className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition text-blue-800 font-medium">
                        <PlusCircle size={20} className="text-blue-600" /> Registrasi Santri
                    </Link>
                    <Link to="/kamar" className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl hover:bg-orange-100 transition text-orange-800 font-medium">
                        <Home size={20} className="text-orange-600" /> Kelola Kamar
                    </Link>
                    <Link to="/pengaturan/cetak" className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition text-emerald-800 font-medium">
                        <Printer size={20} className="text-emerald-600" /> Desain Cetak ID
                    </Link>
                    {user?.role === 'ADMIN' && (
                        <Link to="/pengaturan/backupdata" className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-100 rounded-xl hover:bg-purple-100 transition text-purple-800 font-medium">
                            <Database size={20} className="text-purple-600" /> Backup Database
                        </Link>
                    )}
                </div>
            )}

            {/* Data Validation Alerts */}
            {stats && (stats.anomalies.unassignedSantri > 0 || stats.anomalies.overcapacityRooms > 0) && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-start gap-3">
                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-amber-800 text-sm">Peringatan Anomali & Integritas Data</h3>
                        <ul className="text-sm text-amber-700 mt-1 list-disc list-inside">
                            {stats.anomalies.unassignedSantri > 0 && <li>Ada <strong>{stats.anomalies.unassignedSantri} santri aktif</strong> yang belum dialokasikan ke kelas atau kamar (Missing Mapping).</li>}
                            {stats.anomalies.overcapacityRooms > 0 && <li>Ditemukan <strong>{stats.anomalies.overcapacityRooms} kamar</strong> yang jumlah penghuninya melampaui kapasitas maksimal.</li>}
                        </ul>
                    </div>
                </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard label="Total Santri" value={stats?.summary.totalSantri ?? 0} icon={<Users size={22} className="text-blue-600" />} color="bg-blue-100" />
                <StatCard label="Santri Aktif" value={stats?.summary.santriActive ?? 0} icon={<TrendingUp size={22} className="text-emerald-600" />} color="bg-emerald-100" />
                <StatCard label="Santri Tidak Aktif" value={stats?.summary.santriInactive ?? 0} icon={<TrendingDown size={22} className="text-rose-600" />} color="bg-rose-100" />

                <StatCard label="Total Kelas" value={stats?.summary.totalKelas ?? 0} icon={<GraduationCap size={22} className="text-purple-600" />} color="bg-purple-100" />
                <StatCard label="Total Kamar" value={stats?.summary.totalKamar ?? 0} icon={<Home size={22} className="text-orange-600" />} color="bg-orange-100" />
                <StatCard label="Total Pengguna" value={stats?.summary.totalUsers ?? 0} icon={<UserCheck size={22} className="text-slate-600" />} color="bg-slate-100" />
            </div>

            {/* Advanced Analytics Grid */}
            {stats && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Time Series Chart */}
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
                        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Activity size={18} className="text-gray-400" /> Tren Pendaftaran vs Mutasi (12 Bln)</h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.seriesData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Line type="monotone" name="Pendaftaran" dataKey="pendaftaran" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" name="Mutasi/Keluar" dataKey="mutasi" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bar Chart - Kelas */}
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
                        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Users size={18} className="text-gray-400" /> Distribusi per Kelas (Top 10)</h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.kelasDistribution} margin={{ top: 5, right: 20, bottom: 5, left: 0 }} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} width={100} />
                                    <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="count" name="Jumlah" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Status Keaktifan (Pie) & System Health */}
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><UserCheck size={18} className="text-gray-400" /> Rasio Keaktifan</h3>
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={[
                                            { name: 'Aktif', value: stats.summary.santriActive },
                                            { name: 'Non-Aktif', value: stats.summary.santriInactive }
                                        ]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                                            <Cell fill="#10b981" />
                                            <Cell fill="#f43f5e" />
                                        </Pie>
                                        <RechartsTooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="flex-1 border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-6">
                            <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2"><Server size={18} className="text-gray-400" /> Sistem & Monitoring</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Versi Aplikasi</p>
                                    <div className="bg-gray-50 px-3 py-1.5 rounded-lg inline-flex text-sm font-semibold text-gray-700 font-mono">
                                        {stats.systemHealth.version}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Status Web Service</p>
                                    <div className="bg-emerald-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        {stats.systemHealth.serviceStatus}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Catatan Backup Terakhir</p>
                                    <p className="text-sm font-medium text-gray-800 border-b border-dashed border-gray-300 pb-1 inline-block">
                                        {new Date(stats.systemHealth.lastBackup).toLocaleString('id-ID')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
