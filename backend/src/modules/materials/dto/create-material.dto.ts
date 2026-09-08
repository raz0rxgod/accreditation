import { IsOptional, IsUrl } from 'class-validator';

// PDF приходит файлом (multipart) — type в этом случае проставляет сервис сам.
// Здесь описываем только тело для URL-варианта: POST /applicants/:id/materials { url }
export class CreateMaterialDto {
  @IsOptional()
  @IsUrl({}, { message: 'url должен быть корректной ссылкой (http/https)' })
  url?: string;
}
