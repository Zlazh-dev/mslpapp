import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { X } from 'lucide-react';

import { useEffect, useState } from 'react';
import {
    LayoutDashboard, Users, Home,
    GraduationCap, UserCheck, LogOut, MessageSquare, Printer, HardDrive, Download
} from 'lucide-react';

interface NavItem {
    to: string;
    label: string;
    icon: React.ReactNode;
    roles: string[];
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

const navGroups: NavGroup[] = [
    {
        title: 'Utama',
        items: [
            { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, roles: ['ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'PEMBIMBING_KAMAR', 'WALI_KELAS'] }
        ]
    },
    {
        title: 'Data Master',
        items: [
            { to: '/santri', label: 'Data Santri', icon: <Users size={18} />, roles: ['ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH'] }
        ]
    },
    {
        title: 'Manajemen Asrama',
        items: [
            { to: '/kamar', label: 'Data Kamar', icon: <Home size={18} />, roles: ['ADMIN', 'STAF_PENDATAAN'] },
            { to: '/kamar-saya', label: 'Kamar Bimbingan', icon: <Home size={18} />, roles: ['PEMBIMBING_KAMAR'] },
            { to: '/kelas', label: 'Data Kelas', icon: <GraduationCap size={18} />, roles: ['ADMIN', 'STAF_MADRASAH'] },
            { to: '/kelas-saya', label: 'Kelas Bimbingan', icon: <GraduationCap size={18} />, roles: ['WALI_KELAS'] },
        ]
    },
    {
        title: 'Komunikasi',
        items: [
            { to: '/chat', label: 'Kotak Masuk', icon: <MessageSquare size={18} />, roles: ['ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'PEMBIMBING_KAMAR', 'WALI_KELAS'] }
        ]
    },
    {
        title: 'Sistem Administrasi',
        items: [
            { to: '/users', label: 'Kelola Pengguna', icon: <UserCheck size={18} />, roles: ['ADMIN'] },
            { to: '/pengaturan/cetak', label: 'Desain Cetak', icon: <Printer size={18} />, roles: ['ADMIN'] },
            { to: '/pengaturan/backupdata', label: 'Backup / Pulih', icon: <HardDrive size={18} />, roles: ['ADMIN'] },
        ]
    }
];

const roleLabels: Record<string, string> = {
    ADMIN: 'Administrator',
    STAF_PENDATAAN: 'Staf Pendataan',
    STAF_MADRASAH: 'Staf Madrasah',
    PEMBIMBING_KAMAR: 'Pembimbing Kamar',
    WALI_KELAS: 'Wali Kelas',
};

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    const handleNavClick = () => {
        // Close drawer on mobile when a link is clicked
        if (onClose) onClose();
    };

    const sidebarContent = (
        <div className="w-64 bg-gradient-to-b from-primary-800 to-primary-900 flex flex-col h-full shadow-xl">
            {/* Logo */}
            <div className="p-5 border-b border-primary-700/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img
                        src="/logo.png"
                        alt="Logo LPAPP"
                        className="w-10 h-10 object-contain rounded"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div>
                        <h1 className="text-white font-bold text-base leading-tight tracking-wider">LPAPP</h1>
                        <p className="text-primary-200 text-xs">Manajemen Santri</p>
                    </div>
                </div>
                {/* Close button - mobile only */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="md:hidden p-1.5 rounded-lg text-primary-200 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
                {navGroups.map((group, groupIdx) => {
                    const visibleItems = group.items.filter(item => user && item.roles.some((r) => user.roles?.includes(r)));
                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={groupIdx}>
                            <h3 className="px-3 mb-1 text-[10px] font-bold tracking-widest text-primary-300 uppercase">
                                {group.title}
                            </h3>
                            <div className="space-y-0.5">
                                {visibleItems.map(item => (
                                    <NavLink key={item.to} to={item.to}
                                        onClick={handleNavClick}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${isActive
                                                ? 'bg-white/20 text-white'
                                                : 'text-primary-100 hover:bg-white/10 hover:text-white'
                                            }`
                                        }>
                                        {item.icon}
                                        {item.label}
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* PWA Install Button */}
                {deferredPrompt && (
                    <div className="mt-4 px-3 pt-4 border-t border-primary-700/50">
                        <button
                            onClick={handleInstallClick}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-bold shadow-sm transition-colors animate-pulse"
                        >
                            <span className="flex items-center gap-2">
                                <Download size={16} /> Instal LPAPP
                            </span>
                        </button>
                        <p className="text-[10px] text-primary-200 mt-1.5 text-center leading-tight">
                            Pasang ke HP agar bisa diakses fullscreen tanpa browser
                        </p>
                    </div>
                )}
            </nav>

            {/* User info & logout */}
            <div className="p-4 border-t border-primary-700/50">
                <div className="mb-3">
                    <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
                    <p className="text-primary-300 text-xs truncate">
                        {user?.roles?.map(r => roleLabels[r] || r).join(', ')}
                    </p>
                </div>
                <button onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 text-primary-100 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors">
                    <LogOut size={16} />
                    Keluar
                </button>
                <p className="text-primary-500 text-[9px] text-center mt-3">LPAPP v2.0.0</p>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop: always visible */}
            <div className="hidden md:flex h-full shrink-0">
                {sidebarContent}
            </div>

            {/* Mobile: drawer overlay */}
            <div
                className={`md:hidden fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            >
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/50"
                    onClick={onClose}
                />
                {/* Drawer panel */}
                <div
                    className={`absolute inset-y-0 left-0 transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    {sidebarContent}
                </div>
            </div>
        </>
    );
}
