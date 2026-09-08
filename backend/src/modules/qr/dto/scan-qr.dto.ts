import { IsOptional, IsString } from 'class-validator';

export class ScanQrDto {
  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  checkpointLocation?: string;
}
