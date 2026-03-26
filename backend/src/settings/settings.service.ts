import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) { }

    async getSetting(key: string) {
        const item = await this.prisma.setting.findUnique({
            where: { key }
        });

        return {
            success: true,
            data: item ? item.value : null,
            message: item ? 'Setting found' : 'Setting not found'
        };
    }

    async upsertSetting(key: string, value: any) {
        // value is a generic JSON object
        const item = await this.prisma.setting.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });

        return {
            success: true,
            data: item.value,
            message: 'Setting saved successfully'
        };
    }
}
