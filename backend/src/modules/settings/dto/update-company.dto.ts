import {
  IsBoolean, IsEmail, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateCompanyDto {
  // ── General ────────────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tradingName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() slogan?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() industry?: string;
  @ApiPropertyOptional() @IsOptional() dateEstablished?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() businessDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;

  // ── Contact ────────────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() whatsapp?: string;

  // ── Address ────────────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() physicalAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postalAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() district?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subdivision?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() division?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() region?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gpsCoordinates?: string;

  // ── Legal ──────────────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() rccm?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() niu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cnps?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() patent?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() statisticalNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() shareCapital?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() legalForm?: string;

  // ── Tax ────────────────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsBoolean() vatEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() vatNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxRegime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxOffice?: string;

  // ── Accounting ─────────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ohadaEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(12) @Type(() => Number) fiscalYearStart?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(12) @Type(() => Number) fiscalYearEnd?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() accountingMethod?: string;

  // ── ERP Settings ───────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locale?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() language?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateFormat?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timeFormat?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(4) @Type(() => Number) decimalPrecision?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() multiBranch?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() multiWarehouse?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() multiCurrency?: boolean;

  // ── POS Settings ───────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() receiptSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoPrint?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) maxDiscountPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() mandatoryCashOpen?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() mandatoryCashClose?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number) returnPolicyDays?: number;

  // ── Inventory Settings ─────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number) lowStockThreshold?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number) criticalStockThreshold?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultValuationMethod?: string;
}
