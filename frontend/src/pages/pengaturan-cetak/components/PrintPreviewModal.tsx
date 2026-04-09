import { useEffect, useState } from 'react';
import { X, Printer, FileDown } from 'lucide-react';
import { CanvasElement } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { User } from 'lucide-react';
import { ServerPrintModal } from './ServerPrintModal';

const BACKEND = import.meta.env.VITE_API_URL || '';
const CANVAS_W = 794; // A4 96dpi Width
const CANVAS_H = 1123; // A4 96dpi Height

interface PrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    elements: CanvasElement[];
}

export function PrintPreviewModal({ isOpen, onClose, elements }: PrintPreviewModalProps) {
    const [showServerPrint, setShowServerPrint] = useState(false);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[200] flex flex-col p-4 md:p-8">
            <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-5xl mx-auto overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Preview Cetak (A4)</h2>
                        <p className="text-sm text-gray-500">Tampilan sesungguhnya saat ditransfer ke kertas.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition text-sm">
                            Batal
                        </button>
                        <button
                            onClick={() => setShowServerPrint(true)}
                            className="px-5 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 shadow flex items-center gap-2 text-sm"
                        >
                            <FileDown size={16} /> Cetak Data
                        </button>
                        <button onClick={handlePrint} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow flex items-center gap-2 text-sm">
                            <Printer size={16} /> Cetak Layout
                        </button>
                    </div>
                </div>
                
                {/* Scrollable Container with preview-specific styling */}
                <div className="flex-1 overflow-auto bg-[#525659] p-8 flex justify-center print:bg-white print:p-0 print:overflow-visible">
                    
                    {/* The Page wrapper */}
                    <div className="bg-white shadow-[0_4px_12px_rgba(0,0,0,0.5)] print:shadow-none print:m-0" 
                         style={{ width: `${CANVAS_W}px`, height: `${CANVAS_H}px`, position: 'relative' }}
                         id="print-area">
                             
                        {/* Elements Canvas */}
                        {elements.map(el => (
                            <div
                                key={el.id}
                                style={{
                                    ...el.style,
                                    position: 'absolute',
                                    left: el.x,
                                    top: el.y,
                                    width: el.w,
                                    height: el.h,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: el.style.textAlign === 'center' ? 'center' : (el.style.textAlign === 'right' ? 'flex-end' : 'flex-start'),
                                    overflow: 'hidden'
                                }}
                            >
                                {el.type === 'text' && (el.value || 'Teks')}
                                {el.type === 'field' && el.field !== 'foto' && `[ ${el.field} ]`}
                                {el.type === 'field' && el.field === 'foto' && (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#9ca3af', border: '1px solid #e5e7eb' }}>
                                        <User size={32} strokeWidth={1.5} />
                                        <span style={{ fontSize: 10, fontFamily: 'sans-serif' }}>Foto Santri</span>
                                    </div>
                                )}
                                {el.type === 'image' && el.value && (
                                    <img src={el.value.startsWith('http') ? el.value : BACKEND + el.value} alt="img" style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
                                )}
                                {el.type === 'qrcode' && (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <QRCodeSVG
                                            value="https://profil-publik-santri"
                                            size={Math.min(el.w, el.h) - 8}
                                            level="M"
                                            style={{ display: 'block' }}
                                        />
                                    </div>
                                )}
                                {el.type === 'table' && (
                                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'sans-serif' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ backgroundColor: el.tableConfig?.headerColor || '#cbd5e1', padding: '6px', border: '1px solid #000' }}>No</th>
                                                    <th style={{ backgroundColor: el.tableConfig?.headerColor || '#cbd5e1', padding: '6px', border: '1px solid #000' }}>Kolom 1</th>
                                                    <th style={{ backgroundColor: el.tableConfig?.headerColor || '#cbd5e1', padding: '6px', border: '1px solid #000' }}>Kolom 2</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td style={{ padding: '6px', border: '1px solid #000', textAlign: 'center' }}>1</td>
                                                    <td style={{ padding: '6px', border: '1px solid #000' }}>Data 1</td>
                                                    <td style={{ padding: '6px', border: '1px solid #000' }}>Data 2</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '6px', border: '1px solid #000', textAlign: 'center' }}>2</td>
                                                    <td style={{ padding: '6px', border: '1px solid #000' }}>Data 3</td>
                                                    <td style={{ padding: '6px', border: '1px solid #000' }}>Data 4</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                </div>
            </div>

            {/* Server Print Modal */}
            <ServerPrintModal
                isOpen={showServerPrint}
                onClose={() => setShowServerPrint(false)}
                elements={elements}
            />
        </div>
    );
}
