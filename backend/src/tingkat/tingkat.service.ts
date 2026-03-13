import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTingkatDto, UpdateTingkatDto } from './dto/tingkat.dto';

@Injectable()
export class TingkatService {
    constructor(private prisma: PrismaService) { }

    async findAll(jenjangId?: number) {
        const where = jenjangId ? { jenjangId } : {};
        const data = await this.prisma.tingkat.findMany({
            where,
            include: {
                jenjang: { select: { id: true, nama: true } },
                kelas: { select: { id: true } },
            },
            orderBy: { nama: 'asc' },
        });
        return { success: true, message: 'Data tingkat berhasil diambil', data };
    }

    async create(dto: CreateTingkatDto) {
        const jenjang = await this.prisma.jenjang.findUnique({ where: { id: dto.jenjangId } });
        if (!jenjang) throw new NotFoundException('Jenjang tidak ditemukan');
        const data = await this.prisma.tingkat.create({ data: dto });
        return { success: true, message: 'Tingkat berhasil dibuat', data };
    }

    async update(id: number, dto: UpdateTingkatDto) {
        const existing = await this.prisma.tingkat.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Tingkat tidak ditemukan');
        const data = await this.prisma.tingkat.update({ where: { id }, data: dto });
        return { success: true, message: 'Tingkat berhasil diperbarui', data };
    }

    async remove(id: number) {
        const existing = await this.prisma.tingkat.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Tingkat tidak ditemukan');
        await this.prisma.tingkat.delete({ where: { id } });
        return { success: true, message: 'Tingkat berhasil dihapus', data: null };
    }
}
