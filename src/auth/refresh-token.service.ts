import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

@Injectable()
export class RefreshTokenService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // -------------------------------------------------------
  // 🔑 GENERAR REFRESH TOKEN
  // -------------------------------------------------------
  async generarRefreshToken(usuarioId: number): Promise<string> {
    // Generar token aleatorio seguro
    const token = crypto.randomBytes(64).toString('hex');
    
    // Fecha de expiración (30 días)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Guardar en BD
    await this.prisma.refreshToken.create({
      data: {
        token,
        usuarioId,
        expiresAt,
      },
    });

    return token;
  }

  // -------------------------------------------------------
  // ✅ VALIDAR REFRESH TOKEN
  // -------------------------------------------------------
  async validarRefreshToken(token: string) {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { usuario: true },
    });

    if (!refreshToken) {
      throw new Error('Refresh token inválido');
    }

    if (refreshToken.revocado) {
      throw new Error('Refresh token revocado');
    }

    if (new Date() > refreshToken.expiresAt) {
      throw new Error('Refresh token expirado');
    }

    return refreshToken;
  }

  // -------------------------------------------------------
  // 🔄 RENOVAR ACCESS TOKEN
  // -------------------------------------------------------
  async renovarAccessToken(refreshToken: string) {
    const tokenData = await this.validarRefreshToken(refreshToken);

    // Generar nuevo access token (JWT)
    const payload = {
      sub: tokenData.usuario.id,
      usuario: tokenData.usuario.usuario,
      rol: tokenData.usuario.rol,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m', // 15 minutos
    });

    return {
      accessToken,
      usuario: tokenData.usuario,
    };
  }

  // -------------------------------------------------------
  // ❌ REVOCAR REFRESH TOKEN
  // -------------------------------------------------------
  async revocarRefreshToken(token: string) {
    await this.prisma.refreshToken.update({
      where: { token },
      data: { revocado: true },
    });
  }

  // -------------------------------------------------------
  // 🗑️ REVOCAR TODOS LOS TOKENS DE UN USUARIO
  // -------------------------------------------------------
  async revocarTodosLosTokens(usuarioId: number) {
    await this.prisma.refreshToken.updateMany({
      where: { usuarioId },
      data: { revocado: true },
    });
  }

  // -------------------------------------------------------
  // 🧹 LIMPIAR TOKENS EXPIRADOS
  // -------------------------------------------------------
  async limpiarTokensExpirados() {
    const now = new Date();
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { revocado: true },
        ],
      },
    });

    console.log(`🧹 Limpiados ${result.count} refresh tokens expirados/revocados`);
    return result.count;
  }
}
