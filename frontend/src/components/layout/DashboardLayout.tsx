import { Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from '../Sidebar';
import Navbar from '../Navbar';
import BottomNav from '../BottomNav';

// Pages that should render edge-to-edge without padding/max-width
const FULL_BLEED_EXACT = ['/santri', '/khidmah', '/users', '/kamar'];
const FULL_BLEED_PREFIX = ['/madrasah/jadwal', '/madrasah/kelas', '/pengaturan/cetak'];

export default function DashboardLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const isFullBleed = FULL_BLEED_EXACT.includes(location.pathname) ||
        FULL_BLEED_PREFIX.some(r => location.pathname.startsWith(r));

    return (
        <div className="flex h-[100dvh] bg-slate-50 overflow-hidden relative">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            
            <div className="flex-1 flex flex-col overflow-hidden w-full">
                <Navbar onToggleSidebar={() => setIsSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto w-full">
                    {isFullBleed ? (
                        <Outlet />
                    ) : (
                        <div className="p-4 md:p-6 pb-24 md:pb-6 animate-fade-in max-w-[1600px] mx-auto w-full">
                            <Outlet />
                        </div>
                    )}
                </main>
            </div>

            {/* Bottom Nav appears only on mobile */}
            <BottomNav onMenuClick={() => setIsSidebarOpen(prev => !prev)} />
        </div>
    );
}
