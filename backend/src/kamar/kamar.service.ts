import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKamarDto, UpdateKamarDto } from './dto/kamar.dto';

@Injectable()
export class KamarService {
    constructor(private prisma: PrismaService) { }

    async findAll(gedungId?: number) {
        const data = await this.prisma.kamar.findMany({
            where: gedungId ? { gedungId } : undefined,
            include: {
                gedung: { include: { kompleks: { select: { id: true, nama: true } } } },
                pembimbings: { select: { id: true, name: true } },
                _count: { select: { santris: true } },
            },
            orderBy: { nama: 'asc' },
        });
        return { success: true, message: 'Data kamar berhasil diambil', data };
    }

    async findOne(id: number) {
        const data = await this.prisma.kamar.findUnique({
            where: { id },
            include: {
                gedung: { include: { kompleks: true } },
                pembimbings: { select: { id: true, name: true } },
                _count: { select: { santris: true } },
            },
        });
        if (!data) throw new NotFoundException('Kamar tidak ditemukan');
        return { success: true, message: 'Data kamar berhasil diambil', data };
    }

    async findSantriByKamar(id: number) {
        const kamar = await this.prisma.kamar.findUnique({ where: { id } });
        if (!kamar) throw new NotFoundException('Kamar tidak ditemukan');
        const santri = await this.prisma.santri.findMany({
            where: { kamarId: id },
            orderBy: { namaLengkap: 'asc' },
        });
        return { success: true, message: 'Data santri kamar berhasil diambil', data: santri };
    }

    async create(dto: CreateKamarDto) {
        const gedung = await this.prisma.gedung.findUnique({ where: { id: dto.gedungId } });
        if (!gedung) throw new NotFoundException('Gedung tidak ditemukan');
        const data = await this.prisma.kamar.create({
            data: {
                nama: dto.nama,
                kapasitas: dto.kapasitas,
                gedungId: dto.gedungId,
                pembimbings: dto.pembimbingIds?.length ? { connect: dto.pembimbingIds.map(id => ({ id })) } : undefined,
            },
        });
        return { success: true, message: 'Kamar berhasil dibuat', data };
    }

    async update(id: number, dto: UpdateKamarDto) {
        const existing = await this.prisma.kamar.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Kamar tidak ditemukan');

        const dataPayload: any = {
            ...(dto.nama !== undefined && { nama: dto.nama }),
            ...(dto.kapasitas !== undefined && { kapasitas: dto.kapasitas }),
            ...(dto.gedungId !== undefined && { gedungId: dto.gedungId }),
        };

        if (dto.pembimbingIds !== undefined) {
            dataPayload.pembimbings = { set: dto.pembimbingIds.map(id => ({ id })) };
        }

        const data = await this.prisma.kamar.update({
            where: { id },
            data: dataPayload,
        });
        return { success: true, message: 'Kamar berhasil diperbarui', data };
    }

    async remove(id: number) {
        const existing = await this.prisma.kamar.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Kamar tidak ditemukan');
        await this.prisma.kamar.delete({ where: { id } });
        return { success: true, message: 'Kamar berhasil dihapus', data: null };
    }
}
