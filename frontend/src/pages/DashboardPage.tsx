import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import { DashboardStats } from '../types';
import { Users, GraduationCap, Home, UserCheck, TrendingUp, TrendingDown } from 'lucide-react';

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
    return (
        <div className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                {icon}
            </div>
            <div>
                <p className="text-gray-500 text-sm">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 text-sm mt-1">Ringkasan data sistem manajemen santri</p>
            </div>

            {/* Stats grid — show based on role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(user?.role === 'ADMIN' || user?.role === 'STAF_PENDATAAN') && (
                    <>
                        <StatCard label="Total Santri" value={stats?.totalSantri ?? 0} icon={<Users size={22} className="text-blue-600" />} color="bg-blue-100" />
                        <StatCard label="Santri Aktif" value={stats?.santriActive ?? 0} icon={<TrendingUp size={22} className="text-emerald-600" />} color="bg-emerald-100" />
                    </>
                )}
                {user?.role === 'ADMIN' && (
                    <>
                        <StatCard label="Total Kelas" value={stats?.totalKelas ?? 0} icon={<GraduationCap size={22} className="text-purple-600" />} color="bg-purple-100" />
                        <StatCard label="Total Kamar" value={stats?.totalKamar ?? 0} icon={<Home size={22} className="text-orange-600" />} color="bg-orange-100" />
                        <StatCard label="Total Pengguna" value={stats?.totalUsers ?? 0} icon={<UserCheck size={22} className="text-primary-600" />} color="bg-primary-100" />
                        <StatCard label="Santri Tidak Aktif" value={stats?.santriInactive ?? 0} icon={<TrendingDown size={22} className="text-red-600" />} color="bg-red-100" />
                    </>
                )}
                {(user?.role === 'STAF_MADRASAH' || user?.role === 'WALI_KELAS') && (
                    <StatCard label="Total Kelas" value={stats?.totalKelas ?? 0} icon={<GraduationCap size={22} className="text-purple-600" />} color="bg-purple-100" />
                )}
                {(user?.role === 'PEMBIMBING_KAMAR') && (
                    <StatCard label="Total Kamar" value={stats?.totalKamar ?? 0} icon={<Home size={22} className="text-orange-600" />} color="bg-orange-100" />
                )}
            </div>

            {/* Welcome panel */}
            <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
                <h2 className="text-xl font-bold">Selamat Datang, {user?.name}! 👋</h2>
                <p className="text-primary-100 mt-2 text-sm">
                    Anda login sebagai <strong>{user?.role?.replace(/_/g, ' ')}</strong>.
                    Gunakan menu di sidebar untuk mengakses fitur-fitur yang tersedia.
                </p>
                <div className="mt-4 flex gap-2 flex-wrap">
                    <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">MSLPAPP v1.0</span>
                    <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">
                        {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>
            </div>
        </div>
    );
}
