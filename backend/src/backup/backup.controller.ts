import {
    Controller, Get, Post, Body, UseGuards, Res, HttpCode, HttpStatus,
} from '@nestjs/common';
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
    @Roles(Role.ADMIN)
    async exportBackup(@Res() res: Response) {
        const data = await this.backupService.exportBackup();
        const filename = `mslpapp_backup_${new Date().toISOString().slice(0, 10)}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(JSON.stringify(data, null, 2));
    }

    @Post('import')
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    async importBackup(@Body() data: any) {
        return this.backupService.importBackup(data);
    }
}
