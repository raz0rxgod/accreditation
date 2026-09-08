import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStaffStrategy extends PassportStrategy(Strategy, 'jwt-staff') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: { sub: string; email: string; role: string; type: string }) {
    if (payload.type !== 'staff') {
      // токен заявителя (User), не сотрудника — не наш случай, пусть попробует другая стратегия
      return null;
    }

    const staff = await this.prisma.staffUser.findUnique({ where: { id: payload.sub } });
    if (!staff || !staff.active) {
      return null;
    }

    return { staffId: staff.id, email: staff.email, role: staff.role, fullName: staff.fullName };
  }
}
