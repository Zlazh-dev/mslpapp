import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../lib/api';
import { ChevronDown, Info, ArrowLeft, Save } from 'lucide-react';

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const schema = z.object({
    nis: z.string().min(1, 'NIS wajib diisi'),
    namaLengkap: z.string().min(1, 'Nama lengkap wajib diisi'),
    gender: z.enum(['L', 'P']).optional().or(z.literal('')),
    tanggalLahir: z.string().optional().or(z.literal('')),
    tempatLahir: z.string().optional().or(z.literal('')),
    noHp: z.string().optional().or(z.literal('')),
    nik: z.string().optional().or(z.literal('')),
    noKk: z.string().optional().or(z.literal('')),
    tanggalMasuk: z.string().optional().or(z.literal('')),
    tanggalKeluar: z.string().optional().or(z.literal('')),
    // Ortu
    namaAyah: z.string().optional().or(z.literal('')),
    namaIbu: z.string().optional().or(z.literal('')),
    noHpAyah: z.string().optional().or(z.literal('')),
    noHpIbu: z.string().optional().or(z.literal('')),
    // Wali
    namaWali: z.string().optional().or(z.literal('')),
    noHpWali: z.string().optional().or(z.literal('')),
    deskripsiWali: z.string().optional().or(z.literal('')),
    // Alamat
    provinsi: z.string().optional().or(z.literal('')),
    kotaKabupaten: z.string().optional().or(z.literal('')),
    kecamatan: z.string().optional().or(z.literal('')),
    kelurahan: z.string().optional().or(z.literal('')),
    jalan: z.string().optional().or(z.literal('')),
    rtRw: z.string().optional().or(z.literal('')),
    // Jalur
    jalurPendidikan: z.enum(['FORMAL', 'TAHFIDZ', 'MAHAD_ALY']).optional().or(z.literal('')),
}).refine(data => {
    if (data.tanggalKeluar && data.tanggalMasuk) {
        return new Date(data.tanggalKeluar) > new Date(data.tanggalMasuk);
    }
    return true;
}, { message: 'Tanggal keluar harus setelah tanggal masuk', path: ['tanggalKeluar'] })
    .refine(data => {
        if (!data.tanggalLahir) return true;
        const dob = new Date(data.tanggalLahir);
        const tenYearsAgo = new Date();
        tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
        return dob <= tenYearsAgo;
    }, { message: 'Calon santri minimal harus berusia 10 tahun', path: ['tanggalLahir'] });

type FormData = z.infer<typeof schema>;

// ─── Accordion Section ────────────────────────────────────────────────────────
function AccordionSection({ title, badge, defaultOpen = false, children }: {
    title: string; badge?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="card overflow-hidden p-0">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{title}</span>
                    {badge && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{badge}</span>}
                </div>
                <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && <div className="px-5 pb-5 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100">{children}</div>}
        </div>
    );
}

// ─── Form Field ───────────────────────────────────────────────────────────────
function FormField({ label, error, required, children, hint, fullWidth }: {
    label: string; error?: string; required?: boolean; children: React.ReactNode; hint?: string; fullWidth?: boolean;
}) {
    return (
        <div className={fullWidth ? 'sm:col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {hint && <p className="mt-1 text-xs text-gray-500 flex items-center gap-1"><Info size={12} className="text-amber-500" />{hint}</p>}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SantriFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [saving, setSaving] = useState(false);
    const [generatingNis, setGeneratingNis] = useState(false);

    // Modal state
    const [modal, setModal] = useState<{ show: boolean, title: string, message: string }>({ show: false, title: '', message: '' });

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { gender: undefined },
    });

    const tanggalKeluar = watch('tanggalKeluar');
    const tanggalMasuk = watch('tanggalMasuk');

    const handleGenerateNis = async () => {
        setGeneratingNis(true);
        try {
            const params = tanggalMasuk ? { date: tanggalMasuk } : {};
            const res = await api.get('/santri/generate-nis', { params });
            if (res.data?.data) {
                setValue('nis', res.data.data, { shouldValidate: true });
            }
        } catch (e: any) {
            setModal({ show: true, title: 'Gagal', message: 'Gagal generate NIS otomatis dari server.' });
        } finally {
            setGeneratingNis(false);
        }
    };

    useEffect(() => {
        if (isEdit) {
            api.get(`/santri/${id}`).then(r => {
                const s = r.data.data;
                reset({
                    nis: s.nis ?? '',
                    namaLengkap: s.namaLengkap ?? '',
                    gender: s.gender,
                    tanggalLahir: s.tanggalLahir ? s.tanggalLahir.split('T')[0] : '',
                    tempatLahir: s.tempatLahir ?? '',
                    noHp: s.noHp ?? '',
                    nik: s.nik ?? '',
                    noKk: s.noKk ?? '',
                    tanggalMasuk: s.tanggalMasuk ? s.tanggalMasuk.split('T')[0] : '',
                    tanggalKeluar: s.tanggalKeluar ? s.tanggalKeluar.split('T')[0] : '',
                    jalurPendidikan: s.jalurPendidikan ?? '',
                    namaAyah: s.namaAyah ?? '',
                    namaIbu: s.namaIbu ?? '',
                    noHpAyah: s.noHpAyah ?? '',
                    noHpIbu: s.noHpIbu ?? '',
                    namaWali: s.namaWali ?? '',
                    noHpWali: s.noHpWali ?? '',
                    deskripsiWali: s.deskripsiWali ?? '',
                    provinsi: s.provinsi ?? '',
                    kotaKabupaten: s.kotaKabupaten ?? '',
                    kecamatan: s.kecamatan ?? '',
                    kelurahan: s.kelurahan ?? '',
                    jalan: s.jalan ?? '',
                    rtRw: s.rtRw ?? '',
                });
            });
        }
    }, [id, isEdit, reset]);

    const onSubmit = async (formData: FormData) => {
        setSaving(true);
        try {
            const payload: any = { ...formData };
            // Convert empty strings to null/undefined
            ['gender', 'tempatLahir', 'tanggalLahir', 'noHp', 'nik', 'noKk', 'tanggalMasuk', 'tanggalKeluar', 'jalurPendidikan',
                'namaAyah', 'namaIbu', 'noHpAyah', 'noHpIbu', 'namaWali', 'noHpWali', 'deskripsiWali',
                'provinsi', 'kotaKabupaten', 'kecamatan', 'kelurahan', 'jalan', 'rtRw'].forEach(k => {
                    if (payload[k] === '') payload[k] = isEdit ? null : undefined;
                });

            if (isEdit) {
                await api.put(`/santri/${id}`, payload);
            } else {
                await api.post('/santri', payload);
            }
            navigate('/santri');
        } catch (e: any) {
            let errorMsg = e.response?.data?.message || 'Terjadi kesalahan sistem saat menyimpan data. Silakan coba lagi.';
            if (Array.isArray(errorMsg)) {
                errorMsg = errorMsg.join(', ');
            }
            // Translating common system messages
            if (errorMsg.includes('must be a valid ISO 8601') || errorMsg.includes('must be one of the following')) {
                errorMsg = 'Format data yang diisi tidak sesuai, atau belum lengkap.';
            }
            setModal({ show: true, title: 'Gagal Menyimpan', message: errorMsg });
        } finally {
            setSaving(false);
        }
    };

    const onError = (errors: any) => {
        const firstErrorKey = Object.keys(errors)[0];
        let msg = errors[firstErrorKey]?.message;
        if (!msg) {
            const keyLabel = firstErrorKey.charAt(0).toUpperCase() + firstErrorKey.slice(1);
            msg = `${keyLabel} belum diisi dengan benar.`;
        }
        setModal({ show: true, title: 'Data Tidak Valid', message: msg });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 flex-wrap">
                <button type="button" onClick={() => navigate('/santri')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Santri' : 'Tambah Santri Baru'}</h1>
                    <p className="text-sm text-gray-500">Lengkapi data santri di bawah ini</p>
                </div>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                    <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
            </div>

            {/* Error Modal */}
            {modal.show && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm" onClick={() => setModal({ ...modal, show: false })}>
                    <div className="bg-white rounded-2xl shadow-xl w-80 p-6 flex flex-col items-center gap-3 text-center transform transition-all" onClick={e => e.stopPropagation()}>
                        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mt-2">
                            <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{modal.title}</h3>
                            <p className="text-sm text-slate-500 mt-1">{modal.message}</p>
                        </div>
                        <button type="button" onClick={() => setModal({ ...modal, show: false })} className="w-full mt-3 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm">
                            Mengerti
                        </button>
                    </div>
                </div>
            )}

            {/* Section 1: Data Pribadi */}
            <AccordionSection title="1. Data Pribadi" badge="Wajib" defaultOpen>
                <FormField label="NIS" error={errors.nis?.message} required>
                    <div className="flex gap-2">
                        <input {...register('nis')} className="form-input flex-1" placeholder="Nomor Induk Santri" disabled={isEdit} />
                        {!isEdit && (
                            <button type="button" onClick={handleGenerateNis} disabled={generatingNis}
                                className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-sm font-semibold transition whitespace-nowrap disabled:opacity-50">
                                {generatingNis ? '...' : 'Auto Generate'}
                            </button>
                        )}
                    </div>
                </FormField>
                <FormField label="Nama Lengkap" error={errors.namaLengkap?.message} required>
                    <input {...register('namaLengkap')} className="form-input" placeholder="Nama lengkap santri" />
                </FormField>
                <FormField label="Jenis Kelamin" error={(errors as any).gender?.message}>
                    <select {...register('gender' as any)} className="form-input">
                        <option value="">Pilih gender</option>
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                    </select>
                </FormField>
                <FormField label="Tempat Lahir" error={errors.tempatLahir?.message}>
                    <input {...register('tempatLahir')} className="form-input" placeholder="Kota tempat lahir" />
                </FormField>
                <FormField label="Tanggal Lahir" error={errors.tanggalLahir?.message}>
                    <input {...register('tanggalLahir')} type="date" className="form-input" />
                </FormField>
                <FormField label="No HP" error={errors.noHp?.message}>
                    <input {...register('noHp')} className="form-input" placeholder="08xxxxxxxxxx" />
                </FormField>
                <FormField label="NIK" error={errors.nik?.message}>
                    <input {...register('nik')} className="form-input" placeholder="16 digit NIK" />
                </FormField>
                <FormField label="No KK" error={errors.noKk?.message}>
                    <input {...register('noKk')} className="form-input" placeholder="16 digit No KK" />
                </FormField>
                <FormField label="Jalur Pendidikan" error={(errors as any).jalurPendidikan?.message}>
                    <select {...register('jalurPendidikan' as any)} className="form-input">
                        <option value="">Pilih jalur</option>
                        <option value="FORMAL">Formal</option>
                        <option value="TAHFIDZ">Tahfidz</option>
                        <option value="MAHAD_ALY">Ma'had Aly</option>
                    </select>
                </FormField>
                <FormField label="Tanggal Masuk" error={errors.tanggalMasuk?.message}>
                    <input {...register('tanggalMasuk')} type="date" className="form-input" />
                </FormField>
                <FormField
                    label="Tanggal Keluar"
                    error={errors.tanggalKeluar?.message}
                    hint="Jika diisi, santri akan otomatis dinonaktifkan"
                >
                    <input {...register('tanggalKeluar')} type="date" className="form-input" />
                </FormField>
                {tanggalKeluar && (
                    <div className="sm:col-span-2">
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-700 text-xs">
                            <Info size={14} className="shrink-0" />
                            Status santri akan otomatis menjadi <strong>Nonaktif</strong> karena tanggal keluar telah diisi.
                        </div>
                    </div>
                )}
            </AccordionSection>

            {/* Section 2: Data Orang Tua */}
            <AccordionSection title="2. Data Orang Tua">
                <FormField label="Nama Ayah" error={errors.namaAyah?.message}>
                    <input {...register('namaAyah')} className="form-input" placeholder="Nama ayah kandung" />
                </FormField>
                <FormField label="No HP Ayah" error={errors.noHpAyah?.message}>
                    <input {...register('noHpAyah')} className="form-input" placeholder="08xxxxxxxxxx" />
                </FormField>
                <FormField label="Nama Ibu" error={errors.namaIbu?.message}>
                    <input {...register('namaIbu')} className="form-input" placeholder="Nama ibu kandung" />
                </FormField>
                <FormField label="No HP Ibu" error={errors.noHpIbu?.message}>
                    <input {...register('noHpIbu')} className="form-input" placeholder="08xxxxxxxxxx" />
                </FormField>
            </AccordionSection>

            {/* Section 3: Data Wali */}
            <AccordionSection title="3. Data Wali">
                <FormField label="Nama Wali" error={errors.namaWali?.message}>
                    <input {...register('namaWali')} className="form-input" placeholder="Nama wali santri" />
                </FormField>
                <FormField label="No HP Wali" error={errors.noHpWali?.message}>
                    <input {...register('noHpWali')} className="form-input" placeholder="08xxxxxxxxxx" />
                </FormField>
                <FormField label="Keterangan Wali" error={errors.deskripsiWali?.message}>
                    <input {...register('deskripsiWali')} className="form-input" placeholder="cth: Ayah, Ibu, Paman, Bibi..." />
                </FormField>
            </AccordionSection>

            {/* Section 4: Alamat */}
            <AccordionSection title="4. Alamat">
                <FormField label="Provinsi" error={errors.provinsi?.message}>
                    <input {...register('provinsi')} className="form-input" placeholder="Provinsi" />
                </FormField>
                <FormField label="Kota / Kabupaten" error={errors.kotaKabupaten?.message}>
                    <input {...register('kotaKabupaten')} className="form-input" placeholder="Kota atau Kabupaten" />
                </FormField>
                <FormField label="Kecamatan" error={errors.kecamatan?.message}>
                    <input {...register('kecamatan')} className="form-input" placeholder="Kecamatan" />
                </FormField>
                <FormField label="Kelurahan / Desa" error={errors.kelurahan?.message}>
                    <input {...register('kelurahan')} className="form-input" placeholder="Kelurahan atau Desa" />
                </FormField>
                <FormField label="Jalan" error={errors.jalan?.message}>
                    <input {...register('jalan')} className="form-input" placeholder="Nama jalan dan nomor rumah" />
                </FormField>
                <FormField label="RT / RW" error={errors.rtRw?.message}>
                    <input {...register('rtRw')} className="form-input" placeholder="cth: 001/002" />
                </FormField>
            </AccordionSection>

        </form>
    );
}
