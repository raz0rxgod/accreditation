import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.emailVerified) {
      // Возвращаем null (а не throw), чтобы JwtEitherAuthGuard мог откатиться
      // на следующую стратегию (jwt-staff) для роутов, общих для заявителя и сотрудника.
      // Если это единственная стратегия (JwtAuthGuard), Nest сам вернёт 401 при falsy-результате.
      return null;
    }
    // то, что вернёт validate(), попадёт в req.user
    return { userId: user.id, email: user.email, fullName: user.fullName };
  }
}
