import { IsEnum } from 'class-validator';

export enum DocumentTypeDto {
  accreditation_letter = 'accreditation_letter',
  passport_scan = 'passport_scan',
  visa_scan = 'visa_scan',
  press_card = 'press_card',
  media_registration = 'media_registration',
  invitation_letter = 'invitation_letter',
  equipment_list_file = 'equipment_list_file',
}

export class UploadDocumentDto {
  @IsEnum(DocumentTypeDto, {
    message: `type должен быть одним из: ${Object.values(DocumentTypeDto).join(', ')}`,
  })
  type: DocumentTypeDto;
}
