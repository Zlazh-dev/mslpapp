import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJenjangDto, UpdateJenjangDto } from './dto/jenjang.dto';

@Injectable()
export class JenjangService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        const data = await this.prisma.jenjang.findMany({
            include: { tingkats: { include: { kelas: { select: { id: true } } } } },
            orderBy: { nama: 'asc' },
        });
        return { success: true, message: 'Data jenjang berhasil diambil', data };
    }

    async create(dto: CreateJenjangDto) {
        const data = await this.prisma.jenjang.create({ data: dto });
        return { success: true, message: 'Jenjang berhasil dibuat', data };
    }

    async update(id: number, dto: UpdateJenjangDto) {
        const existing = await this.prisma.jenjang.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Jenjang tidak ditemukan');
        const data = await this.prisma.jenjang.update({ where: { id }, data: dto });
        return { success: true, message: 'Jenjang berhasil diperbarui', data };
    }

    async remove(id: number) {
        const existing = await this.prisma.jenjang.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Jenjang tidak ditemukan');
        await this.prisma.jenjang.delete({ where: { id } });
        return { success: true, message: 'Jenjang berhasil dihapus', data: null };
    }
}
