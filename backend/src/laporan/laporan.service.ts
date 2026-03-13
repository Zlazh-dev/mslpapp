import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LaporanService {
    constructor(private prisma: PrismaService) { }

    async getSantriReport(query: { status?: string; kelasId?: string; kamarId?: string }) {
        const where: any = {};
        if (query.status) where.status = query.status;
        if (query.kelasId) where.kelasId = parseInt(query.kelasId);
        if (query.kamarId) where.kamarId = parseInt(query.kamarId);

        const data = await this.prisma.santri.findMany({
            where,
            include: {
                kelas: { select: { id: true, nama: true } },
                kamar: { select: { id: true, nama: true } },
            },
            orderBy: { namaLengkap: 'asc' },
        });

        return {
            success: true,
            message: 'Laporan santri berhasil diambil',
            data,
            meta: { total: data.length },
        };
    }

    async getNilaiReport(query: { kelasId?: string; santriId?: string; semester?: string }) {
        const where: any = {};
        if (query.kelasId) where.kelasId = parseInt(query.kelasId);
        if (query.santriId) where.santriId = query.santriId;
        if (query.semester) where.semester = query.semester;

        const data = await this.prisma.nilai.findMany({
            where,
            include: {
                santri: { select: { id: true, namaLengkap: true, nis: true } },
                kelas: { select: { id: true, nama: true } },
            },
            orderBy: [{ santri: { namaLengkap: 'asc' } }, { mataPelajaran: 'asc' }],
        });

        return {
            success: true,
            message: 'Laporan nilai berhasil diambil',
            data,
            meta: { total: data.length },
        };
    }

    async getDashboardStats() {
        const [totalSantri, totalKelas, totalKamar, totalUsers, santriActive, santriInactive] = await Promise.all([
            this.prisma.santri.count(),
            this.prisma.kelas.count(),
            this.prisma.kamar.count(),
            this.prisma.user.count(),
            this.prisma.santri.count({ where: { status: 'ACTIVE' } }),
            this.prisma.santri.count({ where: { status: 'INACTIVE' } }),
        ]);

        return {
            success: true,
            message: 'Statistik dashboard berhasil diambil',
            data: { totalSantri, totalKelas, totalKamar, totalUsers, santriActive, santriInactive },
        };
    }
}
