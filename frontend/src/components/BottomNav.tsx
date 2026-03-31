import { NavLink, useLocation } from 'react-router-dom';
import { Home, Users, Menu, GraduationCap } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function BottomNav({ onMenuClick }: { onMenuClick?: () => void }) {
    const { user } = useAuthStore();
    const location = useLocation();
    
    if (!user) return null;

    const roles = user.roles || [];
    const isWaliKelas = roles.includes('WALI_KELAS');
    const isPembimbingKamar = roles.includes('PEMBIMBING_KAMAR');
    
    // Selain pembimbing kamar dan wali kelas navbar nya cuma ada 3 menu: Beranda, Santri, Menu
    const isOther = !isWaliKelas && !isPembimbingKamar;

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 px-6 py-2 pb-safe flex items-center justify-around shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)]">
            <NavLink to="/dashboard" end className={({ isActive }) => `flex flex-col items-center justify-center gap-1 min-w-[64px] ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                <Home size={22} className={location.pathname === '/dashboard' ? 'fill-emerald-100' : ''} />
                <span className="text-[10px] font-semibold">Beranda</span>
            </NavLink>

            {isOther && (
                <NavLink to="/santri" className={({ isActive }) => `flex flex-col items-center justify-center gap-1 min-w-[64px] ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                    <Users size={22} className={location.pathname.startsWith('/santri') ? 'fill-emerald-100' : ''} />
                    <span className="text-[10px] font-semibold">Santri</span>
                </NavLink>
            )}

            {isPembimbingKamar && (
                <NavLink to="/kamar-saya" className={({ isActive }) => `flex flex-col items-center justify-center gap-1 min-w-[64px] ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                    <Home size={22} className={location.pathname.startsWith('/kamar-saya') ? 'fill-emerald-100' : ''} />
                    <span className="text-[10px] font-semibold">Kamar</span>
                </NavLink>
            )}

            {isWaliKelas && (
                <NavLink to="/kelas-saya" className={({ isActive }) => `flex flex-col items-center justify-center gap-1 min-w-[64px] ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                    <GraduationCap size={22} className={location.pathname.startsWith('/kelas-saya') ? 'fill-emerald-100' : ''} />
                    <span className="text-[10px] font-semibold">Kelas</span>
                </NavLink>
            )}

            <button onClick={onMenuClick} className="flex flex-col items-center justify-center gap-1 min-w-[64px] text-slate-500">
                <Menu size={22} />
                <span className="text-[10px] font-semibold">Menu</span>
            </button>
        </nav>
    );
}
