import { IsEnum } from 'class-validator';
import { Estado } from '@prisma/client';

export class ActualizarEstadoOrdenDto {
  @IsEnum(Estado)
  estado!: Estado;
}
