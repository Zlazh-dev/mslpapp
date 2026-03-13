import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSantriDto, UpdateSantriDto, QuerySantriDto } from './dto/santri.dto';
import { StatusSantri } from '@prisma/client';

@Injectable()
export class SantriService {
    constructor(private prisma: PrismaService) { }

    async getAngkatan() {
        const all = await this.prisma.santri.findMany({ select: { nis: true }, orderBy: { nis: 'asc' } });
        const years = [...new Set(all.map(s => s.nis.substring(0, 2)).filter(y => /^\d{2}$/.test(y)))];
        years.sort((a, b) => Number(b) - Number(a));
        return { success: true, data: years };
    }

    async findAll(query: QuerySantriDto) {
        const { search, kelasId, kamarId, status, jenjangPendidikan, nisYear, page = '1', limit = '10' } = query as any;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where: any = {};
        if (search) {
            where.OR = [
                { namaLengkap: { contains: search, mode: 'insensitive' } },
                { nis: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (kelasId) where.kelasId = parseInt(kelasId);
        if (kamarId) where.kamarId = parseInt(kamarId);
        if (status) where.status = status as StatusSantri;
        if (jenjangPendidikan) where.jenjangPendidikan = { contains: jenjangPendidikan, mode: 'insensitive' };
        if (nisYear) where.nis = { startsWith: nisYear };

        const [data, total] = await Promise.all([
            this.prisma.santri.findMany({
                where, skip, take: parseInt(limit),
                include: {
                    kelas: { select: { id: true, nama: true } },
                    kamar: { select: { id: true, nama: true, gedung: { include: { kompleks: { select: { id: true, nama: true } } } } } },
                },
                orderBy: { nis: 'asc' },
            }),
            this.prisma.santri.count({ where }),
        ]);

        return {
            success: true,
            message: 'Data santri berhasil diambil',
            data,
            meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
        };
    }

    async findOne(id: string) {
        const santri = await this.prisma.santri.findUnique({
            where: { id },
            include: {
                kelas: { include: { tingkat: { include: { jenjang: true } } } },
                kamar: { include: { gedung: { include: { kompleks: true } } } },
                nilai: { orderBy: { mataPelajaran: 'asc' } },
            },
        });
        if (!santri) throw new NotFoundException('Santri tidak ditemukan');
        return { success: true, message: 'Data santri berhasil diambil', data: santri };
    }

    async create(dto: CreateSantriDto) {
        const existing = await this.prisma.santri.findUnique({ where: { nis: dto.nis } });
        if (existing) throw new ConflictException('NIS sudah terdaftar');

        const autoStatus: StatusSantri = dto.tanggalKeluar ? StatusSantri.INACTIVE : StatusSantri.ACTIVE;

        const santri = await this.prisma.santri.create({
            data: {
                ...dto,
                tanggalLahir: new Date(dto.tanggalLahir),
                tanggalMasuk: dto.tanggalMasuk ? new Date(dto.tanggalMasuk) : undefined,
                tanggalKeluar: dto.tanggalKeluar ? new Date(dto.tanggalKeluar) : undefined,
                status: autoStatus,
                kelasId: dto.kelasId ?? undefined,
                kamarId: dto.kamarId ?? undefined,
            },
        });
        return { success: true, message: 'Santri berhasil ditambahkan', data: santri };
    }

    async update(id: string, dto: UpdateSantriDto) {
        const existing = await this.prisma.santri.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Santri tidak ditemukan');

        const data: any = { ...dto };

        // Auto-derive status from tanggalKeluar
        if ('tanggalKeluar' in dto) {
            if (dto.tanggalKeluar) {
                data.tanggalKeluar = new Date(dto.tanggalKeluar);
                data.status = StatusSantri.INACTIVE;
            } else {
                data.tanggalKeluar = null;
                data.status = StatusSantri.ACTIVE;
            }
        }
        if (dto.tanggalLahir) data.tanggalLahir = new Date(dto.tanggalLahir);
        if (dto.tanggalMasuk) data.tanggalMasuk = new Date(dto.tanggalMasuk);
        if ('kelasId' in dto) data.kelasId = dto.kelasId ?? null;
        if ('kamarId' in dto) data.kamarId = dto.kamarId ?? null;

        // Never allow manual status override
        delete data.status_override;

        const santri = await this.prisma.santri.update({ where: { id }, data });
        return { success: true, message: 'Santri berhasil diperbarui', data: santri };
    }

    async remove(id: string) {
        const existing = await this.prisma.santri.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Santri tidak ditemukan');
        await this.prisma.santri.delete({ where: { id } });
        return { success: true, message: 'Santri berhasil dihapus', data: null };
    }
}
