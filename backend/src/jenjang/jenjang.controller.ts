import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JenjangService } from './jenjang.service';
import { CreateJenjangDto, UpdateJenjangDto } from './dto/jenjang.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('jenjang') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('jenjang')
export class JenjangController {
    constructor(private readonly svc: JenjangService) { }

    @Get()
    @Roles(Role.ADMIN, Role.STAF_PENDATAAN, Role.STAF_MADRASAH, Role.PEMBIMBING_KAMAR, Role.WALI_KELAS)
    findAll() { return this.svc.findAll(); }

    @Post()
    @Roles(Role.ADMIN, Role.STAF_MADRASAH)
    create(@Body() dto: CreateJenjangDto) { return this.svc.create(dto); }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.STAF_MADRASAH)
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateJenjangDto) { return this.svc.update(id, dto); }

    @Delete(':id')
    @Roles(Role.ADMIN)
    remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}
