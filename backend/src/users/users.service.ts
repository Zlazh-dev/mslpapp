import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(
        private readonly usersRepo: UsersRepository,
        private readonly prisma: PrismaService // Temporarily retaining for any non-abstracted methods if needed, though replaced mostly
    ) { }

    async findAll() {
        const users = await this.usersRepo.findAll();
        // Map database relations into frontend-friendly flat roles string[]
        const mappedUsers = users.map(user => ({
            ...user,
            roles: user.roles.map(r => r.name),
        }));
        return { success: true, message: 'Data pengguna berhasil diambil', data: mappedUsers };
    }

    async findOne(id: string) {
        const user = await this.usersRepo.findById(id);
        if (!user) throw new NotFoundException('Pengguna tidak ditemukan');
        const mappedUser = {
            ...user,
            roles: user.roles.map(r => r.name),
        };
        return { success: true, message: 'Data pengguna berhasil diambil', data: mappedUser };
    }

    async create(dto: CreateUserDto) {
        if (dto.username) {
            const existing = await this.usersRepo.findByUsername(dto.username);
            if (existing) throw new ConflictException('Username sudah terdaftar');
        }

        const { kelasId, kamarId, roles, santriNis, ...userData } = dto as any;
        const hashed = await bcrypt.hash(userData.password, 10);
        if (userData.username === '') userData.username = null;

        let santriIdToConnect = undefined;
        if (santriNis) {
            const santri = await this.prisma.santri.findUnique({ where: { nis: santriNis } });
            if (!santri) throw new NotFoundException('Santri dengan NIS tersebut tidak ditemukan');
            santriIdToConnect = santri.id;
        }

        const user = await this.usersRepo.create({
            ...userData,
            password: hashed,
            ...(kamarId ? { kamarBimbingId: parseInt(kamarId) } : {}),
            ...(santriIdToConnect ? { santriId: santriIdToConnect } : {}),
            roles: {
                connect: (roles && roles.length > 0) ? roles.map((r: string) => ({ name: r })) : [{ name: 'STAF_PENDATAAN' }]
            }
        });

        if (kelasId) {
            await this.usersRepo.assignWaliKelas(parseInt(kelasId), user.id);
        }

        const mappedUser = {
            ...user,
            roles: user.roles.map(r => r.name),
        };

        return { success: true, message: 'Pengguna berhasil dibuat', data: mappedUser };
    }

    async update(id: string, dto: UpdateUserDto) {
        const existing = await this.usersRepo.findById(id);
        if (!existing) throw new NotFoundException('Pengguna tidak ditemukan');

        const { kelasId, kamarId, roles, santriNis, ...userData } = dto as any;
        const data: any = { ...userData };
        if (data.username === '') data.username = null;
        if (userData.password) data.password = await bcrypt.hash(userData.password, 10);

        if (santriNis) {
            const santri = await this.prisma.santri.findUnique({ where: { nis: santriNis } });
            if (!santri) throw new NotFoundException('Santri dengan NIS tersebut tidak ditemukan');
            data.santriId = santri.id;
        }

        if (roles && roles.length > 0) {
            data.roles = {
                set: roles.map((r: string) => ({ name: r }))
            };
        }

        const user = await this.usersRepo.update(id, data);

        if (kelasId !== undefined) {
            await this.usersRepo.removeWaliKelasFromUser(id);
            if (kelasId) {
                await this.usersRepo.assignWaliKelas(parseInt(kelasId), id);
            }
        }

        if (kamarId !== undefined) {
            await this.usersRepo.update(id, {
                kamarBimbingId: kamarId ? parseInt(kamarId) : null
            });
        }

        const mappedUser = {
            ...user,
            roles: user.roles.map(r => r.name),
        };

        return { success: true, message: 'Pengguna berhasil diperbarui', data: mappedUser };
    }

    async remove(id: string) {
        const existing = await this.usersRepo.findById(id);
        if (!existing) throw new NotFoundException('Pengguna tidak ditemukan');
        await this.usersRepo.delete(id);
        return { success: true, message: 'Pengguna berhasil dihapus', data: null };
    }
}
