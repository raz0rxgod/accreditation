import { IsEnum } from 'class-validator';
import { MediaTypeDto } from './create-media-organization.dto';

export class UpdateMediaOrganizationDto {
  @IsEnum(MediaTypeDto, {
    message: `mediaType должен быть одним из: ${Object.values(MediaTypeDto).join(', ')}`,
  })
  mediaType: MediaTypeDto;
}
