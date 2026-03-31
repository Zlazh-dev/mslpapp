import React from 'react';
import { Monitor } from 'lucide-react';

export default function DesktopGuard({ children }: { children: React.ReactNode }) {
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <Monitor size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Gunakan Layar Desktop</h2>
                <p className="text-slate-500 text-sm max-w-sm mb-8">
                    Fitur ini memerlukan layar yang lebih lebar untuk pengalaman optimal. Silakan gunakan perangkat Desktop atau Laptop Anda.
                </p>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-auto mb-4">
                    LPAPP - Manajemen Santri
                </div>
            </div>
        );
    }
    
    return <>{children}</>;
}
