import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get(':key')
    @Roles('ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'PEMBIMBING_KAMAR', 'WALI_KELAS')
    async getSetting(@Param('key') key: string) {
        return this.settingsService.getSetting(key);
    }

    @Put(':key')
    @Roles('ADMIN', 'STAF_PENDATAAN')
    async updateSetting(@Param('key') key: string, @Body() data: { value: any }) {
        return this.settingsService.upsertSetting(key, data.value);
    }
}
