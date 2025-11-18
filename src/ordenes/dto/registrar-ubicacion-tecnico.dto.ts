import { IsNumber } from 'class-validator';

export class RegistrarUbicacionTecnicoDto {
  @IsNumber()
  tecnicoId!: number;

  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsNumber()
  precision?: number;
}
