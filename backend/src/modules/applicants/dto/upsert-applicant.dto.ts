import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpsertApplicantDto {
  @IsString()
  lastName: string;

  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsUUID()
  mediaId?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  employerAddress?: string;

  @IsOptional()
  @IsUUID()
  citizenshipCountryId?: string;

  @IsOptional()
  @IsBoolean()
  visitedBefore?: boolean;

  @IsOptional()
  @IsString()
  visitPurpose?: string;

  @IsOptional()
  @IsDateString()
  tripStart?: string;

  @IsOptional()
  @IsDateString()
  tripEnd?: string;

  @IsOptional()
  @IsString()
  accommodation?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  passportNumber?: string;

  @IsOptional()
  @IsDateString()
  passportExpiry?: string;

  @IsOptional()
  @IsBoolean()
  visaFree?: boolean;

  @IsOptional()
  @IsString()
  visaNumber?: string;

  @IsOptional()
  @IsDateString()
  visaExpiry?: string;

  @IsOptional()
  @IsBoolean()
  noPressCard?: boolean;

  @IsOptional()
  @IsDateString()
  pressCardExpiry?: string;

  @IsOptional()
  @IsString()
  priorCoverageLinks?: string;
}
