import { Module } from '@nestjs/common';
import { GedungService } from './gedung.service';
import { GedungController } from './gedung.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({ imports: [PrismaModule], controllers: [GedungController], providers: [GedungService] })
export class GedungModule { }
