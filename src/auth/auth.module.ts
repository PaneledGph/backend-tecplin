import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RefreshTokenService } from './refresh-token.service';
import { UsuariosModule } from 'src/usuarios/usuarios.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    UsuariosModule,
    PrismaModule,
    JwtModule.register({
      global: true,
      secret: 'admin123',
      signOptions: { expiresIn: '15m' }, // Access token de 15 minutos
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenService],
  exports: [AuthService, RefreshTokenService, JwtModule],
})
export class AuthModule {}
