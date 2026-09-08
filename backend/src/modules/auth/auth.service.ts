import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private notifications: NotificationsService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Пользователь с такой почтой уже зарегистрирован');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        emailVerified: false,
      },
    });

    // Токен подтверждения храним отдельно (например, в Redis с TTL),
    // здесь для простоты — прямая ссылка со встроенным JWT на 24 часа.
    const token = this.jwt.sign(
      { sub: user.id, purpose: 'email_verification' },
      { expiresIn: '24h' },
    );
    const verifyLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    // DEV-режим: если SMTP не настроен, дублируем ссылку подтверждения в лог,
    // чтобы не лазить в БД руками при локальном/тестовом запуске.
    // Уберите этот блок (или спрячьте за NODE_ENV !== 'production'), когда подключите боевой SMTP.
    if (!process.env.SMTP_USER) {
      console.log('\n──────────────────────────────────────────────');
      console.log(`[DEV] Ссылка подтверждения для ${user.email}:`);
      console.log(verifyLink);
      console.log('──────────────────────────────────────────────\n');
    }

    await this.notifications.send({
      recipientEmail: user.email,
      type: 'registration_confirmation',
      subject: 'Подтверждение регистрации — портал аккредитации',
      body: `Вы зарегистрировались на портале электронной аккредитации. Для подтверждения учетной записи и активации личного кабинета перейдите по ссылке: ${verifyLink}`,
    });

    return { message: 'Письмо с подтверждением отправлено на почту' };
  }

  async verifyEmail(token: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException('Ссылка недействительна или истекла');
    }
    if (payload.purpose !== 'email_verification') {
      throw new UnauthorizedException('Некорректный токен');
    }

    const user = await this.prisma.user.update({
      where: { id: payload.sub },
      data: { emailVerified: true },
    });

    return this.issueTokenPair(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    if (!user.emailVerified) {
      throw new UnauthorizedException('Подтвердите почту перед входом');
    }
    return this.issueTokenPair(user.id, user.email);
  }

  private issueTokenPair(userId: string, email: string) {
    const accessToken = this.jwt.sign({ sub: userId, email });
    return { accessToken };
  }
}
