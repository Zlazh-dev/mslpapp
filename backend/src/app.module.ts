import { Module } from '@nestjs/common';
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

@Module({
    imports: [
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
    ],
})
export class AppModule { }
