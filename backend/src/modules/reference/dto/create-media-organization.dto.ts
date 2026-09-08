import { IsEnum, IsOptional, IsString, IsUUID, IsUrl } from 'class-validator';

export enum MediaTypeDto {
  television = 'television',
  print = 'print',
  radio = 'radio',
  other = 'other',
}

export class CreateMediaOrganizationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsUUID()
  countryId?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Некорректный формат сайта' })
  website?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsEnum(MediaTypeDto, {
    message: `mediaType должен быть одним из: ${Object.values(MediaTypeDto).join(', ')}`,
  })
  mediaType?: MediaTypeDto;
}
