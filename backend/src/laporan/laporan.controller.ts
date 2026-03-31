import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LaporanService } from './laporan.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('laporan')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('laporan')
export class LaporanController {
    constructor(private readonly laporanService: LaporanService) { }

    @Get('dashboard')
    @Roles('ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'PEMBIMBING_KAMAR', 'WALI_KELAS')
    getDashboard() { return this.laporanService.getDashboardStats(); }

    @Get('santri')
    @Roles('ADMIN', 'STAF_PENDATAAN')
    getSantri(@Query() query: any) { return this.laporanService.getSantriReport(query); }

    @Get('nilai')
    @Roles('ADMIN', 'STAF_MADRASAH', 'WALI_KELAS')
    getNilai(@Query() query: any) { return this.laporanService.getNilaiReport(query); }
}
