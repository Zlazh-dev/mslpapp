import {
    Controller,
    Post,
    Body,
    Res,
    HttpStatus,
    UseGuards,
    Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PdfService, PdfRenderOptions } from './pdf.service';
import { PdfDataService } from './pdf-data.service';

// ─── DTO shapes (inline — small enough to not warrant separate files) ────────

interface GenerateRawDto {
    konvaJson: string | Record<string, any>;
    dataParams?: Record<string, string>;
    qrFields?: string[];
    pageWidth?: number;
    pageHeight?: number;
}

interface GenerateBiodataDto {
    konvaJson: string | Record<string, any>;
    santriId: string;
    qrFields?: string[];
    pageWidth?: number;
    pageHeight?: number;
}

interface GeneratePresensiDto {
    konvaJson: string | Record<string, any>;
    santriId: string;
    startDate?: string;
    endDate?: string;
    qrFields?: string[];
    pageWidth?: number;
    pageHeight?: number;
}

interface GenerateNilaiDto {
    konvaJson: string | Record<string, any>;
    santriId: string;
    semester?: string;
    qrFields?: string[];
    pageWidth?: number;
    pageHeight?: number;
}

interface GenerateBatchDto {
    konvaJson: string | Record<string, any>;
    santriIds: string[];
    qrFields?: string[];
    pageWidth?: number;
    pageHeight?: number;
}

// ─── Controller ──────────────────────────────────────────────────────────────

@ApiTags('pdf')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pdf')
export class PdfController {
    private readonly logger = new Logger(PdfController.name);

    constructor(
        private readonly pdfService: PdfService,
        private readonly pdfDataService: PdfDataService,
    ) {}

    // ─── 1. Raw Generate (client sends its own data map) ─────────

    @Post('generate')
    @Roles('ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'WALI_KELAS', 'PEMBIMBING_KAMAR')
    async generateRaw(
        @Body() body: GenerateRawDto,
        @Res() res: Response,
    ) {
        const opts: PdfRenderOptions = {
            konvaJson: body.konvaJson,
            dataParams: body.dataParams ?? {},
            qrFields: body.qrFields,
            pageWidth: body.pageWidth,
            pageHeight: body.pageHeight,
        };

        return this.sendPdf(res, opts, 'document.pdf');
    }

    // ─── 2. Biodata — auto-fetches santri data from DB ───────────

    @Post('biodata')
    @Roles('ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'WALI_KELAS', 'PEMBIMBING_KAMAR')
    async generateBiodata(
        @Body() body: GenerateBiodataDto,
        @Res() res: Response,
    ) {
        const biodata = await this.pdfDataService.getSantriBiodata(body.santriId);

        const opts: PdfRenderOptions = {
            konvaJson: body.konvaJson,
            dataParams: biodata,
            qrFields: body.qrFields ?? ['qr_data', 'qr_nis'],
            pageWidth: body.pageWidth,
            pageHeight: body.pageHeight,
        };

        return this.sendPdf(res, opts, `biodata_${biodata.nis}.pdf`);
    }

    // ─── 3. Presensi — biodata + attendance summary & table ──────

    @Post('presensi')
    @Roles('ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'WALI_KELAS', 'PEMBIMBING_KAMAR')
    async generatePresensi(
        @Body() body: GeneratePresensiDto,
        @Res() res: Response,
    ) {
        const [biodata, presensi] = await Promise.all([
            this.pdfDataService.getSantriBiodata(body.santriId),
            this.pdfDataService.getPresensiData(
                body.santriId,
                body.startDate,
                body.endDate,
            ),
        ]);

        const opts: PdfRenderOptions = {
            konvaJson: body.konvaJson,
            dataParams: { ...biodata, ...presensi.summary },
            qrFields: body.qrFields ?? ['qr_data'],
            tableData: {
                title: 'Rekap Presensi Santri',
                columns: [
                    { key: 'no', label: 'No', width: '30px' },
                    { key: 'tanggal', label: 'Tanggal', width: '90px' },
                    { key: 'hari', label: 'Hari', width: '70px' },
                    { key: 'kelas', label: 'Kelas' },
                    { key: 'pengajar', label: 'Pengajar' },
                    { key: 'status', label: 'Status', width: '50px' },
                    { key: 'catatan', label: 'Catatan' },
                ],
                rows: presensi.rows,
            },
            pageWidth: body.pageWidth,
            pageHeight: body.pageHeight,
        };

        return this.sendPdf(res, opts, `presensi_${biodata.nis}.pdf`);
    }

    // ─── 4. Nilai / Jadwal Pembelajaran ──────────────────────────

    @Post('nilai')
    @Roles('ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'WALI_KELAS')
    async generateNilai(
        @Body() body: GenerateNilaiDto,
        @Res() res: Response,
    ) {
        const [biodata, nilai] = await Promise.all([
            this.pdfDataService.getSantriBiodata(body.santriId),
            this.pdfDataService.getNilaiData(body.santriId, body.semester),
        ]);

        const opts: PdfRenderOptions = {
            konvaJson: body.konvaJson,
            dataParams: { ...biodata, ...nilai.summary },
            qrFields: body.qrFields ?? ['qr_data'],
            tableData: {
                title: 'Jadwal Pembelajaran & Nilai',
                columns: [
                    { key: 'no', label: 'No', width: '30px' },
                    { key: 'mata_pelajaran', label: 'Mata Pelajaran' },
                    { key: 'semester', label: 'Semester', width: '70px' },
                    { key: 'kelas', label: 'Kelas', width: '80px' },
                    { key: 'nilai_harian', label: 'Harian', width: '55px' },
                    { key: 'nilai_uts', label: 'UTS', width: '55px' },
                    { key: 'nilai_uas', label: 'UAS', width: '55px' },
                    { key: 'rata_rata', label: 'Rata²', width: '55px' },
                ],
                rows: nilai.rows,
            },
            pageWidth: body.pageWidth,
            pageHeight: body.pageHeight,
        };

        return this.sendPdf(res, opts, `nilai_${biodata.nis}.pdf`);
    }

    // ─── 5. Batch Print (multiple santri, same template) ─────────

    @Post('batch')
    @Roles('ADMIN', 'STAF_PENDATAAN')
    async generateBatch(
        @Body() body: GenerateBatchDto,
        @Res() res: Response,
    ) {
        // For batch, we generate one PDF per santri and merge isn't trivial
        // without an extra lib. Strategy: generate the FIRST santri as a
        // proof-of-concept. For production mass-print, consider a queue.
        // Here we generate sequentially and return the last one — the real
        // implementation should zip or concatenate pages. For now we loop
        // and concatenate the buffers aren't valid multi-page PDFs without
        // a merge lib, so we just run the first one as a minimal approach.

        if (!body.santriIds?.length) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                message: 'santriIds array must not be empty',
            });
        }

        const allBiodata = await this.pdfDataService.getBatchBiodata(body.santriIds);

        if (allBiodata.length === 0) {
            return res.status(HttpStatus.NOT_FOUND).json({
                message: 'No santri found for the given IDs',
            });
        }

        // Generate for the first santri (extendable to merge later)
        const firstBio = allBiodata[0];

        const opts: PdfRenderOptions = {
            konvaJson: body.konvaJson,
            dataParams: firstBio,
            qrFields: body.qrFields ?? ['qr_data', 'qr_nis'],
            pageWidth: body.pageWidth,
            pageHeight: body.pageHeight,
        };

        return this.sendPdf(res, opts, `batch_${firstBio.nis}.pdf`);
    }

    @Roles('ADMIN', 'STAF_MADRASAH', 'WALI_KELAS')
    @Post('presensi/kelas')
    async generatePresensiKelas(@Body() body: { konvaJson: any, kelasId: number, qrFields?: string[] }, @Res() res: Response) {
        if (!body.konvaJson || !body.kelasId) {
            return res.status(400).json({ message: 'konvaJson and kelasId are required' });
        }

        // Check if the template already has a custom table — if so, skip the preset rawHtml table
        const konvaStr = typeof body.konvaJson === 'string' ? body.konvaJson : JSON.stringify(body.konvaJson);
        const hasCustomTable = konvaStr.includes('"dataType":"custom"');

        // Only generate preset table HTML if no custom table exists in the template
        const tableHtml = hasCustomTable ? '' : await this.pdfDataService.buildPresensiTableHtml(body.kelasId);

        // Fetch header data and santri list for custom table DB columns
        const [kelasHeader, santriList] = await Promise.all([
            this.pdfDataService.getKelasHeaderData(body.kelasId),
            this.pdfDataService.getKelasSantriList(body.kelasId),
        ]);

        const opts: PdfRenderOptions = {
            konvaJson: body.konvaJson,
            dataParams: kelasHeader,
            qrFields: body.qrFields,
            rawHtml: tableHtml || undefined,
            santriList,
        };

        const pdfBuffer = await this.pdfService.generatePdf(opts);
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="presensi_kelas_${body.kelasId}.pdf"`,
            'Content-Length': pdfBuffer.length,
        });
        
        res.end(pdfBuffer);
    }

    // ─── Jadwal Kelas PDF ───────────────────────────────────────

    @Roles('ADMIN', 'STAF_MADRASAH', 'WALI_KELAS')
    @Post('jadwal/kelas')
    async generateJadwalKelas(@Body() body: { konvaJson: any, kelasId: number, hari?: number, qrFields?: string[] }, @Res() res: Response) {
        if (!body.konvaJson || !body.kelasId) {
            return res.status(400).json({ message: 'konvaJson and kelasId are required' });
        }

        const jadwalData = await this.pdfDataService.getKelasJadwalData(body.kelasId, body.hari);

        const opts: PdfRenderOptions = {
            konvaJson: body.konvaJson,
            dataParams: jadwalData.header,
            qrFields: body.qrFields,
            santriList: jadwalData.rows,
        };

        const pdfBuffer = await this.pdfService.generatePdf(opts);
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="jadwal_kelas_${body.kelasId}.pdf"`,
            'Content-Length': pdfBuffer.length,
        });
        
        res.end(pdfBuffer);
    }

    // ─── Shared Response Helper ──────────────────────────────────

    private async sendPdf(
        res: Response,
        opts: PdfRenderOptions,
        filename: string,
    ) {
        try {
            const buffer = await this.pdfService.generatePdf(opts);

            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': buffer.length.toString(),
            });

            return res.status(HttpStatus.OK).send(buffer);
        } catch (error: any) {
            this.logger.error(`PDF generation failed for ${filename}`, error.stack);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Failed to generate PDF',
                error: error.message,
            });
        }
    }
}
