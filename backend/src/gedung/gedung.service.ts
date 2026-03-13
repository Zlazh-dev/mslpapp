import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGedungDto, UpdateGedungDto } from './dto/gedung.dto';

@Injectable()
export class GedungService {
    constructor(private prisma: PrismaService) { }

    async findAll(kompleksId?: number) {
        const where = kompleksId ? { kompleksId } : {};
        const data = await this.prisma.gedung.findMany({
            where,
            include: {
                kompleks: { select: { id: true, nama: true } },
                kamars: { select: { id: true } },
            },
            orderBy: { nama: 'asc' },
        });
        return { success: true, message: 'Data gedung berhasil diambil', data };
    }

    async create(dto: CreateGedungDto) {
        const kompleks = await this.prisma.kompleks.findUnique({ where: { id: dto.kompleksId } });
        if (!kompleks) throw new NotFoundException('Kompleks tidak ditemukan');
        const data = await this.prisma.gedung.create({ data: dto });
        return { success: true, message: 'Gedung berhasil dibuat', data };
    }

    async update(id: number, dto: UpdateGedungDto) {
        const existing = await this.prisma.gedung.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Gedung tidak ditemukan');
        const data = await this.prisma.gedung.update({ where: { id }, data: dto });
        return { success: true, message: 'Gedung berhasil diperbarui', data };
    }

    async remove(id: number) {
        const existing = await this.prisma.gedung.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Gedung tidak ditemukan');
        await this.prisma.gedung.delete({ where: { id } });
        return { success: true, message: 'Gedung berhasil dihapus', data: null };
    }
}
