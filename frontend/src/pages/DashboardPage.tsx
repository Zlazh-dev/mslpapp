import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import { DashboardStats } from '../types';
import { Users, GraduationCap, Home, UserCheck, TrendingUp, TrendingDown, PlusCircle, Printer, Database, AlertCircle, Download, Activity, Server } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

// StatCard removed as requested.

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [distModel, setDistModel] = useState<'kelas' | 'kamar'>('kelas');

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
        <div className="space-y-10 max-w-7xl mx-auto pb-10">

            {/* Header & Welcome */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pt-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard Utama</h1>
                    <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">Ringkasan operasional dan tren pendaftaran pendidikan.</p>
                    
                    {/* Ringkasan Satu Baris */}
                    {stats && (
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-5 p-4 rounded-xl border border-slate-100 bg-white/50 backdrop-blur shadow-sm">
                            <div className="flex items-center gap-2">
                                <Users size={16} className="text-slate-400" />
                                <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Santri:</span> 
                                <span className="text-sm font-bold text-slate-800">{stats.summary.totalSantri.toLocaleString()}</span>
                            </div>
                            <div className="w-px h-4 bg-slate-200 hidden sm:block"></div>
                            <div className="flex items-center gap-2">
                                <TrendingUp size={16} className="text-emerald-500" />
                                <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Aktif:</span> 
                                <span className="text-sm font-bold text-emerald-700">{stats.summary.santriActive.toLocaleString()}</span>
                            </div>
                            <div className="w-px h-4 bg-slate-200 hidden sm:block"></div>
                            <div className="flex items-center gap-2">
                                <GraduationCap size={16} className="text-teal-500" />
                                <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Kelas:</span> 
                                <span className="text-sm font-bold text-slate-800">{stats.summary.totalKelas.toLocaleString()}</span>
                            </div>
                            <div className="w-px h-4 bg-slate-200 hidden sm:block"></div>
                            <div className="flex items-center gap-2">
                                <Home size={16} className="text-indigo-400" />
                                <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Kamar:</span> 
                                <span className="text-sm font-bold text-slate-800">{stats.summary.totalKamar.toLocaleString()}</span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <button onClick={exportToCSV} className="btn flex items-center gap-2 text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition shadow-sm px-4 py-2 rounded-lg font-medium">
                        <Download size={16} /> Ekspor CSV
                    </button>
                </div>
            </div>

            {/* Quick Actions */}
            {(user?.roles?.includes('ADMIN') || user?.roles?.includes('STAF_PENDATAAN')) && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link to="/santri/baru" className="flex items-center justify-center gap-2.5 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/50 transition text-slate-600 hover:text-emerald-700 font-medium text-sm shadow-sm">
                        <PlusCircle size={18} className="text-emerald-500" /> Registrasi Santri
                    </Link>
                    <Link to="/kamar" className="flex items-center justify-center gap-2.5 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-teal-300 hover:bg-teal-50/50 transition text-slate-600 hover:text-teal-700 font-medium text-sm shadow-sm">
                        <Home size={18} className="text-teal-500" /> Kelola Kamar
                    </Link>
                    <Link to="/pengaturan/cetak" className="flex items-center justify-center gap-2.5 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 transition text-slate-600 hover:text-indigo-700 font-medium text-sm shadow-sm">
                        <Printer size={18} className="text-indigo-500" /> Desain Cetak ID
                    </Link>
                    {user?.roles?.includes('ADMIN') && (
                        <Link to="/pengaturan/backupdata" className="flex items-center justify-center gap-2.5 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition text-slate-600 hover:text-slate-800 font-medium text-sm shadow-sm">
                            <Database size={18} className="text-slate-400" /> Backup Sistem
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

            {/* Stats grid (Removed per request) */}

            {/* Advanced Analytics Grid */}
            {stats && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Time Series Chart */}
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 lg:p-8">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Tren Pendaftaran Bulanan</h3>
                            <p className="text-xs text-slate-500 mt-1">Volume santri baru vs mutasi dalam 12 bulan terakhir</p>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.seriesData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)', fontSize: '12px', color: '#334155' }} />
                                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} iconType="circle" />
                                    <Line type="monotone" name="Pendaftaran Aktif" dataKey="pendaftaran" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, fill: '#10b981' }} />
                                    <Line type="monotone" name="Mutasi / Keluar" dataKey="mutasi" stroke="#cbd5e1" strokeWidth={2} dot={{ r: 3, fill: '#cbd5e1' }} activeDot={{ r: 5, fill: '#94a3b8' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bar Chart - Distribution */}
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 lg:p-8">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Distribusi Demografi</h3>
                                <p className="text-xs text-slate-500 mt-1">10 teratas formasi dengan kepadatan santri terbanyak</p>
                            </div>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button onClick={() => setDistModel('kelas')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${distModel === 'kelas' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                                    Per Kelas
                                </button>
                                <button onClick={() => setDistModel('kamar')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${distModel === 'kamar' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                                    Per Kamar
                                </button>
                            </div>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                {/* Using BarChart for formatted values */}
                                <BarChart data={distModel === 'kelas' ? stats.kelasDistribution : stats.kamarDistribution} margin={{ top: 5, right: 20, bottom: 5, left: 30 }} layout="vertical">
                                    <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} width={180} />
                                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)', fontSize: '12px' }} />
                                    <Bar dataKey="count" name="Jumlah Santri" fill={distModel === 'kelas' ? "#0ea5e9" : "#6366f1"} radius={[0, 4, 4, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
