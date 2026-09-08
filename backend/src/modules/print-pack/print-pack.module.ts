import { Module } from '@nestjs/common';
import { PrintPackController } from './print-pack.controller';
import { PrintPackService } from './print-pack.service';

@Module({
  controllers: [PrintPackController],
  providers: [PrintPackService],
})
export class PrintPackModule {}
