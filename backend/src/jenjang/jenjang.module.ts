import { Module } from '@nestjs/common';
import { JenjangService } from './jenjang.service';
import { JenjangController } from './jenjang.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({ imports: [PrismaModule], controllers: [JenjangController], providers: [JenjangService] })
export class JenjangModule { }
