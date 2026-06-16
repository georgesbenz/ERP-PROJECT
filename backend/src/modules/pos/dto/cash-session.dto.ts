import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OpenCashSessionDto {
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) openingBalance: number;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CloseCashSessionDto {
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) closingBalance: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
