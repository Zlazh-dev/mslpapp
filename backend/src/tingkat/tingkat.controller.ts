import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { TingkatService } from './tingkat.service';
import { CreateTingkatDto, UpdateTingkatDto } from './dto/tingkat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('tingkat') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tingkat')
export class TingkatController {
    constructor(private readonly svc: TingkatService) { }

    @Get()
    @Roles(Role.ADMIN, Role.STAF_PENDATAAN, Role.STAF_MADRASAH, Role.PEMBIMBING_KAMAR, Role.WALI_KELAS)
    findAll(@Query('jenjangId') jenjangId?: string) {
        return this.svc.findAll(jenjangId ? parseInt(jenjangId) : undefined);
    }

    @Post()
    @Roles(Role.ADMIN, Role.STAF_MADRASAH)
    create(@Body() dto: CreateTingkatDto) { return this.svc.create(dto); }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.STAF_MADRASAH)
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTingkatDto) { return this.svc.update(id, dto); }

    @Delete(':id')
    @Roles(Role.ADMIN)
    remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}
