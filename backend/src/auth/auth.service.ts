import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async login(loginDto: LoginDto) {
        const { username, password } = loginDto;

        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { username: username },
                    { santri: { nis: username } }
                ]
            },
            include: { santri: true, roles: true }
        });
        if (!user) {
            throw new UnauthorizedException('Username atau password salah');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Username atau password salah');
        }

        // Rekam aktivitas login
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        });

        const rolesStr = (user as any).roles ? (user as any).roles.map((r: any) => r.name) : [];

        const payload = {
            sub: user.id,
            username: user.username,
            roles: rolesStr,
        };

        const token = this.jwtService.sign(payload);

        return {
            success: true,
            message: 'Login berhasil',
            data: {
                access_token: token,
                user: {
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    roles: rolesStr,
                },
            },
        };
    }

    async getMe(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                username: true,
                roles: { select: { name: true } },
                createdAt: true,
                kelasWali: { select: { id: true, nama: true } },
                kamarBimbing: { select: { id: true, nama: true } },
            },
        });

        const mappedUser = {
            ...user,
            roles: user?.roles.map(r => r.name) || [],
        };

        return {
            success: true,
            message: 'Data user berhasil diambil',
            data: mappedUser,
        };
    }
}
