import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { JadwalService } from './jadwal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('jadwal')
export class JadwalController {
    constructor(private readonly jadwalService: JadwalService) {}

    @Roles('ADMIN', 'STAF_MADRASAH', 'WALI_KELAS')
    @Get('hari/:hari')
    findByHari(@Param('hari') hari: string) {
        return this.jadwalService.findByHari(Number(hari));
    }

    @Roles('ADMIN', 'STAF_MADRASAH', 'WALI_KELAS')
    @Get()
    findByKelas(@Query('kelasId') kelasId: string) {
        if (!kelasId) {
            return { meta: { status: 400, message: 'kelasId is required' } };
        }
        return this.jadwalService.findByKelas(Number(kelasId));
    }

    @Roles('ADMIN', 'STAF_MADRASAH')
    @Post()
    create(@Body() data: any) {
        return this.jadwalService.create(data);
    }

    @Roles('ADMIN', 'STAF_MADRASAH')
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.jadwalService.remove(id);
    }

    // ─── Master Guru Mapel ───────────────────

    @Roles('ADMIN', 'STAF_MADRASAH', 'WALI_KELAS')
    @Get('guru-mapel')
    getGuruMapel() {
        return this.jadwalService.getGuruMapel();
    }

    @Roles('ADMIN', 'STAF_MADRASAH')
    @Post('guru-mapel')
    addGuruMapel(@Body() data: any) {
        return this.jadwalService.addGuruMapel(data);
    }

    @Roles('ADMIN', 'STAF_MADRASAH')
    @Delete('guru-mapel/:id')
    removeGuruMapel(@Param('id') id: string) {
        return this.jadwalService.removeGuruMapel(id);
    }

    // ─── Master Mata Pelajaran ────────────────

    @Roles('ADMIN', 'STAF_MADRASAH', 'WALI_KELAS')
    @Get('mata-pelajaran')
    getMataPelajaran() {
        return this.jadwalService.getMataPelajaran();
    }

    @Roles('ADMIN', 'STAF_MADRASAH')
    @Post('mata-pelajaran')
    addMataPelajaran(@Body() data: any) {
        return this.jadwalService.addMataPelajaran(data);
    }

    @Roles('ADMIN', 'STAF_MADRASAH')
    @Delete('mata-pelajaran/:id')
    removeMataPelajaran(@Param('id') id: string) {
        return this.jadwalService.removeMataPelajaran(id);
    }
}
