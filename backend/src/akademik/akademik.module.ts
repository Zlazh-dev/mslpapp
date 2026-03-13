import { Module } from '@nestjs/common';
import { AkademikController } from './akademik.controller';
import { AkademikService } from './akademik.service';

@Module({
    controllers: [AkademikController],
    providers: [AkademikService],
})
export class AkademikModule { }
