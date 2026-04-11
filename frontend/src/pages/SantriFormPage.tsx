import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../lib/api';
import { ChevronDown, Info, ArrowLeft, Save, UploadCloud, CheckCircle, FileText, Image as ImageIcon, ChevronRight } from 'lucide-react';
import AddressAutocomplete from '../components/AddressAutocomplete';

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

const WIZARD_STEPS = [
    { id: 1, title: 'Data Pribadi', fields: ['nis', 'namaLengkap', 'gender', 'tempatLahir', 'tanggalLahir', 'noHp', 'nik', 'noKk', 'jalurPendidikan', 'tanggalMasuk', 'tanggalKeluar'] },
    { id: 2, title: 'Orang Tua', fields: ['namaAyah', 'noHpAyah', 'namaIbu', 'noHpIbu'] },
    { id: 3, title: 'Wali', fields: ['namaWali', 'noHpWali', 'deskripsiWali'] },
    { id: 4, title: 'Alamat', fields: ['provinsi', 'kotaKabupaten', 'kecamatan', 'kelurahan', 'jalan', 'rtRw'] },
    { id: 5, title: 'Upload Dokumen', fields: [] },
];

// ─── Accordion Section ────────────────────────────────────────────────────────
function AccordionSection({ title, badge, defaultOpen = false, children }: {
    title: string; badge?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="card overflow-hidden p-0 mb-4">
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

    // Wizard state
    const [currentStep, setCurrentStep] = useState(1);
    const [fotoFile, setFotoFile] = useState<File | null>(null);
    const [kkFile, setKkFile] = useState<File | null>(null);
    const [kkFile2, setKkFile2] = useState<File | null>(null);
    const fotoFileInputRef = useRef<HTMLInputElement>(null);
    const kkFileInputRef = useRef<HTMLInputElement>(null);
    const kkFileInputRef2 = useRef<HTMLInputElement>(null);

    // Modal state
    const [modal, setModal] = useState<{ show: boolean, title: string, message: string }>({ show: false, title: '', message: '' });

    const { register, handleSubmit, reset, watch, setValue, trigger, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { gender: undefined },
        mode: 'onChange'
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

    const uploadFile = async (file: File, endpoint: string) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post(`/upload/${endpoint}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return res.data.url;
    };

    const onSubmit = async (formData: FormData) => {
        // Guard: in wizard mode, only allow submission from step 5
        if (!isEdit && currentStep < 5) {
            return;
        }
        setSaving(true);
        try {
            const payload: any = { ...formData };

            // Format empty strings to undefined/null
            ['gender', 'tempatLahir', 'tanggalLahir', 'noHp', 'nik', 'noKk', 'tanggalMasuk', 'tanggalKeluar', 'jalurPendidikan',
                'namaAyah', 'namaIbu', 'noHpAyah', 'noHpIbu', 'namaWali', 'noHpWali', 'deskripsiWali',
                'provinsi', 'kotaKabupaten', 'kecamatan', 'kelurahan', 'jalan', 'rtRw'].forEach(k => {
                    if (payload[k] === '') payload[k] = isEdit ? null : undefined;
                });

            // Upload files if in wizard mode
            if (!isEdit) {
                if (fotoFile) {
                    payload.foto = await uploadFile(fotoFile, 'foto');
                }
                if (kkFile) {
                    payload.kkFileUrl = await uploadFile(kkFile, 'kk');
                }
                if (kkFile2) {
                    payload.kkFileUrl2 = await uploadFile(kkFile2, 'kk');
                }
            }

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
            if (errorMsg.includes('must be a valid ISO 8601') || errorMsg.includes('must be one of the following')) {
                errorMsg = 'Format data yang diisi tidak sesuai, atau belum lengkap.';
            }
            setModal({ show: true, title: 'Gagal Menyimpan', message: errorMsg });
            setSaving(false);
        }
    };

    const handleNextStep = async () => {
        const currentFields = WIZARD_STEPS[currentStep - 1].fields as any[];
        const isStepValid = await trigger(currentFields);
        if (isStepValid) {
            setCurrentStep(s => Math.min(5, s + 1));
        } else {
            console.log('Validation failed', errors);
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === 'Enter') {
            // In wizard mode (not edit), block ALL Enter-based form submissions
            // until the user reaches step 5. Step navigation should only happen
            // via the explicit "Lanjutkan" button click.
            if (!isEdit && currentStep < 5) {
                e.preventDefault();
                return;
            }
            // In edit mode or step 5, prevent Enter on regular inputs from submitting
            if (e.target instanceof HTMLInputElement) {
                if (e.target.type === 'file' || e.target.type === 'submit' || e.target.type === 'button') return;
                e.preventDefault();
            }
        }
    };

    // Form fields components to reuse
    const renderDataPribadi = () => (
        <>
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
                hint="Jika diisi, status santri akan otomatis dinonaktifkan"
            >
                <input {...register('tanggalKeluar')} type="date" className="form-input" />
            </FormField>
            {tanggalKeluar && (
                <div className="sm:col-span-2">
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-700 text-xs shadow-sm">
                        <Info size={14} className="shrink-0" />
                        Status santri akan otomatis menjadi <strong>Nonaktif</strong> karena tanggal keluar diisi.
                    </div>
                </div>
            )}
        </>
    );

    const renderDataOrtu = () => (
        <>
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
        </>
    );

    const renderDataWali = () => (
        <>
            <FormField label="Nama Wali" error={errors.namaWali?.message}>
                <input {...register('namaWali')} className="form-input" placeholder="Nama wali santri" />
            </FormField>
            <FormField label="No HP Wali" error={errors.noHpWali?.message}>
                <input {...register('noHpWali')} className="form-input" placeholder="08xxxxxxxxxx" />
            </FormField>
            <FormField label="Keterangan Wali" error={errors.deskripsiWali?.message} fullWidth>
                <input {...register('deskripsiWali')} className="form-input" placeholder="cth: Ayah, Ibu, Paman, Bibi..." />
            </FormField>
        </>
    );

    const renderAlamat = () => (
        <>
            <AddressAutocomplete
                provinsi={watch('provinsi') || ''}
                kotaKabupaten={watch('kotaKabupaten') || ''}
                kecamatan={watch('kecamatan') || ''}
                kelurahan={watch('kelurahan') || ''}
                onChange={(field, value) => setValue(field, value, { shouldValidate: true })}
            />
            <FormField label="Jalan" error={errors.jalan?.message} fullWidth>
                <input {...register('jalan')} className="form-input" placeholder="Nama jalan dan nomor rumah" />
            </FormField>
            <FormField label="RT / RW" error={errors.rtRw?.message}>
                <input {...register('rtRw')} className="form-input" placeholder="cth: 001/002" />
            </FormField>
        </>
    );

    const renderUploads = () => (
        <div className="col-span-1 sm:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Foto Profil Upload */}
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition duration-150 relative">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4 overflow-hidden shadow-inner">
                    {fotoFile ? <img src={URL.createObjectURL(fotoFile)} alt="Preview" className="w-full h-full object-cover" /> : <ImageIcon size={28} className="text-emerald-600" />}
                </div>
                <h3 className="text-sm font-bold text-gray-800 mb-1">Foto Profil Santri</h3>
                <p className="text-xs text-gray-400 text-center mb-4 max-w-[200px]">Format JPG/PNG. Maks 5MB.</p>
                <button type="button" onClick={() => fotoFileInputRef.current?.click()}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:border-emerald-500 hover:text-emerald-600 transition shadow-sm inline-flex items-center gap-2">
                    <UploadCloud size={16} /> Pilih File
                </button>
                <input type="file" ref={fotoFileInputRef} className="hidden" accept="image/*" onChange={e => {
                    if (e.target.files && e.target.files[0]) setFotoFile(e.target.files[0]);
                }} />
                {fotoFile && <div className="mt-3 text-[11px] font-semibold text-emerald-600 flex items-center gap-1.5 truncate max-w-full"><CheckCircle size={14} className="shrink-0" /> <span className="truncate">{fotoFile.name}</span></div>}
            </div>

            {/* KK Upload 1 */}
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition duration-150 relative">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-4 shadow-inner">
                    <FileText size={28} className="text-blue-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-800 mb-1">Dokumen KK 1</h3>
                <p className="text-xs text-gray-400 text-center mb-4 max-w-[200px]">Format Doc/PDF/IMG. Maks 10MB.</p>
                <button type="button" onClick={() => kkFileInputRef.current?.click()}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:border-blue-500 hover:text-blue-600 transition shadow-sm inline-flex items-center gap-2">
                    <UploadCloud size={16} /> Pilih Dokumen 1
                </button>
                <input type="file" ref={kkFileInputRef} className="hidden" accept=".pdf,.doc,.docx,image/*" onChange={e => {
                    if (e.target.files && e.target.files[0]) setKkFile(e.target.files[0]);
                }} />
                {kkFile && <div className="mt-3 text-[11px] font-semibold text-blue-600 flex items-center gap-1.5 truncate max-w-full"><CheckCircle size={14} className="shrink-0" /> <span className="truncate">{kkFile.name}</span></div>}
            </div>

            {/* KK Upload 2 */}
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition duration-150 relative">
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4 shadow-inner">
                    <FileText size={28} className="text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-800 mb-1">Dokumen Akte</h3>
                <p className="text-xs text-gray-400 text-center mb-4 max-w-[200px]">(Opsional) Upload lembar Akte Kelahiran</p>
                <button type="button" onClick={() => kkFileInputRef2.current?.click()}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition shadow-sm inline-flex items-center gap-2">
                    <UploadCloud size={16} /> Pilih Dokumen 2
                </button>
                <input type="file" ref={kkFileInputRef2} className="hidden" accept=".pdf,.doc,.docx,image/*" onChange={e => {
                    if (e.target.files && e.target.files[0]) setKkFile2(e.target.files[0]);
                }} />
                {kkFile2 && <div className="mt-3 text-[11px] font-semibold text-indigo-600 flex items-center gap-1.5 truncate max-w-full"><CheckCircle size={14} className="shrink-0" /> <span className="truncate">{kkFile2.name}</span></div>}
            </div>
        </div>
    );

    return (
        <form onSubmit={handleSubmit(onSubmit, onError)} onKeyDown={handleKeyDown} className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => navigate('/santri')} className="p-2 hover:bg-white border text-gray-500 border-gray-200 rounded-lg transition-colors bg-gray-50">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 drop-shadow-sm">{isEdit ? 'Edit Santri' : 'Tambah Santri Baru'}</h1>
                    <p className="text-sm text-gray-500 mt-1">{isEdit ? 'Lengkapi dan perbarui data santri di bawah ini' : 'Ikuti langkah-langkah wizard untuk mendaftarkan santri'}</p>
                </div>
            </div>

            {/* Error Modal */}
            {modal.show && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm" onClick={() => setModal({ ...modal, show: false })}>
                    <div className="bg-white rounded-2xl shadow-xl w-80 p-6 flex flex-col items-center gap-3 text-center transform transition-all scale-100 opacity-100" onClick={e => e.stopPropagation()}>
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

            {isEdit ? (
                // ─── ACCORDION MODE (EDIT) ───
                <div className="space-y-4">
                    <div className="flex justify-end mb-4">
                        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 shadow-sm text-sm">
                            <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                    <AccordionSection title="1. Data Pribadi" badge="Wajib" defaultOpen>
                        {renderDataPribadi()}
                    </AccordionSection>
                    <AccordionSection title="2. Data Orang Tua">
                        {renderDataOrtu()}
                    </AccordionSection>
                    <AccordionSection title="3. Data Wali">
                        {renderDataWali()}
                    </AccordionSection>
                    <AccordionSection title="4. Alamat">
                        {renderAlamat()}
                    </AccordionSection>
                </div>
            ) : (
                // ─── WIZARD MODE (CREATE) ───
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Stepper Header */}
                    <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
                        <div className="flex items-center justify-between">
                            {WIZARD_STEPS.map((step, idx) => (
                                <div key={step.id} className="flex-1 flex items-center">
                                    <div className="relative flex flex-col items-center flex-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300 z-10 ${currentStep > step.id ? 'bg-emerald-600 text-white' : currentStep === step.id ? 'bg-emerald-500 text-white shadow-md ring-4 ring-emerald-50' : 'bg-white border-2 border-gray-200 text-gray-400'}`}>
                                            {currentStep > step.id ? <CheckCircle size={14} /> : step.id}
                                        </div>
                                        <span className={`absolute top-10 text-[10px] font-semibold whitespace-nowrap transition-colors duration-300 ${currentStep >= step.id ? 'text-emerald-700' : 'text-gray-400'}`}>
                                            {step.title}
                                        </span>
                                    </div>
                                    {idx < WIZARD_STEPS.length - 1 && (
                                        <div className={`h-1 flex-1 mx-2 rounded-full transition-colors duration-300 ${currentStep > step.id ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="h-6"></div> {/* Spacer for absolute text */}
                    </div>

                    {/* Step Content */}
                    <div className="p-6 sm:p-8 min-h-[350px]">
                        <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                            Langkah {currentStep}: <span className="text-emerald-600">{WIZARD_STEPS[currentStep - 1].title}</span>
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 animate-in slide-in-from-right-4 fade-in duration-300">
                            {currentStep === 1 && renderDataPribadi()}
                            {currentStep === 2 && renderDataOrtu()}
                            {currentStep === 3 && renderDataWali()}
                            {currentStep === 4 && renderAlamat()}
                            {currentStep === 5 && renderUploads()}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
                            disabled={currentStep === 1 || saving}
                            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 bg-white font-semibold text-sm hover:bg-gray-50 focus:ring-2 focus:ring-gray-100 transition disabled:opacity-0"
                        >
                            <ArrowLeft size={16} className="inline mr-1 mb-0.5" /> Kembali
                        </button>

                        {currentStep < 5 ? (
                            <button
                                key="btn-next"
                                type="button"
                                onClick={(e) => { e.preventDefault(); handleNextStep(); }}
                                className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 focus:ring-4 focus:ring-emerald-100 transition flex items-center gap-1.5"
                            >
                                Lanjutkan <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button
                                key="btn-submit"
                                type="button"
                                disabled={saving}
                                onClick={(e) => { e.preventDefault(); handleSubmit(onSubmit, onError)(); }}
                                className={`px-8 py-2.5 rounded-xl font-bold text-sm text-white shadow-sm transition flex items-center gap-1.5 focus:ring-4 ${(fotoFile && kkFile) ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 focus:ring-emerald-100' : 'bg-gray-400 hover:bg-gray-500 focus:ring-gray-100'}`}
                            >
                                {saving ? 'Memproses...' : (fotoFile && kkFile) ? 'Lanjutkan & Simpan' : 'Lewati & Simpan'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </form>
    );
}
