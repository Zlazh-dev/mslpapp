import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SantriService } from './santri.service';
import { CreateSantriDto, UpdateSantriDto, QuerySantriDto } from './dto/santri.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('santri')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('santri')
export class SantriController {
    constructor(private readonly santriService: SantriService) { }

    @Get('angkatan')
    @Roles('ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'PEMBIMBING_KAMAR', 'WALI_KELAS')
    getAngkatan() { return this.santriService.getAngkatan(); }

    @Get('generate-nis')
    @Roles('ADMIN', 'STAF_PENDATAAN')
    generateNis(@Query('date') date?: string) { return this.santriService.generateNis(date); }

    @Get()
    @Roles('ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'PEMBIMBING_KAMAR', 'WALI_KELAS')
    findAll(@Query() query: QuerySantriDto) { return this.santriService.findAll(query); }

    @Get(':id')
    @Roles('ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'PEMBIMBING_KAMAR', 'WALI_KELAS')
    findOne(@Param('id') id: string) { return this.santriService.findOne(id); }

    @Post()
    @Roles('ADMIN', 'STAF_PENDATAAN')
    create(@Body() dto: CreateSantriDto) { return this.santriService.create(dto); }

    @Put(':id')
    @Roles('ADMIN', 'STAF_PENDATAAN')
    update(@Param('id') id: string, @Body() dto: UpdateSantriDto) {
        return this.santriService.update(id, dto);
    }

    @Delete(':id')
    @Roles('ADMIN', 'STAF_PENDATAAN')
    remove(@Param('id') id: string) { return this.santriService.remove(id); }
}

// ── Public (no auth) ────────────────────────────────────────────────────────
import { Controller as PubController, Get as PubGet, Param as PubParam } from '@nestjs/common';
import { ApiTags as PubApiTags } from '@nestjs/swagger';

@PubApiTags('santri-public')
@PubController('santri/public')
export class SantriPublicController {
    constructor(private readonly santriService: SantriService) { }

    @PubGet(':id')
    async findPublic(@PubParam('id') id: string) {
        const result = await this.santriService.findOne(id);
        if (result?.data) {
            const { nik, noKk, ...safe } = result.data as any;
            return { ...result, data: safe };
        }
        return result;
    }
}

