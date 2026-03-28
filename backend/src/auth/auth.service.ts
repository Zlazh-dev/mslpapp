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
            include: { santri: true }
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

        const payload = {
            sub: user.id,
            username: user.username,
            role: user.role,
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
                    role: user.role,
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
                role: true,
                createdAt: true,
                kelasWali: { select: { id: true, nama: true } },
                kamarBimbing: { select: { id: true, nama: true } },
            },
        });

        return {
            success: true,
            message: 'Data user berhasil diambil',
            data: user,
        };
    }
}
