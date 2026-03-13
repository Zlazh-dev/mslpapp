import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKompleksDto, UpdateKompleksDto } from './dto/kompleks.dto';

@Injectable()
export class KompleksService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        const data = await this.prisma.kompleks.findMany({
            include: { gedungs: { include: { kamars: { select: { id: true } } } } },
            orderBy: { nama: 'asc' },
        });
        return { success: true, message: 'Data kompleks berhasil diambil', data };
    }

    async findOne(id: number) {
        const data = await this.prisma.kompleks.findUnique({
            where: { id },
            include: { gedungs: { include: { kamars: true } } },
        });
        if (!data) throw new NotFoundException('Kompleks tidak ditemukan');
        return { success: true, message: 'Data kompleks berhasil diambil', data };
    }

    async create(dto: CreateKompleksDto) {
        const data = await this.prisma.kompleks.create({ data: dto });
        return { success: true, message: 'Kompleks berhasil dibuat', data };
    }

    async update(id: number, dto: UpdateKompleksDto) {
        const existing = await this.prisma.kompleks.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Kompleks tidak ditemukan');
        const data = await this.prisma.kompleks.update({ where: { id }, data: dto });
        return { success: true, message: 'Kompleks berhasil diperbarui', data };
    }

    async remove(id: number) {
        const existing = await this.prisma.kompleks.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Kompleks tidak ditemukan');
        await this.prisma.kompleks.delete({ where: { id } });
        return { success: true, message: 'Kompleks berhasil dihapus', data: null };
    }
}
