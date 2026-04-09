import { NavLink, useLocation } from 'react-router-dom';
import { Home, Users, Menu, GraduationCap, BookOpen } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function BottomNav({ onMenuClick }: { onMenuClick?: () => void }) {
    const { user } = useAuthStore();
    const location = useLocation();
    
    if (!user) return null;

    const roles = user.roles || [];
    const isWaliKelas = roles.includes('WALI_KELAS');
    const isPembimbingKamar = roles.includes('PEMBIMBING_KAMAR');
    const isStafMadrasah = roles.includes('STAF_MADRASAH');
    
    // Selain pembimbing kamar dan wali kelas navbar nya cuma ada 3 menu: Beranda, Santri, Menu
    const isOther = !isWaliKelas && !isPembimbingKamar && !isStafMadrasah;

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-50 px-4 py-2 flex items-center justify-around shadow-lg">
            <NavLink to={isStafMadrasah ? '/madrasah/dashboard' : '/dashboard'} end className={({ isActive }) => `flex flex-col items-center justify-center gap-1 min-w-[64px] ${isActive || location.pathname === '/dashboard' ? 'text-emerald-600' : 'text-slate-500'}`}>
                <Home size={22} className={location.pathname.includes('dashboard') ? 'fill-emerald-100' : ''} />
                <span className="text-[10px] font-semibold">Beranda</span>
            </NavLink>

            {isStafMadrasah && (
                <NavLink to="/madrasah/kelas" className={({ isActive }) => `flex flex-col items-center justify-center gap-1 min-w-[64px] ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                    <BookOpen size={22} className={location.pathname.startsWith('/madrasah/kelas') ? 'fill-emerald-100' : ''} />
                    <span className="text-[10px] font-semibold">Madrasah</span>
                </NavLink>
            )}

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
                <NavLink to="/madrasah/kelas-saya" className={({ isActive }) => `flex flex-col items-center justify-center gap-1 min-w-[64px] ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                    <GraduationCap size={22} className={location.pathname.startsWith('/madrasah/kelas-saya') ? 'fill-emerald-100' : ''} />
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
