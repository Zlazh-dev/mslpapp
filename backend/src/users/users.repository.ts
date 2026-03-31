import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersRepository {
    constructor(private prisma: PrismaService) {}

    async findAll() {
        return this.prisma.user.findMany({ include: { roles: true } });
    }

    async findById(id: string) {
        return this.prisma.user.findUnique({ where: { id }, include: { roles: true } });
    }

    async findByUsername(username: string) {
        return this.prisma.user.findUnique({ where: { username } });
    }

    async create(data: any) {
        return this.prisma.user.create({ data, include: { roles: true } });
    }

    async update(id: string, data: any) {
        return this.prisma.user.update({ where: { id }, data, include: { roles: true } });
    }

    async delete(id: string) {
        return this.prisma.user.delete({ where: { id } });
    }

    async assignWaliKelas(kelasId: number, userId: string) {
        return this.prisma.kelas.update({
            where: { id: kelasId },
            data: { waliKelasId: userId }
        });
    }

    async removeWaliKelasFromUser(userId: string) {
        return this.prisma.kelas.updateMany({
            where: { waliKelasId: userId },
            data: { waliKelasId: null }
        });
    }
}
