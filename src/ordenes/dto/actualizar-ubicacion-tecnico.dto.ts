import { IsNumber, IsOptional } from 'class-validator';

export class ActualizarUbicacionTecnicoDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsOptional()
  @IsNumber()
  precision?: number;
}
