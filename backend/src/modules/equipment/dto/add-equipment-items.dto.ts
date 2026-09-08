import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class EquipmentItemDto {
  @IsString()
  category: string;

  @IsString()
  brand: string;

  @IsString()
  model: string;

  @IsString()
  serialNumber: string;
}

export class AddEquipmentItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EquipmentItemDto)
  items: EquipmentItemDto[];
}
