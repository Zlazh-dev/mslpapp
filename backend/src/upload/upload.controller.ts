import { Controller, Post, UploadedFile, UseInterceptors, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

function ensureDir(dir: string) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

const photoStorage = diskStorage({
    destination: (_req, _file, cb) => {
        const dir = join(UPLOAD_DIR, 'foto');
        ensureDir(dir);
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
    },
});

const kkStorage = diskStorage({
    destination: (_req, _file, cb) => {
        const dir = join(UPLOAD_DIR, 'kk');
        ensureDir(dir);
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
    },
});

@ApiTags('upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
    @Post('foto')
    @UseInterceptors(FileInterceptor('file', {
        storage: photoStorage,
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            if (!allowed.includes(file.mimetype)) {
                return cb(new BadRequestException('Hanya file gambar (JPG, PNG, WebP, GIF) yang diperbolehkan'), false);
            }
            cb(null, true);
        },
    }))
    uploadFoto(@UploadedFile() file: Express.Multer.File & { filename: string }) {
        if (!file) throw new BadRequestException('File tidak ditemukan');
        return { success: true, url: `/uploads/foto/${file.filename}` };
    }

    @Post('kk')
    @UseInterceptors(FileInterceptor('file', {
        storage: kkStorage,
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const allowed = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'image/jpeg', 'image/png', 'image/webp',
            ];
            const allowedExts = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'];
            const ext = extname(file.originalname).toLowerCase();
            if (!allowed.includes(file.mimetype) && !allowedExts.includes(ext)) {
                return cb(new BadRequestException('Format tidak didukung. Gunakan PDF, Word, atau gambar.'), false);
            }
            cb(null, true);
        },
    }))
    uploadKK(@UploadedFile() file: Express.Multer.File & { filename: string, mimetype: string, originalname: string }) {
        if (!file) throw new BadRequestException('File tidak ditemukan');
        return { success: true, url: `/uploads/kk/${file.filename}`, originalName: file.originalname, mimetype: file.mimetype };
    }
}
