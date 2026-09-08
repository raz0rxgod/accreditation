import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать не менее 8 символов' })
  password: string;

  @IsString()
  fullName: string;
}
