import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModelKhidmahDto, UpdateModelKhidmahDto, CreateDataKhidmahDto } from './dto/khidmah.dto';

@Injectable()
export class KhidmahService {
    constructor(private prisma: PrismaService) { }

    // ═══════════════════════════════════════════════════════════════════════════
    // MODEL KHIDMAH (Variabel/Kategori)
    // ═══════════════════════════════════════════════════════════════════════════

    async findAllModels() {
        return this.prisma.modelKhidmah.findMany({
            include: { _count: { select: { dataKhidmah: true } } },
            orderBy: { nama: 'asc' },
        });
    }

    async createModel(dto: CreateModelKhidmahDto) {
        try {
            return await this.prisma.modelKhidmah.create({ data: dto });
        } catch (e: any) {
            if (e.code === 'P2002') throw new ConflictException(`Model khidmah "${dto.nama}" sudah ada`);
            throw e;
        }
    }

    async updateModel(id: string, dto: UpdateModelKhidmahDto) {
        try {
            return await this.prisma.modelKhidmah.update({ where: { id }, data: dto });
        } catch (e: any) {
            if (e.code === 'P2025') throw new NotFoundException('Model khidmah tidak ditemukan');
            if (e.code === 'P2002') throw new ConflictException(`Model khidmah "${dto.nama}" sudah ada`);
            throw e;
        }
    }

    async removeModel(id: string) {
        try {
            return await this.prisma.modelKhidmah.delete({ where: { id } });
        } catch (e: any) {
            if (e.code === 'P2025') throw new NotFoundException('Model khidmah tidak ditemukan');
            throw e;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DATA KHIDMAH (Assignment Santri ↔ Khidmah)
    // ═══════════════════════════════════════════════════════════════════════════

    async findAllData(modelKhidmahId?: string) {
        return this.prisma.dataKhidmah.findMany({
            where: modelKhidmahId ? { modelKhidmahId } : undefined,
            include: {
                santri: { select: { id: true, nis: true, namaLengkap: true, foto: true, status: true } },
                modelKhidmah: { select: { id: true, nama: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findBySantri(santriId: string) {
        return this.prisma.dataKhidmah.findMany({
            where: { santriId },
            include: { modelKhidmah: { select: { id: true, nama: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    async createData(dto: CreateDataKhidmahDto) {
        // Resolve NIS → santriId
        const santri = await this.prisma.santri.findUnique({ where: { nis: dto.nis } });
        if (!santri) throw new NotFoundException(`Santri dengan NIS "${dto.nis}" tidak ditemukan`);

        try {
            return await this.prisma.dataKhidmah.create({
                data: {
                    santriId: santri.id,
                    modelKhidmahId: dto.modelKhidmahId,
                    keterangan: dto.keterangan,
                },
                include: {
                    santri: { select: { id: true, nis: true, namaLengkap: true } },
                    modelKhidmah: { select: { id: true, nama: true } },
                },
            });
        } catch (e: any) {
            if (e.code === 'P2002') throw new ConflictException(`Santri "${santri.namaLengkap}" sudah memiliki khidmah ini`);
            throw e;
        }
    }

    async removeData(id: string) {
        try {
            return await this.prisma.dataKhidmah.delete({ where: { id } });
        } catch (e: any) {
            if (e.code === 'P2025') throw new NotFoundException('Data khidmah tidak ditemukan');
            throw e;
        }
    }
}
