import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffLoginDto } from './dto/staff-login.dto';

@Injectable()
export class StaffAuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: StaffLoginDto) {
    const staff = await this.prisma.staffUser.findUnique({ where: { email: dto.email } });
    if (!staff || !(await bcrypt.compare(dto.password, staff.passwordHash))) {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    if (!staff.active) {
      throw new UnauthorizedException('Учётная запись отключена, обратитесь к администратору');
    }

    const accessToken = this.jwt.sign({
      sub: staff.id,
      email: staff.email,
      role: staff.role,
      type: 'staff', // отличаем от токенов заявителей (User), чтобы одно не подменяло другое
    });

    return { accessToken, role: staff.role, fullName: staff.fullName };
  }
}
