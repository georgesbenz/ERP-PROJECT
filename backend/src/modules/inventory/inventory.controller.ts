import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { StockMovementDto } from './dto/stock-movement.dto';
import { MovementsFilterDto } from './dto/movements-filter.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-request.type';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  // Products
  @Get('products')
  @RequirePermissions('inventory:READ')
  @ApiOperation({ summary: 'List all products' })
  listProducts(@CurrentUser() u: AuthenticatedUser, @Query() q: PaginationDto) {
    return this.inventoryService.listProducts(u.tenantId, q);
  }

  @Get('products/:id')
  @RequirePermissions('inventory:READ')
  @ApiOperation({ summary: 'Get product by ID with stock levels' })
  getProduct(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.inventoryService.getProduct(id, u.tenantId);
  }

  @Post('products')
  @RequirePermissions('inventory:CREATE')
  @ApiOperation({ summary: 'Create a product' })
  createProduct(@Body() dto: CreateProductDto, @CurrentUser() u: AuthenticatedUser) {
    return this.inventoryService.createProduct(u.tenantId, dto);
  }

  @Patch('products/:id')
  @RequirePermissions('inventory:UPDATE')
  @ApiOperation({ summary: 'Update a product' })
  updateProduct(
    @Param('id') id: string,
    @Body() dto: Partial<CreateProductDto>,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.inventoryService.updateProduct(id, u.tenantId, dto);
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('inventory:DELETE')
  @ApiOperation({ summary: 'Soft-delete a product' })
  deleteProduct(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.inventoryService.deleteProduct(id, u.tenantId);
  }

  // Product Families
  @Get('families')
  @RequirePermissions('inventory:READ')
  @ApiOperation({ summary: 'List product families' })
  listFamilies(@CurrentUser() u: AuthenticatedUser) {
    return this.inventoryService.listFamilies(u.tenantId);
  }

  @Post('families')
  @RequirePermissions('inventory:CREATE')
  @ApiOperation({ summary: 'Create a product family' })
  createFamily(@Body() dto: { name: string; code: string; description?: string }, @CurrentUser() u: AuthenticatedUser) {
    return this.inventoryService.createFamily(u.tenantId, dto);
  }

  @Patch('families/:id')
  @RequirePermissions('inventory:UPDATE')
  @ApiOperation({ summary: 'Update a product family' })
  updateFamily(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: AuthenticatedUser) {
    return this.inventoryService.updateFamily(id, u.tenantId, dto);
  }

  @Delete('families/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('inventory:DELETE')
  @ApiOperation({ summary: 'Delete a product family' })
  deleteFamily(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.inventoryService.deleteFamily(id, u.tenantId);
  }

  // Price Categories
  @Get('price-categories')
  @RequirePermissions('inventory:READ')
  @ApiOperation({ summary: 'List price categories' })
  listPriceCategories(@CurrentUser() u: AuthenticatedUser) {
    return this.inventoryService.listPriceCategories(u.tenantId);
  }

  @Post('price-categories')
  @RequirePermissions('inventory:CREATE')
  @ApiOperation({ summary: 'Create a price category' })
  createPriceCategory(@Body() dto: { name: string; code: string; description?: string }, @CurrentUser() u: AuthenticatedUser) {
    return this.inventoryService.createPriceCategory(u.tenantId, dto);
  }

  @Patch('price-categories/:id')
  @RequirePermissions('inventory:UPDATE')
  @ApiOperation({ summary: 'Update a price category' })
  updatePriceCategory(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: AuthenticatedUser) {
    return this.inventoryService.updatePriceCategory(id, u.tenantId, dto);
  }

  @Delete('price-categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('inventory:DELETE')
  @ApiOperation({ summary: 'Deactivate a price category' })
  deletePriceCategory(@Param('id') id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.inventoryService.deletePriceCategory(id, u.tenantId);
  }

  // Categories
  @Get('categories')
  @RequirePermissions('inventory:READ')
  @ApiOperation({ summary: 'List product categories (tree)' })
  listCategories(@CurrentUser() u: AuthenticatedUser) {
    return this.inventoryService.listCategories(u.tenantId);
  }

  @Post('categories')
  @RequirePermissions('inventory:CREATE')
  @ApiOperation({ summary: 'Create a category' })
  createCategory(@Body() dto: CreateCategoryDto, @CurrentUser() u: AuthenticatedUser) {
    return this.inventoryService.createCategory(u.tenantId, dto);
  }

  // Warehouses
  @Get('warehouses')
  @RequirePermissions('inventory:READ')
  @ApiOperation({ summary: 'List warehouses' })
  listWarehouses(@CurrentUser() u: AuthenticatedUser) {
    return this.inventoryService.listWarehouses(u.tenantId);
  }

  // Stock
  @Get('stock')
  @RequirePermissions('inventory:READ')
  @ApiOperation({ summary: 'Get current stock levels' })
  getStock(@CurrentUser() u: AuthenticatedUser, @Query() q: PaginationDto) {
    return this.inventoryService.getStockLevels(u.tenantId, q);
  }

  @Post('movements')
  @RequirePermissions('inventory:CREATE')
  @ApiOperation({ summary: 'Record a stock movement (in/out/adjustment/transfer)' })
  recordMovement(@Body() dto: StockMovementDto, @CurrentUser() u: AuthenticatedUser) {
    return this.inventoryService.recordMovement(u.tenantId, dto, u.userId);
  }

  @Get('movements')
  @RequirePermissions('inventory:READ')
  @ApiOperation({ summary: 'List stock movement history with filters' })
  getMovements(@CurrentUser() u: AuthenticatedUser, @Query() q: MovementsFilterDto) {
    return this.inventoryService.getMovements(u.tenantId, q);
  }
}
