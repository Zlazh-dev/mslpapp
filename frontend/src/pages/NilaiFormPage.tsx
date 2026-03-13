import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../lib/api';
import { Santri, Kelas } from '../types';
import { ArrowLeft, Save } from 'lucide-react';

const schema = z.object({
    santriId: z.string().min(1, 'Santri wajib dipilih'),
    kelasId: z.string().min(1, 'Kelas wajib dipilih'),
    mataPelajaran: z.string().min(1, 'Mata pelajaran wajib diisi'),
    semester: z.string().min(1, 'Semester wajib diisi'),
    nilaiHarian: z.coerce.number().min(0).max(100).optional(),
    nilaiUTS: z.coerce.number().min(0).max(100).optional(),
    nilaiUAS: z.coerce.number().min(0).max(100).optional(),
});

type FormData = z.infer<typeof schema>;

export default function NilaiFormPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEdit = !!id;
    const [santri, setSantri] = useState<Santri[]>([]);
    const [kelas, setKelas] = useState<Kelas[]>([]);
    const [error, setError] = useState('');

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    useEffect(() => {
        api.get('/santri', { params: { limit: 100 } }).then(r => setSantri(r.data.data));
        api.get('/kelas').then(r => setKelas(r.data.data));
        if (isEdit) api.get(`/nilai/${id}`).then(r => reset(r.data.data));
    }, [id]);

    const onSubmit = async (data: FormData) => {
        try {
            setError('');
            if (isEdit) await api.put(`/nilai/${id}`, { nilaiHarian: data.nilaiHarian, nilaiUTS: data.nilaiUTS, nilaiUAS: data.nilaiUAS });
            else await api.post('/nilai', data);
            navigate('/nilai');
        } catch (err: any) { setError(err.response?.data?.message || 'Gagal menyimpan'); }
    };

    const semesters = ['Ganjil 2024/2025', 'Genap 2024/2025', 'Ganjil 2023/2024', 'Genap 2023/2024'];

    return (
        <div className="max-w-lg space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={18} /></button>
                <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Nilai' : 'Input Nilai'}</h1>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
                {!isEdit && (
                    <>
                        <div>
                            <label className="form-label">Santri</label>
                            <select {...register('santriId')} className="form-input">
                                <option value="">-- Pilih Santri --</option>
                                {santri.map(s => <option key={s.id} value={s.id}>{s.namaLengkap} ({s.nis})</option>)}
                            </select>
                            {errors.santriId && <p className="text-red-500 text-xs mt-1">{errors.santriId.message}</p>}
                        </div>
                        <div>
                            <label className="form-label">Kelas</label>
                            <select {...register('kelasId')} className="form-input">
                                <option value="">-- Pilih Kelas --</option>
                                {kelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                            </select>
                            {errors.kelasId && <p className="text-red-500 text-xs mt-1">{errors.kelasId.message}</p>}
                        </div>
                        <div>
                            <label className="form-label">Mata Pelajaran</label>
                            <input {...register('mataPelajaran')} className="form-input" placeholder="Matematika" />
                            {errors.mataPelajaran && <p className="text-red-500 text-xs mt-1">{errors.mataPelajaran.message}</p>}
                        </div>
                        <div>
                            <label className="form-label">Semester</label>
                            <select {...register('semester')} className="form-input">
                                <option value="">-- Pilih Semester --</option>
                                {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            {errors.semester && <p className="text-red-500 text-xs mt-1">{errors.semester.message}</p>}
                        </div>
                    </>
                )}
                <div className="grid grid-cols-3 gap-3">
                    {[['nilaiHarian', 'Nilai Harian'], ['nilaiUTS', 'Nilai UTS'], ['nilaiUAS', 'Nilai UAS']].map(([n, l]) => (
                        <div key={n}>
                            <label className="form-label">{l}</label>
                            <input {...register(n as any)} type="number" min="0" max="100" step="0.01" className="form-input text-center" placeholder="0" />
                            {(errors as any)[n] && <p className="text-red-500 text-xs mt-1">{(errors as any)[n]?.message}</p>}
                        </div>
                    ))}
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Batal</button>
                    <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
                        <Save size={16} />{isSubmitting ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </form>
        </div>
    );
}
