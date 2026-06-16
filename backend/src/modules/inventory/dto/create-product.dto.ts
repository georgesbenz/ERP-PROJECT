import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsIn, IsNumber, IsOptional,
  IsString, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  sku: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  familyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 'pcs' })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  safetyStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  alertQty?: number;

  @ApiPropertyOptional({ enum: ['WEIGHTED_AVG', 'FIFO', 'LIFO'] })
  @IsOptional()
  @IsIn(['WEIGHTED_AVG', 'FIFO', 'LIFO'])
  valuationMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  packaging?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priceCategory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isService?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trackSerials?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trackBatches?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasExpiry?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
