import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKelasDto, UpdateKelasDto } from './dto/kelas.dto';

@Injectable()
export class KelasService {
    constructor(private prisma: PrismaService) { }

    async findAll(tingkatId?: number) {
        const data = await this.prisma.kelas.findMany({
            where: tingkatId ? { tingkatId } : undefined,
            include: {
                tingkat: { include: { jenjang: { select: { id: true, nama: true } } } },
                waliKelas: { select: { id: true, name: true } },
                _count: { select: { santris: true } },
            },
            orderBy: { nama: 'asc' },
        });
        return { success: true, message: 'Data kelas berhasil diambil', data };
    }

    async findOne(id: number) {
        const data = await this.prisma.kelas.findUnique({
            where: { id },
            include: {
                tingkat: { include: { jenjang: true } },
                waliKelas: { select: { id: true, name: true } },
                santris: {
                    select: { id: true, nis: true, namaLengkap: true, gender: true, status: true },
                    orderBy: { namaLengkap: 'asc' },
                },
            },
        });
        if (!data) throw new NotFoundException('Kelas tidak ditemukan');
        return { success: true, message: 'Data kelas berhasil diambil', data };
    }

    async findSantriByKelas(id: number) {
        const kelas = await this.prisma.kelas.findUnique({ where: { id } });
        if (!kelas) throw new NotFoundException('Kelas tidak ditemukan');
        const santri = await this.prisma.santri.findMany({
            where: { kelasId: id },
            orderBy: { namaLengkap: 'asc' },
        });
        return { success: true, message: 'Data santri kelas berhasil diambil', data: santri };
    }

    async create(dto: CreateKelasDto) {
        const tingkat = await this.prisma.tingkat.findUnique({ where: { id: dto.tingkatId } });
        if (!tingkat) throw new NotFoundException('Tingkat tidak ditemukan');
        const data = await this.prisma.kelas.create({
            data: {
                nama: dto.nama,
                tahunAjaran: dto.tahunAjaran,
                tingkatId: dto.tingkatId,
                waliKelasId: dto.waliKelasId || null,
            },
        });
        return { success: true, message: 'Kelas berhasil dibuat', data };
    }

    async update(id: number, dto: UpdateKelasDto) {
        const existing = await this.prisma.kelas.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Kelas tidak ditemukan');

        // If assigning a new wali kelas, first unassign them from any other kelas (prevent double-assignment)
        if (dto.waliKelasId && dto.waliKelasId !== existing.waliKelasId) {
            await this.prisma.kelas.updateMany({
                where: { waliKelasId: dto.waliKelasId, id: { not: id } },
                data: { waliKelasId: null },
            });
        }

        const data = await this.prisma.kelas.update({
            where: { id },
            data: {
                ...(dto.nama !== undefined && { nama: dto.nama }),
                ...(dto.tahunAjaran !== undefined && { tahunAjaran: dto.tahunAjaran }),
                ...(dto.tingkatId !== undefined && { tingkatId: dto.tingkatId }),
                ...('waliKelasId' in dto && { waliKelasId: dto.waliKelasId || null }),
            },
        });
        return { success: true, message: 'Kelas berhasil diperbarui', data };
    }

    async remove(id: number) {
        const existing = await this.prisma.kelas.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Kelas tidak ditemukan');
        await this.prisma.kelas.delete({ where: { id } });
        return { success: true, message: 'Kelas berhasil dihapus', data: null };
    }
}
