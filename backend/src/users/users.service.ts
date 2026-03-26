import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        const users = await this.prisma.user.findMany({
            select: {
                id: true, name: true, username: true, role: true, createdAt: true,
                kelasWali: { select: { id: true, nama: true } },
                kamarBimbing: { select: { id: true, nama: true } },
                santri: { select: { id: true, nis: true } },
            },
        });
        return { success: true, message: 'Data pengguna berhasil diambil', data: users };
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true, name: true, username: true, role: true, createdAt: true,
                kelasWali: { select: { id: true, nama: true } },
                kamarBimbing: { select: { id: true, nama: true } },
                santri: { select: { id: true, nis: true } },
            },
        });
        if (!user) throw new NotFoundException('Pengguna tidak ditemukan');
        return { success: true, message: 'Data pengguna berhasil diambil', data: user };
    }

    async create(dto: CreateUserDto) {
        if (dto.username) {
            const existing = await this.prisma.user.findUnique({ where: { username: dto.username } });
            if (existing) throw new ConflictException('Username sudah terdaftar');
        }

        const { kelasId, kamarId, ...userData } = dto;
        const hashed = await bcrypt.hash(userData.password, 10);
        if (userData.username === '') userData.username = null;

        const user = await this.prisma.user.create({
            data: {
                ...userData,
                password: hashed,
                ...(kamarId && { kamarBimbingId: parseInt(kamarId) }),
            },
            select: { id: true, name: true, username: true, role: true, createdAt: true },
        });

        // Assign wali kelas: update field waliKelasId di model Kelas
        if (kelasId) {
            await this.prisma.kelas.update({
                where: { id: parseInt(kelasId) },
                data: { waliKelasId: user.id },
            });
        }

        return { success: true, message: 'Pengguna berhasil dibuat', data: user };
    }

    async update(id: string, dto: UpdateUserDto) {
        const existing = await this.prisma.user.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Pengguna tidak ditemukan');

        const { kelasId, kamarId, ...userData } = dto;
        const data: any = { ...userData };
        if (data.username === '') data.username = null;
        if (dto.password) data.password = await bcrypt.hash(dto.password, 10);

        const user = await this.prisma.user.update({
            where: { id },
            data,
            select: { id: true, name: true, username: true, role: true, updatedAt: true },
        });

        // Update wali kelas jika diberikan
        if (kelasId !== undefined) {
            // Lepas kelas lama yang mungkin dipegang user ini
            await this.prisma.kelas.updateMany({
                where: { waliKelasId: id },
                data: { waliKelasId: null },
            });
            if (kelasId) {
                await this.prisma.kelas.update({
                    where: { id: parseInt(kelasId) },
                    data: { waliKelasId: id },
                });
            }
        }

        // Update pembimbing kamar jika diberikan
        if (kamarId !== undefined) {
            await this.prisma.user.update({
                where: { id },
                data: { kamarBimbingId: kamarId ? parseInt(kamarId) : null },
            });
        }

        return { success: true, message: 'Pengguna berhasil diperbarui', data: user };
    }

    async remove(id: string) {
        const existing = await this.prisma.user.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Pengguna tidak ditemukan');
        await this.prisma.user.delete({ where: { id } });
        return { success: true, message: 'Pengguna berhasil dihapus', data: null };
    }
}
