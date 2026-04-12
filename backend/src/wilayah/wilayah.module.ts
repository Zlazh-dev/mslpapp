import { Module } from '@nestjs/common';
import { WilayahController } from './wilayah.controller';

@Module({
    controllers: [WilayahController],
})
export class WilayahModule {}
