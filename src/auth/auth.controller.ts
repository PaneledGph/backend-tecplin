import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() body: any) {
    const { usuario, contrasena } = body;

    if (!usuario || !contrasena) {
      throw new BadRequestException('usuario y contrasena son obligatorios');
    }

    return this.authService.login(usuario, contrasena);
  }

  @Post('register')
  register(
    @Body('usuario') usuario: string,
    @Body('contrasena') contrasena: string,
    @Body('rol') rol: string
  ) {
    return this.authService.register(usuario, contrasena, rol);
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('refreshToken es obligatorio');
    }
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  async logout(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('refreshToken es obligatorio');
    }
    return this.authService.logout(refreshToken);
  }
}
