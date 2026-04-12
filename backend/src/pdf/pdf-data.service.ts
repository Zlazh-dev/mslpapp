import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * PdfDataService
 * ──────────────
 * Responsible for fetching and shaping domain data (biodata, presensi,
 * jadwal/nilai) into flat key-value maps that the PDF rendering engine
 * can substitute into Konva JSON placeholders like {{nama_santri}}.
 *
 * This service owns ALL database access for the PDF module — the
 * PdfService itself never touches Prisma directly.
 */
@Injectable()
export class PdfDataService {
    private readonly logger = new Logger(PdfDataService.name);

    constructor(private readonly prisma: PrismaService) {}

    // ──────────────────────────────────────────────────────────────────
    // 1. Biodata Santri
    // ──────────────────────────────────────────────────────────────────

    /**
     * Returns a flat placeholder map for a single santri, ready to be
     * injected into a Konva template.
     */
    async getSantriBiodata(santriId: string): Promise<Record<string, string>> {
        const santri = await this.prisma.santri.findUnique({
            where: { id: santriId },
            include: {
                kelas: {
                    include: {
                        tingkat: { include: { jenjang: true } },
                        waliKelas: true,
                    },
                },
                kamar: {
                    include: {
                        gedung: { include: { kompleks: true } },
                        pembimbings: true,
                    },
                },
            },
        });

        if (!santri) {
            throw new NotFoundException(`Santri with id "${santriId}" not found`);
        }

        const formatDate = (d: Date | null | undefined): string => {
            if (!d) return '-';
            return new Intl.DateTimeFormat('id-ID', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            }).format(new Date(d));
        };

        return {
            // ── Core Identity (snake_case for backward compat) ──
            nama_santri: santri.namaLengkap,
            nis: santri.nis,
            gender: santri.gender === 'L' ? 'Laki-laki' : santri.gender === 'P' ? 'Perempuan' : '-',
            tempat_lahir: santri.tempatLahir ?? '-',
            tanggal_lahir: formatDate(santri.tanggalLahir),
            ttl: `${santri.tempatLahir ?? '-'}, ${formatDate(santri.tanggalLahir)}`,
            nik: santri.nik ?? '-',
            no_kk: santri.noKk ?? '-',
            no_hp: santri.noHp ?? '-',
            status: santri.status,
            jalur_pendidikan: santri.jalurPendidikan ?? '-',
            jenjang_pendidikan: santri.jenjangPendidikan ?? '-',
            tanggal_masuk: formatDate(santri.tanggalMasuk),
            tanggal_keluar: formatDate(santri.tanggalKeluar),
            foto_url: santri.foto ?? '',

            // ── Core Identity (camelCase — matches frontend template editor field names) ──
            namaLengkap: santri.namaLengkap,
            tempatLahir: santri.tempatLahir ?? '-',
            tanggalLahir: formatDate(santri.tanggalLahir),
            noHp: santri.noHp ?? '-',
            noKk: santri.noKk ?? '-',
            jalurPendidikan: santri.jalurPendidikan ?? '-',
            jenjangPendidikan: santri.jenjangPendidikan ?? '-',
            tanggalMasuk: formatDate(santri.tanggalMasuk),
            tanggalKeluar: formatDate(santri.tanggalKeluar),

            // ── Orang Tua / Wali (snake_case) ──
            nama_ayah: santri.namaAyah ?? '-',
            nama_ibu: santri.namaIbu ?? '-',
            no_hp_ayah: santri.noHpAyah ?? '-',
            no_hp_ibu: santri.noHpIbu ?? '-',
            nama_wali: santri.namaWali ?? '-',
            no_hp_wali: santri.noHpWali ?? '-',
            deskripsi_wali: santri.deskripsiWali ?? '-',

            // ── Orang Tua / Wali (camelCase) ──
            namaAyah: santri.namaAyah ?? '-',
            namaIbu: santri.namaIbu ?? '-',
            noHpAyah: santri.noHpAyah ?? '-',
            noHpIbu: santri.noHpIbu ?? '-',
            namaWali: santri.namaWali ?? '-',
            noHpWali: santri.noHpWali ?? '-',
            deskripsiWali: santri.deskripsiWali ?? '-',

            // ── Alamat ──
            provinsi: santri.provinsi ?? '-',
            kota_kabupaten: santri.kotaKabupaten ?? '-',
            kotaKabupaten: santri.kotaKabupaten ?? '-',
            kecamatan: santri.kecamatan ?? '-',
            kelurahan: santri.kelurahan ?? '-',
            jalan: santri.jalan ?? '-',
            rt_rw: santri.rtRw ?? '-',
            rtRw: santri.rtRw ?? '-',
            alamat_lengkap: [
                santri.jalan,
                santri.rtRw ? `RT/RW ${santri.rtRw}` : null,
                santri.kelurahan,
                santri.kecamatan,
                santri.kotaKabupaten,
                santri.provinsi,
            ]
                .filter(Boolean)
                .join(', ') || '-',
            alamatFull: [
                santri.jalan,
                santri.rtRw ? `RT/RW ${santri.rtRw}` : null,
                santri.kelurahan,
                santri.kecamatan,
                santri.kotaKabupaten,
                santri.provinsi,
            ]
                .filter(Boolean)
                .join(', ') || '-',

            // ── Kelas & Kamar ──
            kelas: santri.kelas?.nama ?? '-',
            'kelas.nama': santri.kelas?.nama ?? '-',
            jenjang: santri.kelas?.tingkat?.jenjang?.nama ?? '-',
            tingkat: santri.kelas?.tingkat?.nama ?? '-',
            kelas_lengkap: santri.kelas
                ? `${santri.kelas.tingkat?.jenjang?.nama ?? ''} ${santri.kelas.tingkat?.nama ?? ''} ${santri.kelas.nama}`.trim()
                : '-',
            kelas_deskripsi: (santri.kelas as any)?.deskripsi ?? '-',
            wali_kelas: (santri.kelas?.waliKelas as any)?.name ?? '-',
            kamar: santri.kamar?.nama ?? '-',
            'kamar.nama': santri.kamar?.nama ?? '-',
            gedung: santri.kamar?.gedung?.nama ?? '-',
            kompleks: santri.kamar?.gedung?.kompleks?.nama ?? '-',
            kamar_lengkap: santri.kamar
                ? `${santri.kamar.gedung?.nama ?? ''} - ${santri.kamar.nama}`.trim()
                : '-',
            pembimbing_kamar: santri.kamar?.pembimbings?.map((p: any) => p.name).join(', ') ?? '-',

            // ── QR Data (full public profile URLs for scanning) ──
            qr_data: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/p/santri/${santri.id}`,
            qr_nis: santri.nis,
        };
    }

    // ──────────────────────────────────────────────────────────────────
    // 2. Presensi (Attendance) Summary
    // ──────────────────────────────────────────────────────────────────

    /**
     * Fetches attendance records for a santri within a date range and
     * returns both a summary map and a detail rows array suitable for
     * table rendering.
     */
    async getPresensiData(
        santriId: string,
        startDate?: string,
        endDate?: string,
    ): Promise<{
        summary: Record<string, string>;
        rows: Array<Record<string, string>>;
    }> {
        const where: any = { santriId };

        if (startDate || endDate) {
            where.presensiKelas = {
                tanggal: {
                    ...(startDate ? { gte: new Date(startDate) } : {}),
                    ...(endDate ? { lte: new Date(endDate) } : {}),
                },
            };
        }

        const records = await this.prisma.presensiSiswa.findMany({
            where,
            include: {
                presensiKelas: {
                    include: {
                        kelas: true,
                        pengajar: true,
                    },
                },
            },
            orderBy: { presensiKelas: { tanggal: 'asc' } },
        });

        // ── Counters ──
        let hadir = 0;
        let sakit = 0;
        let izin = 0;
        let alpa = 0;

        const rows = records.map((r, idx) => {
            switch (r.status) {
                case 'H': hadir++; break;
                case 'S': sakit++; break;
                case 'I': izin++; break;
                case 'A': alpa++; break;
            }

            const tanggal = r.presensiKelas.tanggal;

            return {
                no: String(idx + 1),
                tanggal: new Intl.DateTimeFormat('id-ID', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                }).format(new Date(tanggal)),
                hari: new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(
                    new Date(tanggal),
                ),
                kelas: r.presensiKelas.kelas?.nama ?? '-',
                pengajar: (r.presensiKelas.pengajar as any)?.name ?? '-',
                status: r.status,
                catatan: r.presensiKelas.catatan ?? '-',
            };
        });

        const total = records.length;

        return {
            summary: {
                total_presensi: String(total),
                total_hadir: String(hadir),
                total_sakit: String(sakit),
                total_izin: String(izin),
                total_alpa: String(alpa),
                persen_hadir: total > 0 ? `${((hadir / total) * 100).toFixed(1)}%` : '0%',
            },
            rows,
        };
    }

    // ──────────────────────────────────────────────────────────────────
    // 3. Nilai / Jadwal Pembelajaran
    // ──────────────────────────────────────────────────────────────────

    /**
     * Returns grade data for a santri, optionally filtered by semester,
     * shaped as table rows for "Jadwal Pembelajaran" or report cards.
     */
    async getNilaiData(
        santriId: string,
        semester?: string,
    ): Promise<{
        summary: Record<string, string>;
        rows: Array<Record<string, string>>;
    }> {
        const where: any = { santriId };
        if (semester) where.semester = semester;

        const records = await this.prisma.nilai.findMany({
            where,
            include: {
                kelas: {
                    include: {
                        tingkat: { include: { jenjang: true } },
                    },
                },
            },
            orderBy: [{ semester: 'asc' }, { mataPelajaran: 'asc' }],
        });

        const rows = records.map((r, idx) => {
            const avg =
                [r.nilaiHarian, r.nilaiUTS, r.nilaiUAS].filter(
                    (v): v is number => v !== null && v !== undefined,
                );
            const rataRata = avg.length > 0
                ? (avg.reduce((a, b) => a + b, 0) / avg.length).toFixed(1)
                : '-';

            return {
                no: String(idx + 1),
                mata_pelajaran: r.mataPelajaran,
                semester: r.semester,
                kelas: r.kelas?.nama ?? '-',
                jenjang: r.kelas?.tingkat?.jenjang?.nama ?? '-',
                nilai_harian: r.nilaiHarian?.toString() ?? '-',
                nilai_uts: r.nilaiUTS?.toString() ?? '-',
                nilai_uas: r.nilaiUAS?.toString() ?? '-',
                rata_rata: rataRata,
            };
        });

        // ── Summary Averages ──
        const allAvgs = rows
            .map((r) => parseFloat(r.rata_rata))
            .filter((v) => !isNaN(v));
        const totalAvg =
            allAvgs.length > 0
                ? (allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length).toFixed(1)
                : '-';

        return {
            summary: {
                jumlah_mapel: String(rows.length),
                rata_rata_total: totalAvg,
                semester: semester ?? 'Semua',
            },
            rows,
        };
    }

    // ──────────────────────────────────────────────────────────────────
    // 4. Batch — Multiple Santri at once (for mass-print)
    // ──────────────────────────────────────────────────────────────────

    async getBatchBiodata(
        santriIds: string[],
    ): Promise<Array<Record<string, string>>> {
        const results: Array<Record<string, string>> = [];
        for (const id of santriIds) {
            try {
                results.push(await this.getSantriBiodata(id));
            } catch (err) {
                this.logger.warn(`Skipped santri ${id}: ${(err as Error).message}`);
            }
        }
        return results;
    }

    // ─── Table Builders ──────────────────────────────────────────────────────────

    async getKelasHeaderData(kelasId: number): Promise<Record<string, string>> {
        const kelas = await this.prisma.kelas.findUnique({
            where: { id: kelasId },
            include: { tingkat: { include: { jenjang: true } }, waliKelas: true }
        });

        if (!kelas) return {};

        return {
            'kelas.nama': kelas.nama,
            kelas_lengkap: [kelas.tingkat?.jenjang?.nama, kelas.tingkat?.nama, kelas.nama].filter(Boolean).join(' '),
            kelas_deskripsi: (kelas as any).deskripsi || '-',
            'tahunAjaran': kelas.tahunAjaran || '-',
            'jenjangPendidikan': kelas.tingkat?.jenjang?.nama || '-',
            'waliKelas': kelas.waliKelas?.name || '-'
        };
    }

    async buildPresensiTableHtml(kelasId: number): Promise<string> {
        // Fetch students in this class
        const santris = await this.prisma.santri.findMany({
            where: { kelasId, status: 'ACTIVE' },
            orderBy: { namaLengkap: 'asc' }
        });

        // We build a presensi table for 31 days (1 month)
        let html = `
        <style>
            .print-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-family: 'Noto Sans', sans-serif;
                font-size: 10px;
            }
            .print-table th, .print-table td {
                border: 1px solid #cbd5e1;
                padding: 4px;
                text-align: center;
            }
            .print-table th {
                background-color: #f8fafc;
                font-weight: bold;
            }
            .print-table .text-left {
                text-align: left;
            }
            .print-table tr {
                page-break-inside: avoid;
            }
        </style>
        <table class="print-table">
            <thead>
                <tr>
                    <th rowspan="2" style="width: 30px;">NO</th>
                    <th rowspan="2" class="text-left" style="width: 180px;">NAMA LENGKAP</th>
                    <th colspan="31">TANGGAL</th>
                </tr>
                <tr>
                    ${Array.from({ length: 31 }, (_, i) => `<th>${i + 1}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
        `;

        santris.forEach((s, idx) => {
            html += `
                <tr>
                    <td>${idx + 1}</td>
                    <td class="text-left font-medium">${s.namaLengkap}</td>
                    ${Array.from({ length: 31 }, () => `<td></td>`).join('')}
                </tr>
            `;
        });

        html += `
            </tbody>
        </table>
        `;

        return html;
    }

    /**
     * Returns a list of flat santri data objects for all active santri in a kelas.
     * The keys match the DB_FIELDS used in the frontend custom table editor.
     */
    async getKelasSantriList(kelasId: number): Promise<Array<Record<string, string>>> {
        const santris = await this.prisma.santri.findMany({
            where: { kelasId, status: 'ACTIVE' },
            include: {
                kelas: { include: { tingkat: { include: { jenjang: true } } } },
                kamar: { include: { gedung: true } },
            },
            orderBy: { namaLengkap: 'asc' },
        });

        const formatDate = (d: Date | null | undefined): string => {
            if (!d) return '-';
            return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(d));
        };

        return santris.map((s) => ({
            namaLengkap: s.namaLengkap,
            nis: s.nis,
            nik: s.nik ?? '-',
            noKk: s.noKk ?? '-',
            tanggalLahir: formatDate(s.tanggalLahir),
            tempatLahir: s.tempatLahir ?? '-',
            gender: s.gender === 'L' ? 'Laki-laki' : s.gender === 'P' ? 'Perempuan' : '-',
            noHp: s.noHp ?? '-',
            'kelas.nama': s.kelas?.nama ?? '-',
            kelas_lengkap: s.kelas
                ? [s.kelas.tingkat?.jenjang?.nama, s.kelas.tingkat?.nama, s.kelas.nama].filter(Boolean).join(' ')
                : '-',
            kelas_deskripsi: (s.kelas as any)?.deskripsi ?? '-',
            'kamar.nama': s.kamar?.nama ?? '-',
            jenjangPendidikan: s.jenjangPendidikan ?? '-',
            namaAyah: s.namaAyah ?? '-',
            namaIbu: s.namaIbu ?? '-',
            namaWali: s.namaWali ?? '-',
            status: s.status,
        }));
    }

    /**
     * Returns jadwal data for a specific hari across all kelas.
     * Each row represents one jadwal entry with pengajar, mapel, and kelas fields.
     */
    async getJadwalByHari(hari: number): Promise<{
        header: Record<string, string>;
        rows: Array<Record<string, string>>;
    }> {
        const HARI_NAMES = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

        const jadwals = await this.prisma.jadwalPelajaran.findMany({
            where: { hari },
            include: {
                pengajar: { select: { id: true, name: true } },
                kelas: { include: { tingkat: { include: { jenjang: true } } } },
            },
            orderBy: [
                { kelas: { tingkat: { jenjang: { nama: 'asc' } } } },
                { mataPelajaran: 'asc' },
            ],
        });

        return {
            header: {
                hari: HARI_NAMES[hari] || String(hari),
            },
            rows: jadwals.map((j) => ({
                pengajar: j.pengajar?.name ?? '-',
                mapel: j.mataPelajaran,
                hari: HARI_NAMES[j.hari] || String(j.hari),
                'kelas.nama': j.kelas?.nama ?? '-',
                kelas_lengkap: j.kelas
                    ? [j.kelas.tingkat?.jenjang?.nama, j.kelas.tingkat?.nama, j.kelas.nama].filter(Boolean).join(' ')
                    : '-',
            })),
        };
    }
}
