import { NavLink } from 'react-router-dom';
import { Home, Users, Search, Menu } from 'lucide-react';

export default function BottomNav() {
    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 px-6 py-2 pb-safe flex justify-between items-center shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)]">
            <NavLink to="/p" end className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-teal-600' : 'text-slate-500'}`}>
                <Home size={22} className={location.pathname === '/p' ? 'fill-teal-100' : ''} />
                <span className="text-[10px] font-medium">Beranda</span>
            </NavLink>
            <NavLink to="/p/santri" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-teal-600' : 'text-slate-500'}`}>
                <Users size={22} />
                <span className="text-[10px] font-medium">Santri</span>
            </NavLink>
            <NavLink to="/p/laporan" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-teal-600' : 'text-slate-500'}`}>
                <Search size={22} />
                <span className="text-[10px] font-medium">Explorer</span>
            </NavLink>
            <button className="flex flex-col items-center gap-1 text-slate-500">
                <Menu size={22} />
                <span className="text-[10px] font-medium">Menu</span>
            </button>
        </nav>
    );
}
