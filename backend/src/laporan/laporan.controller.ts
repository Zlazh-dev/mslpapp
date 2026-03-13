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
    @Roles(Role.ADMIN, Role.STAF_PENDATAAN, Role.STAF_MADRASAH, Role.PEMBIMBING_KAMAR, Role.WALI_KELAS)
    getDashboard() { return this.laporanService.getDashboardStats(); }

    @Get('santri')
    @Roles(Role.ADMIN, Role.STAF_PENDATAAN)
    getSantri(@Query() query: any) { return this.laporanService.getSantriReport(query); }

    @Get('nilai')
    @Roles(Role.ADMIN, Role.STAF_MADRASAH, Role.WALI_KELAS)
    getNilai(@Query() query: any) { return this.laporanService.getNilaiReport(query); }
}
