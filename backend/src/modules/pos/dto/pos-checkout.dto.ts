import {
  IsArray, IsNumber, IsOptional, IsEnum, IsString, IsUUID, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PosItemDto {
  @ApiProperty() @IsUUID() productId: string;
  @ApiProperty() @IsNumber() @Min(0.001) quantity: number;
  @ApiProperty() @IsNumber() @Min(0) unitPrice: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class PosPaymentDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;
}

export class PosCheckoutDto {
  @ApiProperty({ type: [PosItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosItemDto)
  items: PosItemDto[];

  @ApiProperty({ type: [PosPaymentDto], description: 'One or more payment splits (cash + mobile money etc.)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosPaymentDto)
  payments: PosPaymentDto[];

  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  /** Loyalty points to redeem — 1 point = 1 FCFA discount */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) loyaltyPointsRedeem?: number;
}
