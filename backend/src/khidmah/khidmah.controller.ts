import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { KhidmahService } from './khidmah.service';
import { CreateModelKhidmahDto, UpdateModelKhidmahDto, CreateDataKhidmahDto } from './dto/khidmah.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('khidmah') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('khidmah')
export class KhidmahController {
    constructor(private readonly svc: KhidmahService) { }

    // ═══ Model Khidmah (Variabel) ═══════════════════════════════════════════

    @Get('model')
    @Roles('ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH')
    findAllModels() {
        return this.svc.findAllModels();
    }

    @Post('model')
    @Roles('ADMIN', 'STAF_PENDATAAN')
    createModel(@Body() dto: CreateModelKhidmahDto) {
        return this.svc.createModel(dto);
    }

    @Patch('model/:id')
    @Roles('ADMIN', 'STAF_PENDATAAN')
    updateModel(@Param('id') id: string, @Body() dto: UpdateModelKhidmahDto) {
        return this.svc.updateModel(id, dto);
    }

    @Delete('model/:id')
    @Roles('ADMIN')
    removeModel(@Param('id') id: string) {
        return this.svc.removeModel(id);
    }

    // ═══ Data Khidmah (Assignment) ══════════════════════════════════════════

    @Get('data')
    @Roles('ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH')
    findAllData(@Query('modelKhidmahId') modelKhidmahId?: string) {
        return this.svc.findAllData(modelKhidmahId);
    }

    @Get('data/santri/:santriId')
    @Roles('ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'PEMBIMBING_KAMAR', 'WALI_KELAS')
    findBySantri(@Param('santriId') santriId: string) {
        return this.svc.findBySantri(santriId);
    }

    @Post('data')
    @Roles('ADMIN', 'STAF_PENDATAAN')
    createData(@Body() dto: CreateDataKhidmahDto) {
        return this.svc.createData(dto);
    }

    @Delete('data/:id')
    @Roles('ADMIN', 'STAF_PENDATAAN')
    removeData(@Param('id') id: string) {
        return this.svc.removeData(id);
    }
}
