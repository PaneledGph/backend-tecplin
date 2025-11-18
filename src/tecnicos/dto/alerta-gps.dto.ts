import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export enum TipoAlertaGps {
  SIN_ORDEN = 'SIN_ORDEN',
  SIN_SENAL = 'SIN_SENAL',
}

export class AlertaGpsDto {
  @IsEnum(TipoAlertaGps)
  tipo!: TipoAlertaGps;

  @IsArray()
  technicianIds!: number[];

  @IsOptional()
  @IsString()
  mensaje?: string;
}
