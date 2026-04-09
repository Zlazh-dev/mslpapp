import {
    Controller, Get, Post, Body, UseGuards, Res, HttpCode, HttpStatus, UseInterceptors, UploadedFile, BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('backup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('backup')
export class BackupController {
    constructor(private readonly backupService: BackupService) { }

    @Get('export')
    @Roles('ADMIN')
    async exportBackup(@Res() res: Response) {
        const buffer = await this.backupService.exportZipBackup();
        const filename = `mslpapp_backup_${new Date().toISOString().slice(0, 10)}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }

    @Post('import')
    @Roles('ADMIN')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('file'))
    async importBackup(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('File ZIP tidak ditemukan');
        return this.backupService.importZipBackup(file.buffer);
    }
}
