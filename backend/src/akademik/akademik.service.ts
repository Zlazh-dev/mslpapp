import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNilaiDto, UpdateNilaiDto, QueryNilaiDto } from './dto/nilai.dto';

@Injectable()
export class AkademikService {
    constructor(private prisma: PrismaService) { }

    async findAll(query: QueryNilaiDto) {
        const where: any = {};
        if (query.santriId) where.santriId = query.santriId;
        if (query.kelasId) where.kelasId = parseInt(query.kelasId as any);
        if (query.semester) where.semester = query.semester;

        const data = await this.prisma.nilai.findMany({
            where,
            include: {
                santri: { select: { id: true, namaLengkap: true, nis: true } },
                kelas: { select: { id: true, nama: true } },
            },
            orderBy: [{ santri: { namaLengkap: 'asc' } }, { mataPelajaran: 'asc' }],
        });
        return { success: true, message: 'Data nilai berhasil diambil', data };
    }

    async findOne(id: string) {
        const nilai = await this.prisma.nilai.findUnique({
            where: { id },
            include: {
                santri: { select: { id: true, namaLengkap: true, nis: true } },
                kelas: { select: { id: true, nama: true } },
            },
        });
        if (!nilai) throw new NotFoundException('Nilai tidak ditemukan');
        return { success: true, message: 'Data nilai berhasil diambil', data: nilai };
    }

    async create(dto: CreateNilaiDto, userId: string) {
        const nilai = await this.prisma.nilai.upsert({
            where: {
                santriId_kelasId_mataPelajaran_semester: {
                    santriId: dto.santriId,
                    kelasId: typeof dto.kelasId === 'string' ? parseInt(dto.kelasId) : dto.kelasId,
                    mataPelajaran: dto.mataPelajaran,
                    semester: dto.semester,
                },
            },
            update: { nilaiHarian: dto.nilaiHarian, nilaiUTS: dto.nilaiUTS, nilaiUAS: dto.nilaiUAS },
            create: {
                ...dto,
                kelasId: typeof dto.kelasId === 'string' ? parseInt(dto.kelasId) : dto.kelasId,
                createdBy: userId,
            },
        });
        return { success: true, message: 'Nilai berhasil disimpan', data: nilai };
    }

    async update(id: string, dto: UpdateNilaiDto) {
        const existing = await this.prisma.nilai.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Nilai tidak ditemukan');
        const nilai = await this.prisma.nilai.update({ where: { id }, data: dto });
        return { success: true, message: 'Nilai berhasil diperbarui', data: nilai };
    }

    async remove(id: string) {
        const existing = await this.prisma.nilai.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Nilai tidak ditemukan');
        await this.prisma.nilai.delete({ where: { id } });
        return { success: true, message: 'Nilai berhasil dihapus', data: null };
    }
}
