import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SantriRepository {
    constructor(private prisma: PrismaService) {}

    async findById(id: string) {
        return this.prisma.santri.findUnique({ where: { id } });
    }

    async findByNis(nis: string) {
        return this.prisma.santri.findUnique({ where: { nis } });
    }

    async findAllNisOnly() {
        return this.prisma.santri.findMany({ select: { nis: true } });
    }

    async findHighestNisByYear(yearPrefix: string) {
        const santris = await this.prisma.santri.findMany({
            where: { nis: { startsWith: yearPrefix } },
            orderBy: { nis: 'desc' },
            take: 1
        });
        return santris.length > 0 ? santris[0] : null;
    }

    async findAllWithRelationsAndCount(where: any, skip: number, take: number) {
        return Promise.all([
            this.prisma.santri.findMany({ 
                where, 
                skip, 
                take, 
                include: { kelas: true, kamar: { include: { gedung: true } } } 
            }),
            this.prisma.santri.count({ where })
        ]);
    }

    async findByIdWithFullRelations(id: string) {
        return this.prisma.santri.findUnique({
            where: { id },
            include: { kelas: true, kamar: { include: { gedung: true } } }
        });
    }

    async create(data: any) {
        return this.prisma.santri.create({ data });
    }

    async update(id: string, data: any) {
        return this.prisma.santri.update({ where: { id }, data });
    }

    async remove(id: string) {
        return this.prisma.santri.delete({ where: { id } });
    }
}
