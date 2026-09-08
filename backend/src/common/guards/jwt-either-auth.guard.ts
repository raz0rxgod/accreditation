import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Passport пробует стратегии по очереди, пока одна не пройдёт валидацию —
// удобно для эндпоинтов, доступных и заявителю, и сотруднику администрации одновременно.
@Injectable()
export class JwtEitherAuthGuard extends AuthGuard(['jwt', 'jwt-staff']) {}
