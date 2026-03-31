import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from '../Sidebar';
import Navbar from '../Navbar';
import BottomNav from '../BottomNav';

export default function DashboardLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-[100dvh] bg-slate-50 overflow-hidden relative">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            
            <div className="flex-1 flex flex-col overflow-hidden w-full">
                <Navbar onToggleSidebar={() => setIsSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto w-full">
                    {/* Add pb-20 to allow space for bottom nav on mobile */}
                    <div className="p-4 md:p-6 pb-20 md:pb-6 animate-fade-in max-w-[1600px] mx-auto w-full">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Bottom Nav appears only on mobile */}
            <BottomNav />
        </div>
    );
}
