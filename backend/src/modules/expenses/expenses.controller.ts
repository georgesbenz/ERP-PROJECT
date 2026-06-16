import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { ApproveExpenseDto, CreateExpenseDto } from './dto/create-expense.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-request.type';
import { RequirePermissions as Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private svc: ExpensesService) {}

  // ─── Categories ─────────────────────────────────────────────────────────────

  @Get('categories')
  @Permissions('expenses:READ')
  @ApiOperation({ summary: 'List expense categories' })
  listCategories(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.listCategories(user.tenantId);
  }

  @Post('categories')
  @Permissions('expenses:CREATE')
  @ApiOperation({ summary: 'Create expense category' })
  createCategory(@Body() dto: CreateExpenseCategoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.createCategory(user.tenantId, dto);
  }

  @Patch('categories/:id')
  @Permissions('expenses:UPDATE')
  @ApiOperation({ summary: 'Update expense category' })
  updateCategory(
    @Param('id') id: string,
    @Body() dto: Partial<CreateExpenseCategoryDto>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.updateCategory(id, user.tenantId, dto);
  }

  @Delete('categories/:id')
  @Permissions('expenses:DELETE')
  @ApiOperation({ summary: 'Delete expense category' })
  deleteCategory(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.deleteCategory(id, user.tenantId);
  }

  // ─── Expenses ────────────────────────────────────────────────────────────────

  @Get()
  @Permissions('expenses:READ')
  @ApiOperation({ summary: 'List expenses with optional filters' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'status', required: false })
  listExpenses(
    @Query() dto: PaginationDto,
    @Query('categoryId') categoryId: string | undefined,
    @Query('status') status: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.listExpenses(user.tenantId, Object.assign(dto, { categoryId, status }));
  }

  @Get('report')
  @Permissions('expenses:READ')
  @ApiOperation({ summary: 'Expense summary report by category and status' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getReport(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.getReport(user.tenantId, from, to);
  }

  @Get(':id')
  @Permissions('expenses:READ')
  @ApiOperation({ summary: 'Get expense detail' })
  getExpense(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.getExpense(id, user.tenantId);
  }

  @Post()
  @Permissions('expenses:CREATE')
  @ApiOperation({ summary: 'Create expense entry' })
  createExpense(@Body() dto: CreateExpenseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.createExpense(user.tenantId, user.userId, dto);
  }

  @Patch(':id/approve')
  @Permissions('expenses:APPROVE')
  @ApiOperation({ summary: 'Approve or reject expense' })
  approveExpense(@Param('id') id: string, @Body() dto: ApproveExpenseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.approveExpense(id, user.tenantId, user.userId, dto);
  }

  @Delete(':id')
  @Permissions('expenses:DELETE')
  @ApiOperation({ summary: 'Delete pending expense' })
  deleteExpense(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.deleteExpense(id, user.tenantId);
  }
}
