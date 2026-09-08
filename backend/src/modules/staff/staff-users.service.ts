import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

const SAFE_SELECT = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
} as const;

@Injectable()
export class StaffUsersService {
  constructor(private prisma: PrismaService) {}

  /** До появления этого CRUD единственным способом завести сотрудника был `prisma db seed`. */
  async findAll() {
    return this.prisma.staffUser.findMany({
      select: SAFE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateStaffDto) {
    const existing = await this.prisma.staffUser.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Сотрудник с таким email уже существует');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.staffUser.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        passwordHash,
        role: dto.role,
        active: true,
      },
      select: SAFE_SELECT,
    });
  }

  async update(id: string, dto: UpdateStaffDto, currentStaffId: string) {
    const staff = await this.prisma.staffUser.findUnique({ where: { id } });
    if (!staff) throw new NotFoundException('Сотрудник не найден');

    // Не даём администратору случайно отключить самого себя — иначе управлять
    // сотрудниками из этого же аккаунта станет невозможно.
    if (id === currentStaffId && dto.active === false) {
      throw new BadRequestException('Нельзя деактивировать свою же учётную запись');
    }

    return this.prisma.staffUser.update({
      where: { id },
      data: {
        fullName: dto.fullName ?? undefined,
        role: dto.role ?? undefined,
        active: dto.active ?? undefined,
      },
      select: SAFE_SELECT,
    });
  }
}
