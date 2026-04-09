import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import AdmZip = require('adm-zip');
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class BackupService {
    constructor(private prisma: PrismaService) { }

    async exportBackup() {
        const [
            santri,
            kamar,
            kelas,
            kompleks,
            gedung,
            jenjang,
            tingkat,
            users,
            settings,
            nilai,
        ] = await Promise.all([
            this.prisma.santri.findMany(),
            this.prisma.kamar.findMany(),
            this.prisma.kelas.findMany(),
            this.prisma.kompleks.findMany(),
            this.prisma.gedung.findMany(),
            this.prisma.jenjang.findMany(),
            this.prisma.tingkat.findMany(),
            this.prisma.user.findMany({
                select: { id: true, name: true, username: true, roles: { select: { name: true } }, createdAt: true, santriId: true }
            }),
            this.prisma.setting.findMany(),
            this.prisma.nilai.findMany(),
        ]);

        return {
            _meta: {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                appName: 'LPAPP',
            },
            santri,
            kamar,
            kelas,
            kompleks,
            gedung,
            jenjang,
            tingkat,
            users,
            settings,
            nilai,
        };
    }

    async exportZipBackup() {
        const data = await this.exportBackup();
        
        const zip = new AdmZip();
        zip.addFile('backup.json', Buffer.from(JSON.stringify(data, null, 2), 'utf8'));

        const uploadsPath = path.join(process.cwd(), 'uploads');
        if (fs.existsSync(uploadsPath)) {
            zip.addLocalFolder(uploadsPath, 'uploads');
        }

        return zip.toBuffer();
    }

    async importZipBackup(fileBuffer: Buffer) {
        let zip: AdmZip;
        try {
            zip = new AdmZip(fileBuffer);
        } catch (e) {
            throw new BadRequestException('Format file ZIP tidak valid.');
        }

        const backupEntry = zip.getEntry('backup.json');
        if (!backupEntry) {
            throw new BadRequestException('File backup.json tidak ditemukan dalam arsip ZIP.');
        }

        let jsonData: any;
        try {
            jsonData = JSON.parse(backupEntry.getData().toString('utf8'));
        } catch (e) {
            throw new BadRequestException('Format backup.json rusak atau tidak valid.');
        }

        const uploadEntries = zip.getEntries().filter(e => e.entryName.startsWith('uploads/') && !e.isDirectory);
        if (uploadEntries.length > 0) {
            for (const entry of uploadEntries) {
                zip.extractEntryTo(entry, process.cwd(), true, true);
            }
        }

        return this.importBackup(jsonData);
    }

    async importBackup(data: any) {
        if (!data?._meta?.appName || data._meta.appName !== 'LPAPP') {
            throw new BadRequestException('File backup tidak valid atau bukan dari aplikasi LPAPP.');
        }

        const report: Record<string, number> = {};

        // Import settings
        if (Array.isArray(data.settings)) {
            for (const s of data.settings) {
                await this.prisma.setting.upsert({
                    where: { key: s.key },
                    update: { value: s.value },
                    create: { key: s.key, value: s.value },
                });
            }
            report.settings = data.settings.length;
        }

        // Import kompleks
        if (Array.isArray(data.kompleks)) {
            for (const r of data.kompleks) {
                const { updatedAt, createdAt, ...rest } = r;
                await this.prisma.kompleks.upsert({
                    where: { id: r.id },
                    update: { nama: r.nama },
                    create: rest,
                }).catch(() => { });
            }
            report.kompleks = data.kompleks.length;
        }

        // Import gedung
        if (Array.isArray(data.gedung)) {
            for (const r of data.gedung) {
                const { updatedAt, createdAt, ...rest } = r;
                await this.prisma.gedung.upsert({
                    where: { id: r.id },
                    update: { nama: r.nama, kompleksId: r.kompleksId },
                    create: rest,
                }).catch(() => { });
            }
            report.gedung = data.gedung.length;
        }

        // Import kamar
        if (Array.isArray(data.kamar)) {
            for (const r of data.kamar) {
                const { updatedAt, createdAt, ...rest } = r;
                await this.prisma.kamar.upsert({
                    where: { id: r.id },
                    update: { nama: r.nama, kapasitas: r.kapasitas, gedungId: r.gedungId },
                    create: rest,
                }).catch(() => { });
            }
            report.kamar = data.kamar.length;
        }

        // Import jenjang
        if (Array.isArray(data.jenjang)) {
            for (const r of data.jenjang) {
                const { updatedAt, createdAt, ...rest } = r;
                await this.prisma.jenjang.upsert({
                    where: { id: r.id },
                    update: { nama: r.nama },
                    create: rest,
                }).catch(() => { });
            }
            report.jenjang = data.jenjang.length;
        }

        // Import tingkat
        if (Array.isArray(data.tingkat)) {
            for (const r of data.tingkat) {
                const { updatedAt, createdAt, ...rest } = r;
                await this.prisma.tingkat.upsert({
                    where: { id: r.id },
                    update: { nama: r.nama, jenjangId: r.jenjangId },
                    create: rest,
                }).catch(() => { });
            }
            report.tingkat = data.tingkat.length;
        }

        // Import kelas
        if (Array.isArray(data.kelas)) {
            for (const r of data.kelas) {
                const { updatedAt, createdAt, ...rest } = r;
                await this.prisma.kelas.upsert({
                    where: { id: r.id },
                    update: { nama: r.nama, tingkatId: r.tingkatId, tahunAjaran: r.tahunAjaran },
                    create: rest,
                }).catch(() => { });
            }
            report.kelas = data.kelas.length;
        }

        // Import santri
        if (Array.isArray(data.santri)) {
            for (const r of data.santri) {
                const { updatedAt, createdAt, ...rest } = r;
                await this.prisma.santri.upsert({
                    where: { id: r.id },
                    update: rest,
                    create: rest,
                }).catch(() => { });
            }
            report.santri = data.santri.length;
        }

        // Import nilai (skip if related santri/kelas not found)
        if (Array.isArray(data.nilai)) {
            for (const r of data.nilai) {
                const { updatedAt, createdAt, ...rest } = r;
                await this.prisma.nilai.upsert({
                    where: { id: r.id },
                    update: rest,
                    create: rest,
                }).catch(() => { });
            }
            report.nilai = data.nilai.length;
        }

        return {
            success: true,
            message: 'Backup berhasil diimpor.',
            report,
        };
    }
}

