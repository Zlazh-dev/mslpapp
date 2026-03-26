import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SantriModule } from './santri/santri.module';
import { KompleksModule } from './kompleks/kompleks.module';
import { GedungModule } from './gedung/gedung.module';
import { KamarModule } from './kamar/kamar.module';
import { JenjangModule } from './jenjang/jenjang.module';
import { TingkatModule } from './tingkat/tingkat.module';
import { KelasModule } from './kelas/kelas.module';
import { AkademikModule } from './akademik/akademik.module';
import { LaporanModule } from './laporan/laporan.module';
import { UploadModule } from './upload/upload.module';
import { ChatModule } from './chat/chat.module';
import { SettingsModule } from './settings/settings.module';
import { BackupModule } from './backup/backup.module';

@Module({
    imports: [
        // ── Rate Limiting (global: 10 req / 60s per IP, auth login has tighter limit) ──
        ThrottlerModule.forRoot([
            {
                name: 'global',
                ttl: 60000,
                limit: 60,
            },
        ]),
        ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), 'uploads'),
            serveRoot: '/uploads',
            serveStaticOptions: { index: false },
        }),
        PrismaModule,
        AuthModule,
        UsersModule,
        SantriModule,
        KompleksModule,
        GedungModule,
        KamarModule,
        JenjangModule,
        TingkatModule,
        KelasModule,
        AkademikModule,
        LaporanModule,
        UploadModule,
        ChatModule,
        SettingsModule,
        BackupModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule { }
