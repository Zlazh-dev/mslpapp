import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { User, Users, MapPin, GraduationCap } from 'lucide-react';

const BACKEND = import.meta.env.VITE_API_URL || '';
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

export default function SantriPublicPage() {
    const { id } = useParams();
    const [santri, setSantri] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState('');

    useEffect(() => {
        if (!id) return;
        fetch(`${BACKEND}/santri/public/${id}`)
            .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
            .then(r => setSantri(r.data))
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (!id) return;
        QRCode.toDataURL(`${window.location.origin}/p/santri/${id}`, {
            width: 160, margin: 2, color: { dark: '#0f766e', light: '#fff' }
        }).then(setQrDataUrl);
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full" />
        </div>
    );

    if (notFound || !santri) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-400">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium">Santri tidak ditemukan</p>
        </div>
    );

    const fotoUrl = santri.foto ? `${BACKEND}${santri.foto}` : null;
    const initial = santri.namaLengkap?.charAt(0)?.toUpperCase() ?? '?';
    const isInactive = santri.status === 'INACTIVE';
    const alamatParts = [santri.jalan, santri.rtRw && `RT/RW ${santri.rtRw}`, santri.kelurahan, santri.kecamatan, santri.kotaKabupaten, santri.provinsi].filter(Boolean);

    return (
        <div className="min-h-screen bg-slate-100">
            {/* ── Top Header ── */}
            <div className="bg-gradient-to-r from-teal-700 to-emerald-700 text-white px-6 py-4 flex items-center gap-3">
                <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain opacity-90" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div>
                    <p className="text-xs text-teal-100">Profil Santri · Publik</p>
                    <h1 className="text-base font-bold leading-tight">MSLPAPP</h1>
                </div>
            </div>

            {/* ── Main Content ── */}
            <div className="max-w-5xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">

                    {/* ── Left: Photo + QR + Parent sections ── */}
                    <div className="space-y-5">
                        {/* Photo Card */}
                        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                            <div className="relative">
                                {fotoUrl ? (
                                    <img src={fotoUrl} alt={santri.namaLengkap} className="w-full aspect-[3/4] object-cover" />
                                ) : (
                                    <div className="w-full aspect-[3/4] bg-gradient-to-br from-teal-400 via-teal-500 to-emerald-600 flex items-center justify-center">
                                        <span className="text-white/90 text-7xl font-bold select-none">{initial}</span>
                                    </div>
                                )}
                                {isInactive && (
                                    <div className="absolute inset-0 bg-black/35 flex items-end justify-center pb-4 pointer-events-none">
                                        <span className="text-[11px] font-bold text-white tracking-widest uppercase bg-orange-500/90 px-3 py-1 rounded">NONAKTIF</span>
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
                                {/* QR Code */}
                                {qrDataUrl && (
                                    <div className="pt-3 flex flex-col items-center gap-1">
                                        <div className="p-2 bg-white border border-teal-100 rounded-xl inline-block">
                                            <img src={qrDataUrl} alt="QR Code" className="w-28 h-28" />
                                        </div>
                                        <p className="text-[10px] text-slate-400">Scan untuk profil publik</p>
                                    </div>
                                )}
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
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center"><User size={15} className="text-indigo-500" /></div>
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Wali</h3>
                            </div>
                            <div className="space-y-1.5">
                                <InfoRow label="Nama Wali" value={santri.namaWali} />
                                <InfoRow label="No HP Wali" value={santri.noHpWali} />
                                <InfoRow label="Keterangan" value={santri.deskripsiWali} />
                            </div>
                        </div>
                    </div>

                    {/* ── Right: Data sections ── */}
                    <div className="space-y-5">
                        {/* Data Pribadi */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center"><User size={15} className="text-teal-600" /></div>
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Data Pribadi</h3>
                            </div>
                            <div className="space-y-1.5">
                                <InfoRow label="Nama Lengkap" value={santri.namaLengkap} />
                                <InfoRow label="NIS" value={<span className="font-mono">{santri.nis}</span>} />
                                <InfoRow label="Jenis Kelamin" value={santri.gender === 'L' ? 'Laki-laki' : 'Perempuan'} />
                                <InfoRow label="Tempat Lahir" value={santri.tempatLahir} />
                                <InfoRow label="Tanggal Lahir" value={fmt(santri.tanggalLahir)} />
                                <InfoRow label="Umur" value={calcAge(santri.tanggalLahir)} />
                                <InfoRow label="No HP" value={santri.noHp} />
                                <InfoRow label="Jenjang Pendidikan" value={santri.jenjangPendidikan} />
                                <InfoRow label="Jalur Pendidikan" value={santri.jalurPendidikan ? JALUR_LABEL[santri.jalurPendidikan] : undefined} />
                                <InfoRow label="Tanggal Masuk" value={fmt(santri.tanggalMasuk)} />
                                {santri.tanggalKeluar && <InfoRow label="Tanggal Keluar" value={fmt(santri.tanggalKeluar)} />}
                            </div>
                        </div>

                        {/* Alamat */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><MapPin size={15} className="text-blue-600" /></div>
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Alamat</h3>
                            </div>
                            {alamatParts.length > 0
                                ? <p className="text-sm text-slate-700 leading-relaxed">{alamatParts.join(', ')}</p>
                                : <p className="text-sm text-slate-300">Belum diisi</p>}
                        </div>

                        {/* Penempatan */}
                        {(santri.kelas || santri.kamar) && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
                        )}

                        <p className="text-center text-[10px] text-slate-300 pb-2">Data ini bersifat publik · MSLPAPP</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
