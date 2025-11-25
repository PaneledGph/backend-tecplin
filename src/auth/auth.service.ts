import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async login(usuario: string, contrasena: string) {
    const user = await this.usuariosService.findByUsuario(usuario);

    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const passwordIsValid = await bcrypt.compare(contrasena, user.contrasena);
    if (!passwordIsValid)
      throw new UnauthorizedException('Contraseña incorrecta');

    const payload = { sub: user.id, rol: user.rol };
    const rolFrontend = user.rol.toLowerCase();

    // Generar access token (JWT) y refresh token
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = await this.refreshTokenService.generarRefreshToken(
      user.id,
    );

    // Cargar información extendida del usuario (cliente/técnico) para mostrar nombre amigable en frontend
    const fullUser = await this.usuariosService.findById(user.id);

    const displayName =
      (fullUser?.cliente && (fullUser as any).cliente?.nombre) ||
      (fullUser?.tecnico && (fullUser as any).tecnico?.nombre) ||
      user.usuario;

    return {
      message: 'Inicio de sesión exitoso',
      token: accessToken,
      refreshToken,
      rol: user.rol,
      rolFrontend,
      userId: user.id,
      user: {
        id: user.id,
        usuario: user.usuario,
        rol: user.rol,
        nombre: displayName,
      },
    };
  }

  async logout(refreshToken: string) {
    await this.refreshTokenService.revocarRefreshToken(refreshToken);
    return { message: 'Sesión cerrada exitosamente' };
  }

  async refresh(refreshToken: string) {
    return this.refreshTokenService.renovarAccessToken(refreshToken);
  }

  async register(usuario: string, contrasena: string, rol: string) {
    // Verifica si el usuario ya existe
    const existingUser = await this.usuariosService.findByUsuario(usuario);
    if (existingUser) {
      throw new Error('Usuario ya existe');
    }

    // Encripta la contraseña
    const hash = await bcrypt.hash(contrasena, 10);

    // Crea el usuario en la BD
    const newUser = await this.usuariosService.create({
      usuario,
      contrasena: hash,
      rol,
    });

    return {
      message: 'Usuario creado exitosamente',
      user: { id: newUser.id, usuario: newUser.usuario, rol: newUser.rol },
    };
  }
}
