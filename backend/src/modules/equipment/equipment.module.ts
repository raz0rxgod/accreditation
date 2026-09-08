import { Module } from '@nestjs/common';
import { EquipmentController, EquipmentItemsController } from './equipment.controller';
import { EquipmentService } from './equipment.service';

@Module({
  controllers: [EquipmentController, EquipmentItemsController],
  providers: [EquipmentService],
  exports: [EquipmentService],
})
export class EquipmentModule {}
