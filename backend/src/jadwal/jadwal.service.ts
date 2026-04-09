import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JadwalService {
    constructor(private readonly prisma: PrismaService) {}

    async findByKelas(kelasId: number) {
        const data = await this.prisma.jadwalPelajaran.findMany({
            where: { kelasId },
            include: {
                pengajar: {
                    select: { id: true, name: true, username: true }
                }
            },
            orderBy: [
                { hari: 'asc' },
                { mataPelajaran: 'asc' }
            ]
        });

        return {
            meta: { status: 200, message: 'Data jadwal berhasil diambil' },
            data
        };
    }

    async create(data: { kelasId: number; hari: number; mataPelajaran: string; pengajarId?: string }) {
        const result = await this.prisma.jadwalPelajaran.create({
            data: {
                kelasId: data.kelasId,
                hari: data.hari,
                mataPelajaran: data.mataPelajaran,
                pengajarId: data.pengajarId || null,
            },
            include: {
                pengajar: {
                    select: { id: true, name: true, username: true }
                }
            }
        });

        return {
            meta: { status: 201, message: 'Jadwal berhasil ditambahkan' },
            data: result
        };
    }

    async remove(id: string) {
        try {
            await this.prisma.jadwalPelajaran.delete({ where: { id } });
            return {
                meta: { status: 200, message: 'Jadwal berhasil dihapus' }
            };
        } catch (error) {
            throw new NotFoundException('Jadwal tidak ditemukan');
        }
    }

    // ─── Master Guru Mapel ───────────────────

    async getGuruMapel() {
        const data = await this.prisma.guruMapel.findMany({
            include: {
                user: {
                    select: { id: true, name: true, username: true }
                }
            },
            orderBy: { user: { name: 'asc' } }
        });
        return { meta: { status: 200, message: 'Data Guru Mapel' }, data };
    }

    async addGuruMapel(data: { userId: string; mataPelajaran: string }) {
        // Cek duplicate
        const exist = await this.prisma.guruMapel.findUnique({
            where: { userId_mataPelajaran: { userId: data.userId, mataPelajaran: data.mataPelajaran } }
        });
        if (exist) {
            return { meta: { status: 400, message: 'Pengajar sudah diassign mapel ini' } };
        }

        const result = await this.prisma.guruMapel.create({
            data: {
                userId: data.userId,
                mataPelajaran: data.mataPelajaran
            },
            include: { user: { select: { id: true, name: true, username: true } } }
        });
        return { meta: { status: 201, message: 'Berhasil assign mapel' }, data: result };
    }

    async removeGuruMapel(id: string) {
        try {
            await this.prisma.guruMapel.delete({ where: { id } });
            return { meta: { status: 200, message: 'Berhasil dihapus' } };
        } catch {
            throw new NotFoundException('Data tidak ditemukan');
        }
    }

    // ─── Master Mata Pelajaran ───────────────────

    async getMataPelajaran() {
        const data = await this.prisma.mataPelajaran.findMany({
            orderBy: { nama: 'asc' }
        });
        return { meta: { status: 200, message: 'Data Mapel' }, data };
    }

    async addMataPelajaran(data: { nama: string }) {
        if (!data.nama) throw new NotFoundException('Nama mapel kosong');
        const exist = await this.prisma.mataPelajaran.findUnique({ where: { nama: data.nama } });
        if (exist) {
            return { meta: { status: 400, message: 'Mata pelajaran ini sudah ada' } };
        }
        const result = await this.prisma.mataPelajaran.create({ data: { nama: data.nama } });
        return { meta: { status: 201, message: 'Mapel ditambahkan' }, data: result };
    }

    async removeMataPelajaran(id: string) {
        try {
            await this.prisma.mataPelajaran.delete({ where: { id } });
            return { meta: { status: 200, message: 'Mapel dihapus' } };
        } catch {
            throw new NotFoundException('Mapel tidak ditemukan');
        }
    }
}
