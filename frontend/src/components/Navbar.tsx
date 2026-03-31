import { Menu, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../lib/api';

const roleLabels: Record<string, string> = {
    ADMIN: 'Administrator',
    STAF_PENDATAAN: 'Staf Pendataan',
    STAF_MADRASAH: 'Staf Madrasah',
    PEMBIMBING_KAMAR: 'Pembimbing Kamar',
    WALI_KELAS: 'Wali Kelas',
};

interface NavbarProps {
    onToggleSidebar?: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [unread, setUnread] = useState(0);

    // Poll unread chat count every 30s
    useEffect(() => {
        const fetchUnread = () => {
            api.get('/chat/contacts').then(r => {
                const total = (r.data.data ?? []).reduce((s: number, c: any) => s + (c.unreadCount ?? 0), 0);
                setUnread(total);
            }).catch(() => { });
        };
        fetchUnread();
        const t = setInterval(fetchUnread, 30_000);
        return () => clearInterval(t);
    }, []);

    return (
        <header className="h-14 md:h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 shadow-sm">
            <div className="flex items-center gap-3">
                {/* Hamburger — mobile only */}
                <button
                    onClick={onToggleSidebar}
                    className="md:hidden p-2 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    aria-label="Toggle menu"
                >
                    <Menu size={22} />
                </button>

                {/* Logo text — mobile only */}
                <span className="md:hidden text-sm font-bold tracking-wider text-primary-700">LPAPP</span>

                {/* Welcome — desktop only */}
                <div className="hidden md:block">
                    <p className="text-gray-500 text-sm">Selamat datang,</p>
                    <h2 className="text-gray-900 font-semibold text-sm">{user?.name}</h2>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
                {/* Chat with unread badge */}
                <button
                    onClick={() => navigate('/chat')}
                    className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                >
                    <MessageSquare size={18} />
                    {unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                            {unread > 99 ? '99+' : unread}
                        </span>
                    )}
                </button>

                {/* Avatar */}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 md:w-9 md:h-9 bg-primary-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs md:text-sm font-semibold">
                            {user?.name?.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-xs text-gray-500 truncate max-w-[120px]">
                            {user?.roles?.map(r => roleLabels[r] || r).join(', ')}
                        </p>
                    </div>
                </div>
            </div>
        </header>
    );
}
