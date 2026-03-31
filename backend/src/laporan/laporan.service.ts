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
        const now = new Date();
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(now.getMonth() - 11);
        twelveMonthsAgo.setDate(1);

        const [totalSantri, totalKelas, totalKamar, totalUsers, santriActive, santriInactive] = await Promise.all([
            this.prisma.santri.count(),
            this.prisma.kelas.count(),
            this.prisma.kamar.count(),
            this.prisma.user.count(),
            this.prisma.santri.count({ where: { status: 'ACTIVE' } }),
            this.prisma.santri.count({ where: { status: 'INACTIVE' } }),
        ]);

        const rawPendaftaran = await this.prisma.santri.findMany({
            where: { tanggalMasuk: { gte: twelveMonthsAgo } },
            select: { tanggalMasuk: true }
        });

        const rawMutasi = await this.prisma.santri.findMany({
            where: { tanggalKeluar: { gte: twelveMonthsAgo } },
            select: { tanggalKeluar: true }
        });

        const countsPendaftaran: Record<string, number> = {};
        rawPendaftaran.forEach(s => {
            if (s.tanggalMasuk) {
                const k = `${s.tanggalMasuk.getFullYear()}-${String(s.tanggalMasuk.getMonth() + 1).padStart(2, '0')}`;
                countsPendaftaran[k] = (countsPendaftaran[k] || 0) + 1;
            }
        });

        const countsMutasi: Record<string, number> = {};
        rawMutasi.forEach(s => {
            if (s.tanggalKeluar) {
                const k = `${s.tanggalKeluar.getFullYear()}-${String(s.tanggalKeluar.getMonth() + 1).padStart(2, '0')}`;
                countsMutasi[k] = (countsMutasi[k] || 0) + 1;
            }
        });

        const seriesData = [];
        for (let i = 0; i < 12; i++) {
            const d = new Date(twelveMonthsAgo);
            d.setMonth(d.getMonth() + i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const monthName = d.toLocaleDateString('id-ID', { month: 'short' }) + ' ' + d.getFullYear().toString().substr(-2);
            seriesData.push({
                name: monthName,
                pendaftaran: countsPendaftaran[key] || 0,
                mutasi: countsMutasi[key] || 0
            });
        }

        const rawKelasDist = await this.prisma.kelas.findMany({ 
            include: { 
                _count: { select: { santris: true } },
                tingkat: { include: { jenjang: true } }
            } 
        });
        const kelasDistribution = rawKelasDist.map(k => ({ 
            name: `${k.tingkat?.jenjang?.nama || 'Unknown'} - ${k.tingkat?.nama || 'Unknown'} - ${k.nama}`, 
            count: k._count.santris 
        })).sort((a, b) => b.count - a.count);

        const rawKamarDist = await this.prisma.kamar.findMany({ 
            include: { 
                _count: { select: { santris: true } },
                gedung: true
            } 
        });
        const kamarDistribution = rawKamarDist.map(k => ({ 
            name: `${k.gedung?.nama || 'Unknown'} - ${k.nama}`, 
            count: k._count.santris 
        })).sort((a, b) => b.count - a.count);
        
        const overcapacityRooms = rawKamarDist.filter(k => k.kapasitas && k._count.santris > k.kapasitas).length;
        const unassignedSantri = await this.prisma.santri.count({ where: { status: 'ACTIVE', OR: [{ kelasId: null }, { kamarId: null }] } });

        const allUsers = await this.prisma.user.findMany({ include: { roles: true } });
        const rolesCount: Record<string, number> = {};
        allUsers.forEach(u => u.roles.forEach(r => { rolesCount[r.name] = (rolesCount[r.name] || 0) + 1; }));
        const userDistribution = Object.keys(rolesCount).map(role => ({ role, count: rolesCount[role] }));

        const systemHealth = {
            version: 'LPAPP v1.2.0',
            serviceStatus: 'OK',
            lastBackup: new Date(Date.now() - 3600000 * 5).toISOString() // Simulated 5 hours ago
        };

        return {
            success: true,
            message: 'Statistik dashboard berhasil diambil',
            data: { 
                summary: { totalSantri, totalKelas, totalKamar, totalUsers, santriActive, santriInactive },
                seriesData,
                kelasDistribution: kelasDistribution.slice(0, 10),
                kamarDistribution: kamarDistribution.slice(0, 10),
                userDistribution,
                anomalies: { overcapacityRooms, unassignedSantri },
                systemHealth
            },
        };
    }
}

