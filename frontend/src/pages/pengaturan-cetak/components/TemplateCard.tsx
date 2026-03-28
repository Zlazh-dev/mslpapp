import React, { useState } from 'react';
import { Layers, Copy, Download, Trash2, CheckCircle, Edit, MoreVertical } from 'lucide-react';
import { PrintTemplate } from '../types';
import { exportTemplateToJson } from '../utils/templateExportImport';

interface TemplateCardProps {
    template: PrintTemplate;
    onEdit: (id: string, elements: any[]) => void;
    onSetDefault: (id: string) => void;
    onDelete: (id: string, name: string) => void;
    onDuplicate: (id: string, name: string) => void;
    isAdmin: boolean;
}

export function TemplateCard({ template, onEdit, onSetDefault, onDelete, onDuplicate, isAdmin }: TemplateCardProps) {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 flex flex-col transition hover:shadow-md relative group min-h-[220px]">
            {template.isDefault && (
                <span className="absolute top-3 right-3 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm z-10 flex items-center gap-1">
                    <CheckCircle size={10} /> AKTIF
                </span>
            )}

            <div className="flex-1 w-full flex flex-col items-center">
                {/* Visual Thumbnail miniatur kanvas - very basic abstract block representation */}
                <div className="relative w-[100px] h-[141px] bg-gray-50 border border-gray-200 rounded shadow-sm overflow-hidden mb-4 opacity-70 group-hover:opacity-100 transition">
                    {template.elements.slice(0, 10).map((el, idx) => {
                        const scaleW = 100 / 794;
                        const scaleH = 141 / 1123;
                        return (
                            <div 
                                key={idx} 
                                style={{
                                    position: 'absolute',
                                    left: el.x * scaleW,
                                    top: el.y * scaleH,
                                    width: Math.max(2, el.w * scaleW),
                                    height: Math.max(2, el.h * scaleH),
                                    backgroundColor: el.type === 'image' ? '#d8b4fe' : (el.type === 'rect' ? '#fcd34d' : '#93c5fd'),
                                    borderRadius: '1px'
                                }}
                            />
                        )
                    })}
                </div>

                <div className="w-full text-left">
                    <h3 className="font-bold text-gray-800 text-sm mb-1 truncate pr-14" title={template.name}>{template.name}</h3>
                    <p className="text-[11px] text-gray-500 mb-2">Diperbarui: {new Date(template.updatedAt).toLocaleDateString('id-ID')}</p>

                    <div className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 mt-auto">
                        <p className="flex items-center gap-1.5"><Layers size={12} className="text-gray-400" /> {template.elements.length} Elemen terpasang</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions overlay */}
            <div className="absolute top-3 left-3 flex gap-1 z-20">
                <button 
                    onClick={() => onDuplicate(template.id, template.name)} 
                    title="Duplikat Template"
                    className="p-1.5 bg-white border border-gray-200 rounded-md text-gray-500 hover:text-blue-600 shadow-sm opacity-0 group-hover:opacity-100 transition"
                >
                    <Copy size={12} />
                </button>
                <button 
                    onClick={() => exportTemplateToJson(template)} 
                    title="Export JSON"
                    className="p-1.5 bg-white border border-gray-200 rounded-md text-gray-500 hover:text-green-600 shadow-sm opacity-0 group-hover:opacity-100 transition"
                >
                    <Download size={12} />
                </button>
            </div>

            <div className="grid grid-cols-6 gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                    onClick={() => onEdit(template.id, template.elements)}
                    className="col-span-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-[11px] font-semibold rounded-lg transition flex items-center justify-center gap-1.5"
                >
                    <Edit size={12} /> Edit Desain
                </button>
                
                <div className="col-span-2 relative">
                    <button 
                        onClick={() => setShowMenu(!showMenu)}
                        className="w-full h-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-[11px] font-semibold rounded-lg transition border border-gray-200 flex items-center justify-center"
                    >
                        Opsi
                    </button>
                    
                    {showMenu && (
                        <div className="absolute bottom-full mb-1 right-0 w-36 bg-white border border-gray-200 shadow-lg rounded-xl overflow-hidden z-30">
                            {!template.isDefault && (
                                <button 
                                    onClick={() => { setShowMenu(false); onSetDefault(template.id); }} 
                                    disabled={!isAdmin}
                                    className="w-full text-left px-3 py-2 text-[11px] font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                                >
                                    Jadikan Default
                                </button>
                            )}
                            <button 
                                onClick={() => { setShowMenu(false); onDelete(template.id, template.name); }} 
                                disabled={!isAdmin}
                                className="w-full text-left px-3 py-2 text-[11px] font-medium text-red-600 hover:bg-red-50 border-t border-gray-100 disabled:opacity-50"
                            >
                                Hapus Permanen
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
