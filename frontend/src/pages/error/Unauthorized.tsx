import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UnauthorizedPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <ShieldAlert size={40} strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-3">Akses Ditolak</h1>
            <p className="text-slate-500 max-w-sm mb-8">
                Maaf, Anda tidak memiliki izin peran (Role) yang dibutuhkan untuk mengakses halaman ini. 
                Hubungi Administrator jika Anda merasa ini adalah sebuah kesalahan.
            </p>
            <button 
                onClick={() => navigate('/p', { replace: true })}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
                <ArrowLeft size={18} /> Kembali ke Beranda
            </button>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-12 mb-4">
                LPAPP - Manajemen Santri
            </div>
        </div>
    );
}
