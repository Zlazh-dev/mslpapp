import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Santri } from '../types';
import { useAuthStore } from '../stores/authStore';
import QRCode from 'qrcode';
import PrintSidebar from '../components/PrintSidebar';
import {
    ArrowLeft, Edit2, Camera, MoreVertical, FileText, Upload, X,
    User as UserIcon, Users, MapPin, GraduationCap, BookOpen,
    QrCode, Printer, Download, Trash2, KeyRound, ClipboardList, Plus
} from 'lucide-react';

const BACKEND = import.meta.env.VITE_API_URL || '';

const GENDER_LABEL: Record<string, string> = { L: 'Laki-laki', P: 'Perempuan' };
const JALUR_LABEL: Record<string, string> = { FORMAL: 'Formal', TAHFIDZ: 'Tahfidz', MAHAD_ALY: "Ma'had Aly" };

function fmt(date?: string | null) {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function calcAge(tanggalLahir?: string | null): string {
    if (!tanggalLahir) return '—';
    const birth = new Date(tanggalLahir);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return `${age} tahun`;
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
    return (
        <div className="flex justify-between items-start py-2 border-b border-slate-50 last:border-0 gap-4">
            <span className="text-xs text-slate-400 shrink-0 w-36">{label}</span>
            <span className="text-xs font-medium text-slate-700 text-right">{value || <span className="text-slate-300">—</span>}</span>
        </div>
    );
}

type Tab = 'detail' | 'dokumen' | 'nilai';

export default function SantriDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canEdit = user && ['ADMIN', 'STAF_PENDATAAN'].includes(user.roles?.[0]);

    const [santri, setSantri] = useState<Santri | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('detail');

    // Kebab menu
    const [showKebab, setShowKebab] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const kebabRef = useRef<HTMLDivElement>(null);

    // QR Code
    const [showQr, setShowQr] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState('');

    // Print Sidebar
    const [showPrintSidebar, setShowPrintSidebar] = useState(false);

    // Khidmah
    const [khidmahList, setKhidmahList] = useState<{id: string; modelKhidmah: {id: string; nama: string}; keterangan: string | null}[]>([]);
    const [khidmahModels, setKhidmahModels] = useState<{id: string; nama: string}[]>([]);
    const [showKhidmahAssign, setShowKhidmahAssign] = useState(false);
    const [khidmahAssignModelId, setKhidmahAssignModelId] = useState('');
    const [khidmahAssignKet, setKhidmahAssignKet] = useState('');

    const generateQr = useCallback((santriId: string) => {
        const url = `${window.location.origin}/p/santri/${santriId}`;
        QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: '#065f46', light: '#ffffff' } })
            .then(setQrDataUrl);
    }, []);



    // Photo upload
    const fotoInputRef = useRef<HTMLInputElement>(null);
    const [uploadingFoto, setUploadingFoto] = useState(false);

    // KK upload
    const kkInputRef = useRef<HTMLInputElement>(null);
    const [uploadingKK, setUploadingKK] = useState<1 | 2 | null>(null);
    const [kkPreview, setKkPreview] = useState<{ url: string; name: string; type: string } | null>(null);
    const [kkPreview2, setKkPreview2] = useState<{ url: string; name: string; type: string } | null>(null);
    const [activeTargetSlot, setActiveTargetSlot] = useState<1 | 2>(1);

    // Nilai
    const [nilai, setNilai] = useState<any[]>([]);
    const [loadingNilai, setLoadingNilai] = useState(false);

    // Create User Modal
    const [showUserModal, setShowUserModal] = useState(false);
    const [userPassword, setUserPassword] = useState('');
    const [userPasswordConfirm, setUserPasswordConfirm] = useState('');
    const [userRoles, setUserRoles] = useState<string[]>(['STAF_PENDATAAN']);
    const [userError, setUserError] = useState('');
    const [submittingUser, setSubmittingUser] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (userRoles.length === 0) return setUserError('Pilih minimal satu role');
        if (userPassword.length < 6) return setUserError('Password minimal 6 karakter');
        if (userPassword !== userPasswordConfirm) return setUserError('Konfirmasi password tidak cocok');
        if (!santri) return;

        setSubmittingUser(true);
        setUserError('');
        try {
            await api.post('/users', {
                name: santri.namaLengkap,
                password: userPassword,
                roles: userRoles,
                santriId: santri.id
            });
            setShowUserModal(false);
            setUserPassword('');
            setUserPasswordConfirm('');
            setUserRoles(['STAF_PENDATAAN']);
            fetchSantri();
            setSuccessMessage('Akun user berhasil dibuat. User dapat login menggunakan NIS.');
            setShowSuccessModal(true);
        } catch (err: any) {
            setUserError(err.response?.data?.message || 'Gagal membuat akun');
        } finally {
            setSubmittingUser(false);
        }
    };

    const fetchSantri = () => {
        api.get(`/santri/${id}`).then(async r => {
            const s: Santri = r.data.data;
            setSantri(s);
            
            const loadPreview = async (url: string | null, fallbackName: string) => {
                if (!url) return null;
                const ext = url.split('.').pop()?.toLowerCase() || '';
                const fileName = url.split('/').pop() || fallbackName;
                try {
                    const blobRes = await api.get(url, { responseType: 'blob' });
                    const blobUrl = URL.createObjectURL(blobRes.data);
                    return { url: blobUrl, name: fileName, type: ext };
                } catch {
                    return { url: BACKEND + url, name: fileName, type: ext };
                }
            };

            setKkPreview(await loadPreview(s.kkFileUrl ?? null, 'Dokumen KK 1'));
            setKkPreview2(await loadPreview((s as any).kkFileUrl2 ?? null, 'Dokumen KK 2'));
        }).finally(() => setLoading(false));
    };

    const fetchKhidmah = () => {
        if (!id) return;
        api.get(`/khidmah/data/santri/${id}`).then(r => setKhidmahList(r.data)).catch(() => {});
    };

    const fetchKhidmahModels = () => {
        api.get('/khidmah/model').then(r => setKhidmahModels(r.data)).catch(() => {});
    };

    useEffect(() => { fetchSantri(); fetchKhidmah(); fetchKhidmahModels(); }, [id]);

    useEffect(() => {
        if (activeTab === 'nilai' && id) {
            setLoadingNilai(true);
            api.get(`/santri/${id}`).then(r => setNilai(r.data.data?.nilai || [])).finally(() => setLoadingNilai(false));
        }
    }, [activeTab, id]);

    // Close kebab on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) setShowKebab(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !santri) return;
        setUploadingFoto(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await api.post('/upload/foto', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            await api.put(`/santri/${santri.id}`, { foto: res.data.url });
            fetchSantri();
        } finally {
            setUploadingFoto(false);
            e.target.value = '';
        }
    };

    const handleKKUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !santri) return;
        const slot = activeTargetSlot;
        setUploadingKK(slot);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await api.post('/upload/kk', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            await api.put(`/santri/${santri.id}`, { [slot === 1 ? 'kkFileUrl' : 'kkFileUrl2']: res.data.url });
            
            const ext = res.data.url.split('.').pop()?.toLowerCase() || '';
            const blobUrl = URL.createObjectURL(file);
            const previewData = { url: blobUrl, name: res.data.originalName || file.name, type: ext };
            
            if (slot === 1) setKkPreview(previewData);
            else setKkPreview2(previewData);
            
            fetchSantri();
        } finally {
            setUploadingKK(null);
            e.target.value = '';
        }
    };

    const triggerKKUpload = (slot: 1 | 2) => {
        setActiveTargetSlot(slot);
        kkInputRef.current?.click();
    };

    const handleDeactivate = async () => {
        if (!santri) return;
        setShowKebab(false);
        setActionLoading(true);
        const today = new Date().toISOString().split('T')[0];
        try {
            await api.put(`/santri/${santri.id}`, { tanggalKeluar: today, kelasId: null, kamarId: null });
            fetchSantri();
        } finally { setActionLoading(false); }
    };

    const handleActivate = async () => {
        if (!santri) return;
        setShowKebab(false);
        setActionLoading(true);
        try {
            await api.put(`/santri/${santri.id}`, { tanggalKeluar: null });
            fetchSantri();
        } finally { setActionLoading(false); }
    };

    if (loading) return (
        <div className="space-y-4 animate-pulse">
            <div className="h-8 w-48 bg-gray-200 rounded" />
            <div className="h-48 bg-gray-200 rounded-xl" />
        </div>
    );
    if (!santri) return <div className="text-center py-12 text-gray-400">Santri tidak ditemukan</div>;

    const isInactive = santri.status === 'INACTIVE';
    const fotoUrl = santri.foto ? (santri.foto.startsWith('http') ? santri.foto : BACKEND + santri.foto) : null;
    const initial = santri.namaLengkap.charAt(0).toUpperCase();
    const alamatParts = [santri.jalan, santri.rtRw && `RT/RW ${santri.rtRw}`, santri.kelurahan, santri.kecamatan, santri.kotaKabupaten, santri.provinsi].filter(Boolean);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" ref={fotoInputRef} onChange={handleFotoUpload} />
            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" className="hidden" ref={kkInputRef} onChange={handleKKUpload} />

            {/* ── Header Bar ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-teal-600 hover:border-teal-200 shadow-sm transition-all">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Detail Santri</h1>
                        {isInactive && <p className="text-xs text-orange-500 font-medium mt-0.5">· Santri Tidak Aktif{santri.tanggalKeluar ? ` · Keluar: ${fmt(santri.tanggalKeluar)}` : ''}</p>}
                    </div>
                </div>
                {canEdit && (
                    <div className="relative" ref={kebabRef}>
                        <button onClick={() => setShowKebab(v => !v)} disabled={actionLoading}
                            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300 shadow-sm transition-all">
                            <MoreVertical size={18} />
                        </button>
                        {showKebab && (
                            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-slate-200 bg-white shadow-xl py-1.5 z-50">
                                <button onClick={() => { setShowKebab(false); navigate(`/santri/${santri.id}/edit`); }}
                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                                    <Edit2 size={14} className="text-slate-400" /> Edit Data
                                </button>
                                <button onClick={() => { setShowKebab(false); generateQr(santri.id); setShowQr(true); }}
                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-violet-600 hover:bg-violet-50 transition-colors">
                                    <QrCode size={14} /> Generate QR Code
                                </button>
                                {santri.user ? (
                                    <button disabled className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed">
                                        <KeyRound size={14} /> Akun Login Aktif
                                    </button>
                                ) : (
                                    <button onClick={() => { setShowKebab(false); setShowUserModal(true); }}
                                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors">
                                        <KeyRound size={14} /> Jadikan User
                                    </button>
                                )}
                                <button onClick={() => { setShowKebab(false); setShowPrintSidebar(true); }}
                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors">
                                    <Printer size={14} /> Cetak Biodata
                                </button>
                                <div className="my-1.5 border-t border-slate-100" />
                                {isInactive ? (
                                    <button onClick={handleActivate}
                                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-teal-600 hover:bg-teal-50 transition-colors">
                                        Aktifkan Kembali
                                    </button>
                                ) : (
                                    <button onClick={handleDeactivate}
                                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-amber-600 hover:bg-amber-50 transition-colors">
                                        Nonaktifkan
                                    </button>
                                )}
                                <button onClick={async () => { if (!confirm('Hapus santri ini? Aksi tidak dapat dibatalkan.')) return; await api.delete(`/santri/${santri.id}`); navigate('/santri'); }}
                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                                    <Trash2 size={14} /> Hapus
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ═══ Main Layout: Photo LEFT │ Data RIGHT ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">

                {/* ── Left: Photo + Parent sections ── */}
                <div className="space-y-5">
                    {/* Photo Card */}
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <div className="relative group">
                            {/* Evaluasi kondisional dipastikan aman. Placeholder dicetak jika gambar NULL */}
                            {fotoUrl ? (
                                <img 
                                    src={fotoUrl} 
                                    alt={santri.namaLengkap} 
                                    className="w-full aspect-[3/4] object-cover block print:block print:visible opacity-100" 
                                    loading="eager" 
                                />
                            ) : (
                                <div 
                                    className="w-full aspect-[3/4] bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center print:border-gray-400 print:bg-gray-50"
                                    style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' as any }}
                                >
                                    <span className="text-xs text-gray-400 print:text-gray-500 font-medium tracking-wide">
                                        FOTO KOSONG
                                    </span>
                                </div>
                            )}
                            {isInactive && (
                                <div className="absolute inset-0 bg-black/35 flex items-end justify-center pb-4 pointer-events-none">
                                    <span className="text-[11px] font-bold text-white tracking-widest uppercase bg-orange-500/90 px-3 py-1 rounded">NONAKTIF</span>
                                </div>
                            )}
                            {canEdit && (
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-5">
                                    <button onClick={() => fotoInputRef.current?.click()}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/95 hover:bg-white text-slate-700 hover:text-teal-600 text-sm font-medium transition-all shadow-lg">
                                        <Camera size={14} /> Ganti Foto
                                    </button>
                                </div>
                            )}
                            {uploadingFoto && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                        <div className="p-4 text-center space-y-2">
                            <div>
                                <h2 className="text-base font-bold text-slate-800">{santri.namaLengkap}</h2>
                                <p className="text-xs text-slate-400 font-mono mt-0.5">NIS: {santri.nis}</p>
                            </div>
                            <div className="flex justify-center gap-1.5 flex-wrap">
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${santri.gender === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                    {santri.gender === 'L' ? 'Putra' : 'Putri'}
                                </span>
                                {santri.kelas && <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">{santri.kelas.nama}</span>}
                                {santri.kamar && <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-medium">Kamar {santri.kamar.nama}</span>}
                            </div>
                        </div>
                    </div>

                    {/* Orang Tua */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center"><Users size={15} className="text-orange-500" /></div>
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Orang Tua</h3>
                        </div>
                        <div className="space-y-1.5">
                            <InfoRow label="Nama Ayah" value={santri.namaAyah} />
                            <InfoRow label="No HP Ayah" value={santri.noHpAyah} />
                            <InfoRow label="Nama Ibu" value={santri.namaIbu} />
                            <InfoRow label="No HP Ibu" value={santri.noHpIbu} />
                        </div>
                    </div>

                    {/* Wali */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center"><UserIcon size={15} className="text-indigo-500" /></div>
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Wali</h3>
                        </div>
                        <div className="space-y-1.5">
                            <InfoRow label="Nama Wali" value={santri.namaWali} />
                            <InfoRow label="No HP Wali" value={santri.noHpWali} />
                            <InfoRow label="Keterangan" value={santri.deskripsiWali} />
                        </div>
                    </div>

                    {/* Khidmah */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-2.5 mb-4 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center"><ClipboardList size={15} className="text-teal-600" /></div>
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Khidmah</h3>
                            </div>
                            {canEdit && (
                                <button onClick={() => { setShowKhidmahAssign(true); setKhidmahAssignModelId(khidmahModels[0]?.id || ''); }}
                                    disabled={khidmahModels.length === 0}
                                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-teal-600 hover:bg-teal-50 rounded-lg transition disabled:opacity-40">
                                    <Plus size={12} /> Tambah
                                </button>
                            )}
                        </div>
                        {khidmahList.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-2">Belum ada khidmah</p>
                        ) : (
                            <div className="space-y-2">
                                {khidmahList.map(k => (
                                    <div key={k.id} className="flex items-center justify-between gap-2 group">
                                        <div className="flex-1 min-w-0">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-teal-100 text-teal-700">{k.modelKhidmah.nama}</span>
                                            {k.keterangan && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{k.keterangan}</p>}
                                        </div>
                                        {canEdit && (
                                            <button onClick={async () => { await api.delete(`/khidmah/data/${k.id}`); fetchKhidmah(); }}
                                                className="w-5 h-5 text-slate-300 hover:text-red-500 flex items-center justify-center transition opacity-0 group-hover:opacity-100 text-[10px]">✕</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Assign Khidmah Modal (inline) */}
                    {showKhidmahAssign && (
                        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowKhidmahAssign(false)}>
                            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-900">Assign Khidmah</h3>
                                    <button onClick={() => setShowKhidmahAssign(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Model Khidmah</label>
                                        <select value={khidmahAssignModelId} onChange={e => setKhidmahAssignModelId(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-teal-400">
                                            {khidmahModels.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Keterangan (opsional)</label>
                                        <input type="text" value={khidmahAssignKet} onChange={e => setKhidmahAssignKet(e.target.value)}
                                            placeholder="Misal: Pengajar Nahwu..."
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-teal-400" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setShowKhidmahAssign(false)} className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Batal</button>
                                    <button onClick={async () => {
                                        try {
                                            await api.post('/khidmah/data', { nis: santri.nis, modelKhidmahId: khidmahAssignModelId, keterangan: khidmahAssignKet || undefined });
                                            setShowKhidmahAssign(false); setKhidmahAssignKet('');
                                            fetchKhidmah();
                                        } catch (e: any) { alert(e.response?.data?.message || 'Gagal'); }
                                    }} disabled={!khidmahAssignModelId}
                                        className="flex-1 py-2 rounded-xl bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700 transition disabled:opacity-50">Simpan</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Right: Tabbed data cards ── */}
                <div className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        {/* Tab bar */}
                        <div className="flex border-b border-slate-100">
                            {(['detail', 'dokumen', 'nilai'] as Tab[]).map(tab => {
                                const labels: Record<Tab, string> = { detail: 'Data Pribadi', dokumen: 'Dokumen KK', nilai: 'Nilai' };
                                return (
                                    <button key={tab} onClick={() => setActiveTab(tab)}
                                        className={`flex-1 px-4 py-3 text-sm font-medium transition-all relative ${activeTab === tab ? 'text-teal-700' : 'text-slate-400 hover:text-slate-600'}`}>
                                        {labels[tab]}
                                        {activeTab === tab && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-teal-500 rounded-full" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* ── Tab: Data Pribadi ── */}
                        {activeTab === 'detail' && (
                            <div className="p-6 space-y-6">
                                <div>
                                    <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                                        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center"><UserIcon size={15} className="text-teal-600" /></div>
                                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Data Pribadi</h3>
                                    </div>
                                    <div className="space-y-1.5">
                                        <InfoRow label="Tempat Lahir" value={santri.tempatLahir} />
                                        <InfoRow label="Tanggal Lahir" value={fmt(santri.tanggalLahir)} />
                                        <InfoRow label="Umur" value={calcAge(santri.tanggalLahir)} />
                                        <InfoRow label="No HP" value={santri.noHp} />
                                        <InfoRow label="NIK" value={santri.nik} />
                                        <InfoRow label="No KK" value={santri.noKk} />
                                        <InfoRow label="Jenjang Pendidikan" value={santri.jenjangPendidikan} />
                                        <InfoRow label="Jalur Pendidikan" value={santri.jalurPendidikan ? JALUR_LABEL[santri.jalurPendidikan] : undefined} />
                                        <InfoRow label="Tanggal Masuk" value={fmt(santri.tanggalMasuk)} />
                                        {santri.tanggalKeluar && <InfoRow label="Tanggal Keluar" value={fmt(santri.tanggalKeluar)} />}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><MapPin size={15} className="text-blue-600" /></div>
                                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Alamat</h3>
                                    </div>
                                    {alamatParts.length > 0
                                        ? <p className="text-sm text-slate-700 leading-relaxed">{alamatParts.join(', ')}</p>
                                        : <p className="text-sm text-slate-300">Belum diisi</p>}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                                        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center"><GraduationCap size={15} className="text-violet-600" /></div>
                                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Penempatan</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Kelas</p>
                                            <p className="text-sm font-bold text-blue-800 mt-1">{santri.kelas?.nama ?? '—'}</p>
                                            {santri.kelas?.tingkat && <p className="text-[10px] text-blue-400 mt-0.5">{santri.kelas.tingkat.jenjang?.nama} › {santri.kelas.tingkat.nama}</p>}
                                        </div>
                                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Kamar</p>
                                            <p className="text-sm font-bold text-emerald-800 mt-1">{santri.kamar?.nama ?? '—'}</p>
                                            {santri.kamar?.gedung && <p className="text-[10px] text-emerald-400 mt-0.5">{santri.kamar.gedung.kompleks?.nama} › {santri.kamar.gedung.nama}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Tab: Dokumen KK ── */}
                        {activeTab === 'dokumen' && (
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><FileText size={15} className="text-blue-600" /></div>
                                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">File Kartu Keluarga (KK)</h3>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                                    {[
                                        { slot: 1, preview: kkPreview, field: 'kkFileUrl' },
                                        { slot: 2, preview: kkPreview2, field: 'kkFileUrl2' }
                                    ].map(({ slot, preview, field }) => (
                                        <div key={slot} className="border border-slate-200 rounded-xl p-4 bg-white relative">
                                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                                                <h4 className="text-sm font-semibold text-slate-800">Dokumen {slot}</h4>
                                                {canEdit && (
                                                    <button onClick={() => triggerKKUpload(slot as 1 | 2)} disabled={uploadingKK === slot}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-[11px] font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-50">
                                                        <Upload size={12} />{uploadingKK === slot ? 'Loading...' : preview ? 'Ganti' : 'Upload'}
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {preview ? (
                                                <div>
                                                    {preview.type === 'pdf' && (
                                                        <div className="rounded-xl overflow-hidden border border-slate-200">
                                                            <iframe src={preview.url} className="w-full h-[400px]" title={`Preview KK ${slot}`} />
                                                        </div>
                                                    )}
                                                    {['jpg', 'jpeg', 'png', 'webp'].includes(preview.type) && (
                                                        <div className="rounded-xl overflow-hidden border border-slate-200 h-[400px] flex items-center justify-center bg-slate-50 relative group">
                                                            <img src={preview.url} alt={`KK ${slot}`} className="max-w-full max-h-full object-contain" />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                                <a href={preview.url} download className="pointer-events-auto px-4 py-2 bg-white rounded-lg text-sm font-semibold text-slate-800 shadow-lg hover:bg-slate-50 flex items-center gap-2">
                                                                    <Download size={16} /> Download
                                                                </a>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {['doc', 'docx'].includes(preview.type) && (
                                                        <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                                                            <div className="w-12 h-14 bg-blue-100 rounded-lg flex items-center justify-center shrink-0"><FileText size={24} className="text-blue-500" /></div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-slate-800 truncate">{preview.name}</p>
                                                            </div>
                                                            <a href={preview.url} download className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors">Download</a>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center justify-between mt-3">
                                                        <p className="text-[10px] text-slate-400 truncate pr-4">{preview.name}</p>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {['jpg', 'jpeg', 'png', 'webp'].includes(preview.type) && (
                                                            <a href={preview.url} download className="text-[11px] text-teal-600 hover:underline flex items-center gap-1"><Download size={11}/> Unduh</a>
                                                            )}
                                                            <a href={preview.url} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 hover:underline">Buka tab</a>
                                                            {canEdit && (
                                                                <button onClick={async () => { 
                                                                    await api.put(`/santri/${santri.id}`, { [field]: null }); 
                                                                    if (slot === 1) setKkPreview(null); else setKkPreview2(null); 
                                                                    fetchSantri(); 
                                                                }}
                                                                    className="text-[11px] text-red-500 hover:text-red-700 flex items-center gap-1">
                                                                    <X size={11} /> Hapus
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div onClick={() => canEdit && triggerKKUpload(slot as 1 | 2)}
                                                    className={`flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-slate-200 rounded-xl ${canEdit ? 'cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition-colors' : ''}`}>
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2"><FileText size={20} className="text-slate-400" /></div>
                                                    <p className="text-sm text-slate-400 font-medium">Belum ada dokumen {slot}</p>
                                                    {canEdit && <p className="text-xs text-slate-300 mt-1">Klik untuk upload</p>}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Tab: Nilai ── */}
                        {activeTab === 'nilai' && (
                            <div className="p-6">
                                <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100">
                                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center"><BookOpen size={15} className="text-amber-600" /></div>
                                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Nilai</h3>
                                </div>
                                {loadingNilai ? (
                                    <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Memuat nilai...</div>
                                ) : nilai.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3"><BookOpen size={20} className="text-slate-400" /></div>
                                        <p className="text-sm text-slate-400">Belum ada data nilai</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left font-semibold text-slate-500">Mata Pelajaran</th>
                                                    <th className="px-4 py-2.5 text-left font-semibold text-slate-500">Semester</th>
                                                    <th className="px-4 py-2.5 text-center font-semibold text-slate-500">Harian</th>
                                                    <th className="px-4 py-2.5 text-center font-semibold text-slate-500">UTS</th>
                                                    <th className="px-4 py-2.5 text-center font-semibold text-slate-500">UAS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {nilai.map((n: any) => (
                                                    <tr key={n.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                                                        <td className="px-4 py-2.5 font-medium text-slate-800">{n.mataPelajaran}</td>
                                                        <td className="px-4 py-2.5 text-slate-500">{n.semester}</td>
                                                        <td className="px-4 py-2.5 text-center text-slate-700">{n.nilaiHarian ?? '—'}</td>
                                                        <td className="px-4 py-2.5 text-center text-slate-700">{n.nilaiUTS ?? '—'}</td>
                                                        <td className="px-4 py-2.5 text-center text-slate-700">{n.nilaiUAS ?? '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── QR Modal ── */}
            {showQr && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm" onClick={() => setShowQr(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between w-full">
                            <h3 className="text-sm font-bold text-slate-800">QR Code Santri</h3>
                            <button onClick={() => setShowQr(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} className="text-slate-500" /></button>
                        </div>
                        {qrDataUrl ? (
                            <>
                                <div className="p-3 bg-white border-2 border-teal-100 rounded-xl">
                                    <img src={qrDataUrl} alt="QR Code" className="w-52 h-52" />
                                </div>
                                <p className="text-[10px] text-slate-400 text-center">Scan untuk melihat profil publik {santri?.namaLengkap}</p>
                                <div className="flex gap-2 w-full">
                                    <a href={qrDataUrl} download={`qr-${santri?.nis}.png`}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg transition-colors">
                                        <Download size={13} /> PNG
                                    </a>
                                    <button onClick={() => { const w = window.open(''); w?.document.write(`<img src="${qrDataUrl}" style="width:300px"/><p style="text-align:center;font-family:sans-serif;font-size:12px">${santri?.namaLengkap} — ${santri?.nis}</p>`); w?.print(); }}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors">
                                        <Printer size={13} /> Cetak
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="w-52 h-52 flex items-center justify-center">
                                <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Add User Modal ── */}
            {showUserModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm" onClick={() => setShowUserModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">Buat Akun Login User</h3>
                            <button onClick={() => setShowUserModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} className="text-slate-500" /></button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            {userError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">{userError}</div>}

                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-1 mb-2">
                                <p className="text-sm font-semibold text-blue-900">{santri.namaLengkap}</p>
                                <p className="text-xs text-blue-700">NIS: {santri.nis}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Otoritas (Role)</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {[
                                        { value: 'STAF_PENDATAAN', label: 'Staf Pendataan' },
                                        { value: 'STAF_MADRASAH', label: 'Staf Madrasah' },
                                        { value: 'PEMBIMBING_KAMAR', label: 'Pembimbing Kamar' },
                                        { value: 'WALI_KELAS', label: 'Wali Kelas' },
                                        { value: 'ADMIN', label: 'Administrator' }
                                    ].map(r => (
                                        <label key={r.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${userRoles.includes(r.value) ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                            <input 
                                                type="checkbox" 
                                                value={r.value}
                                                checked={userRoles.includes(r.value)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setUserRoles([...userRoles, r.value]);
                                                    else setUserRoles(userRoles.filter(v => v !== r.value));
                                                }}
                                                className="w-4 h-4 mt-0.5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer" 
                                            />
                                            <span className={`text-sm tracking-wide ${userRoles.includes(r.value) ? 'font-bold text-emerald-800' : 'font-medium text-gray-700'}`}>{r.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Password</label>
                                <input type="password" value={userPassword} onChange={e => setUserPassword(e.target.value)} required minLength={6}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Minimal 6 karakter" />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Konfirmasi Password</label>
                                <input type="password" value={userPasswordConfirm} onChange={e => setUserPasswordConfirm(e.target.value)} required minLength={6}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Ketik ulang password" />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Batal</button>
                                <button type="submit" disabled={submittingUser} className="flex-1 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-70 transition-colors shadow-sm">
                                    {submittingUser ? 'Menyimpan...' : 'Buat Akun'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Success Modal ── */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm" onClick={() => setShowSuccessModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 flex flex-col items-center gap-4 text-center transform transition-all" onClick={e => e.stopPropagation()}>
                        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mt-2">
                            <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Berhasil!</h3>
                            <p className="text-sm text-slate-500 mt-1">{successMessage}</p>
                        </div>
                        <button onClick={() => setShowSuccessModal(false)} className="w-full mt-2 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors shadow-sm">
                            Tutup
                        </button>
                    </div>
                </div>
            )}

            {/* ── Print Sidebar ── */}
            <PrintSidebar
                isOpen={showPrintSidebar}
                onClose={() => setShowPrintSidebar(false)}
                title="Cetak Biodata"
                subtitle={santri ? `${santri.namaLengkap} — NIS: ${santri.nis}` : ''}
                pdfEndpoint="/pdf/biodata"
                requestBody={{ santriId: santri?.id, qrFields: ['qr_data', 'qr_nis'] }}
                filenamePrefix={`biodata_${santri?.nis || 'santri'}`}
            />
        </div>
    );
}

