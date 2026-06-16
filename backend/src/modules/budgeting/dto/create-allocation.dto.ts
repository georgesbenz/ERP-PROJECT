import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAllocationDto {
  @ApiProperty({ description: 'Budget category ID' })
  @IsString()
  categoryId: string;

  @ApiProperty({ description: 'Period identifier e.g. 2026-01 or 2026-Q1' })
  @IsString()
  period: string;

  @ApiProperty({ description: 'Allocated amount' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  allocated: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
