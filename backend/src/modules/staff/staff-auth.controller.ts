import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StaffAuthService } from './staff-auth.service';
import { StaffLoginDto } from './dto/staff-login.dto';

@ApiTags('staff-auth')
@Controller('auth/staff')
export class StaffAuthController {
  constructor(private staffAuthService: StaffAuthService) {}

  @Post('login')
  login(@Body() dto: StaffLoginDto) {
    return this.staffAuthService.login(dto);
  }
}
