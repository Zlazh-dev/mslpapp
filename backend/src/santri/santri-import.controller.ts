import {
    Controller, Get, Post, Res, UseGuards,
    UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SantriService } from './santri.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import { memoryStorage } from 'multer';

// Excel column definitions
const COLUMNS = [
    { key: 'nis', header: 'NIS *', width: 16 },
    { key: 'namaLengkap', header: 'Nama Lengkap *', width: 28 },
    { key: 'gender', header: 'Gender * (L/P)', width: 14 },
    { key: 'tanggalLahir', header: 'Tgl Lahir * (DD/MM/YYYY)', width: 22 },
    { key: 'tempatLahir', header: 'Tempat Lahir *', width: 20 },
    { key: 'tanggalMasuk', header: 'Tgl Masuk (DD/MM/YYYY)', width: 22 },
    { key: 'tanggalKeluar', header: 'Tgl Keluar (DD/MM/YYYY)', width: 22 },
    { key: 'jalurPendidikan', header: 'Jalur (Formal/Mahad Aly/Tahfidz)', width: 26 },
    { key: 'noHp', header: 'No HP', width: 16 },
    { key: 'nik', header: 'NIK', width: 18 },
    { key: 'noKk', header: 'No KK', width: 18 },
    { key: 'namaAyah', header: 'Nama Ayah', width: 24 },
    { key: 'namaIbu', header: 'Nama Ibu', width: 24 },
    { key: 'noHpAyah', header: 'No HP Ayah', width: 16 },
    { key: 'noHpIbu', header: 'No HP Ibu', width: 16 },
    { key: 'namaWali', header: 'Nama Wali', width: 24 },
    { key: 'noHpWali', header: 'No HP Wali', width: 16 },
    { key: 'deskripsiWali', header: 'Keterangan Wali', width: 22 },
    { key: 'provinsi', header: 'Provinsi', width: 20 },
    { key: 'kotaKabupaten', header: 'Kota/Kabupaten', width: 22 },
    { key: 'kecamatan', header: 'Kecamatan', width: 20 },
    { key: 'kelurahan', header: 'Kelurahan', width: 20 },
    { key: 'jalan', header: 'Jalan', width: 30 },
    { key: 'rtRw', header: 'RT/RW', width: 10 },
];

function parseDateDMY(val: string): string | undefined {
    if (!val) return undefined;
    // Support DD/MM/YYYY
    const match = String(val).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
        const [, d, m, y] = match;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // Try ISO format as fallback
    if (String(val).match(/^\d{4}-\d{2}-\d{2}/)) return String(val).slice(0, 10);
    // Try Excel serial number
    if (typeof val === 'number') {
        const date = XLSX.SSF.parse_date_code(val as number);
        if (date) return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
    return undefined;
}

@ApiTags('santri-import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('santri')
export class SantriImportController {
    constructor(private prisma: PrismaService, private santriService: SantriService) { }

    // ── GET /santri/import-template ──────────────────────────────────────────
    @Get('import-template')
    @Roles('ADMIN', 'STAF_PENDATAAN')
    async downloadTemplate(@Res() res: Response) {
        const wb = new ExcelJS.Workbook();
        wb.creator = 'MSLP App';
        const ws = wb.addWorksheet('Santri');

        // Set columns
        ws.columns = COLUMNS.map(c => ({ key: c.key, header: c.header, width: c.width }));

        // Style header row
        const headerRow = ws.getRow(1);
        headerRow.eachCell(cell => {
            cell.fill = {
                type: 'pattern', pattern: 'solid',
                fgColor: { argb: 'FF065F46' }, // dark emerald
            };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                bottom: { style: 'thin', color: { argb: 'FF047857' } },
            };
        });
        headerRow.height = 32;

        // Sample row with placeholder data
        ws.addRow({
            nis: '24001',
            namaLengkap: 'Ahmad Fulan',
            gender: 'L',
            tanggalLahir: '01/01/2010',
            tempatLahir: 'Bandung',
            tanggalMasuk: '10/07/2024',
            tanggalKeluar: '',
            jalurPendidikan: 'Formal',
            noHp: '081234567890',
            nik: '3201234567890001',
            noKk: '3201234567890001',
            namaAyah: 'Bapak Fulan',
            namaIbu: 'Ibu Fulan',
            noHpAyah: '081200000001',
            noHpIbu: '081200000002',
            namaWali: '',
            noHpWali: '',
            deskripsiWali: '',
            provinsi: 'Jawa Barat',
            kotaKabupaten: 'Kab. Bandung',
            kecamatan: 'Cimahi',
            kelurahan: '',
            jalan: 'Jl. Contoh No. 1',
            rtRw: '01/02',
        });

        // Style sample row (light gray)
        const sampleRow = ws.getRow(2);
        sampleRow.eachCell(cell => {
            cell.fill = {
                type: 'pattern', pattern: 'solid',
                fgColor: { argb: 'FFF0FDF4' }, // very light green
            };
            cell.font = { italic: true, color: { argb: 'FF6B7280' }, size: 9 };
            cell.alignment = { vertical: 'middle' };
        });

        // Freeze header
        ws.views = [{ state: 'frozen', ySplit: 1 }];

        // Auto filter
        ws.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: COLUMNS.length },
        };

        const buffer = await wb.xlsx.writeBuffer();

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="template-import-santri.xlsx"');
        res.send(Buffer.from(buffer));
    }

    // ── POST /santri/import ───────────────────────────────────────────────────
    @Post('import')
    @Roles('ADMIN', 'STAF_PENDATAAN')
    @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
    async importSantri(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('File tidak ditemukan');

        const wb = XLSX.read(file.buffer, { type: 'buffer', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rows.length === 0) throw new BadRequestException('File kosong atau format tidak valid');

        const results = { success: 0, skipped: 0, errors: [] as { row: number; reason: string }[] };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // 1-indexed + header

            // Map header names (support both key and header string)
            const get = (key: string, aliases: string[] = []) => {
                const allKeys = [key, ...aliases];
                for (const k of allKeys) {
                    if (row[k] !== undefined && row[k] !== '') return String(row[k]).trim();
                }
                return '';
            };

            const nis = get('NIS *', ['nis', 'NIS']);
            const namaLengkap = get('Nama Lengkap *', ['namaLengkap', 'Nama Lengkap']);
            const genderRaw = get('Gender * (L/P)', ['gender', 'Gender', 'Gender * (L/P)']);
            const tglLahirRaw = get('Tgl Lahir * (DD/MM/YYYY)', ['tanggalLahir', 'Tgl Lahir']);
            const tempatLahir = get('Tempat Lahir *', ['tempatLahir', 'Tempat Lahir']);

            if (!nis || !namaLengkap) {
                results.errors.push({ row: rowNum, reason: 'Kolom wajib tidak lengkap (NIS dan Nama Lengkap)' });
                results.skipped++;
                continue;
            }

            const gender = genderRaw.toUpperCase() === 'L' ? 'L' : genderRaw.toUpperCase() === 'P' ? 'P' : 'L'; // default L if empty
            const tanggalLahir = tglLahirRaw ? parseDateDMY(tglLahirRaw) : null;
            if (tglLahirRaw && !tanggalLahir) {
                results.errors.push({ row: rowNum, reason: `Format Tgl Lahir tidak valid: "${tglLahirRaw}" (harus DD/MM/YYYY)` });
                results.skipped++;
                continue;
            }

            const tanggalMasukRaw = get('Tgl Masuk (DD/MM/YYYY)', ['tanggalMasuk', 'Tgl Masuk']);
            const tanggalMasuk = tanggalMasukRaw ? parseDateDMY(tanggalMasukRaw) : undefined;

            const tanggalKeluarRaw = get('Tgl Keluar (DD/MM/YYYY)', ['tanggalKeluar', 'Tgl Keluar']);
            const tanggalKeluar = tanggalKeluarRaw ? parseDateDMY(tanggalKeluarRaw) : undefined;

            // Map friendly label → Prisma enum
            const JALUR_MAP: Record<string, string> = {
                'formal': 'FORMAL',
                'mahad aly': 'MAHAD_ALY',
                "ma'had aly": 'MAHAD_ALY',
                'mahad_aly': 'MAHAD_ALY',
                'tahfidz': 'TAHFIDZ',
            };
            const jalurRaw = get('Jalur (Formal/Mahad Aly/Tahfidz)', ['jalurPendidikan', 'Jalur']);
            const jalurPendidikan = jalurRaw ? (JALUR_MAP[jalurRaw.toLowerCase()] as any) ?? undefined : undefined;

            // Build field map for reuse in both create and update
            const fields = {
                namaLengkap,
                gender: gender as any,
                tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : new Date('2000-01-01'),
                tempatLahir: tempatLahir || '-',
                noHp: get('No HP', ['noHp']) || null,
                nik: get('NIK', ['nik']) || null,
                noKk: get('No KK', ['noKk']) || null,
                tanggalMasuk: tanggalMasuk ? new Date(tanggalMasuk) : null,
                tanggalKeluar: tanggalKeluar ? new Date(tanggalKeluar) : null,
                // Auto-status: INACTIVE if tanggalKeluar set
                status: tanggalKeluar ? 'INACTIVE' as any : 'ACTIVE' as any,
                jalurPendidikan,
                namaAyah: get('Nama Ayah', ['namaAyah']) || null,
                namaIbu: get('Nama Ibu', ['namaIbu']) || null,
                noHpAyah: get('No HP Ayah', ['noHpAyah']) || null,
                noHpIbu: get('No HP Ibu', ['noHpIbu']) || null,
                namaWali: get('Nama Wali', ['namaWali']) || null,
                noHpWali: get('No HP Wali', ['noHpWali']) || null,
                deskripsiWali: get('Keterangan Wali', ['keteranganWali', 'deskripsiWali']) || null,
                provinsi: get('Provinsi', ['provinsi']) || null,
                kotaKabupaten: get('Kota/Kabupaten', ['kotaKabupaten']) || null,
                kecamatan: get('Kecamatan', ['kecamatan']) || null,
                kelurahan: get('Kelurahan', ['kelurahan']) || null,
                jalan: get('Jalan', ['jalan']) || null,
                rtRw: get('RT/RW', ['rtRw']) || null,
            };

            try {
                await this.prisma.santri.upsert({
                    where: { nis },
                    create: { nis, ...fields },
                    update: fields,
                });
                results.success++;
            } catch (e: any) {
                results.errors.push({ row: rowNum, reason: e.message?.slice(0, 100) ?? 'Gagal menyimpan' });
                results.skipped++;
            }
        }

        return {
            success: true,
            data: results,
            message: `Import selesai: ${results.success} berhasil, ${results.skipped} dilewati`,
        };
    }
}
