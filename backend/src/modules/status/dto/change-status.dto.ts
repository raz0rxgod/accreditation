import { IsEnum, IsString, ValidateIf } from 'class-validator';

export enum NewApplicantStatus {
  in_review = 'in_review',
  approved = 'approved',
  rejected = 'rejected',
}

export class ChangeStatusDto {
  @IsEnum(NewApplicantStatus)
  newStatus: NewApplicantStatus;

  // Комментарий обязателен при отказе — проверяется декларативно через class-validator,
  // чтобы ошибка формировалась ещё на уровне ValidationPipe, до бизнес-логики сервиса.
  @ValidateIf((dto) => dto.newStatus === NewApplicantStatus.rejected)
  @IsString({ message: 'При отказе обязательно укажите причину в internalComment' })
  internalComment?: string;
}
