import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Role } from '../types';
import {
    LayoutDashboard, Users, Home,
    GraduationCap, UserCheck, LogOut, MessageSquare, Printer, HardDrive,
} from 'lucide-react';

interface NavItem {
    to: string;
    label: string;
    icon: React.ReactNode;
    roles: Role[];
}

const navItems: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, roles: ['ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'PEMBIMBING_KAMAR', 'WALI_KELAS'] },
    { to: '/santri', label: 'Data Santri', icon: <Users size={18} />, roles: ['ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH'] },
    { to: '/kamar', label: 'Manajemen Kamar', icon: <Home size={18} />, roles: ['ADMIN', 'STAF_PENDATAAN'] },
    { to: '/kelas', label: 'Manajemen Kelas', icon: <GraduationCap size={18} />, roles: ['ADMIN', 'STAF_MADRASAH'] },
    { to: '/kamar-saya', label: 'Kamar Saya', icon: <Home size={18} />, roles: ['PEMBIMBING_KAMAR'] },
    { to: '/kelas-saya', label: 'Kelas Saya', icon: <GraduationCap size={18} />, roles: ['WALI_KELAS'] },
    { to: '/chat', label: 'Chat', icon: <MessageSquare size={18} />, roles: ['ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'PEMBIMBING_KAMAR', 'WALI_KELAS'] },
    { to: '/users', label: 'Pengguna', icon: <UserCheck size={18} />, roles: ['ADMIN'] },
    { to: '/pengaturan/cetak', label: 'Pengaturan Cetak', icon: <Printer size={18} />, roles: ['ADMIN'] },
    { to: '/pengaturan/backupdata', label: 'Backup Data', icon: <HardDrive size={18} />, roles: ['ADMIN'] },
];

const roleLabels: Record<Role, string> = {
    ADMIN: 'Administrator',
    STAF_PENDATAAN: 'Staf Pendataan',
    STAF_MADRASAH: 'Staf Madrasah',
    PEMBIMBING_KAMAR: 'Pembimbing Kamar',
    WALI_KELAS: 'Wali Kelas',
};

export default function Sidebar() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <div className="w-64 bg-gradient-to-b from-primary-800 to-primary-900 flex flex-col h-full shadow-xl">
            {/* Logo */}
            <div className="p-5 border-b border-primary-700/50">
                <div className="flex items-center gap-3">
                    <img
                        src="/logo.png"
                        alt="Logo Pesantren"
                        className="w-10 h-10 object-contain rounded"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div>
                        <h1 className="text-white font-bold text-base leading-tight">MSLPAPP</h1>
                        <p className="text-primary-200 text-xs">Manajemen Santri</p>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
                {navItems.map(item => {
                    if (!user || !item.roles.includes(user.role)) return null;
                    return (
                        <NavLink key={item.to} to={item.to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${isActive
                                    ? 'bg-white/20 text-white'
                                    : 'text-primary-100 hover:bg-white/10 hover:text-white'
                                }`
                            }>
                            {item.icon}
                            {item.label}
                        </NavLink>
                    );
                })}
            </nav>

            {/* User info & logout */}
            <div className="p-4 border-t border-primary-700/50">
                <div className="mb-3">
                    <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
                    <p className="text-primary-300 text-xs">{user ? roleLabels[user.role] : ''}</p>
                </div>
                <button onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 text-primary-100 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors">
                    <LogOut size={16} />
                    Keluar
                </button>
            </div>
        </div>
    );
}
