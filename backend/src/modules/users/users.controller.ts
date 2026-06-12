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
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-request.type';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @RequirePermissions('users:READ')
  @ApiOperation({ summary: 'List all users in the tenant' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationDto) {
    return this.usersService.findAll(user.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('users:READ')
  @ApiOperation({ summary: 'Get a user by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOne(id, user.tenantId);
  }

  @Post()
  @RequirePermissions('users:CREATE')
  @ApiOperation({ summary: 'Create a new user' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('users:UPDATE')
  @ApiOperation({ summary: 'Update a user' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('users:DELETE')
  @ApiOperation({ summary: 'Soft-delete a user' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.remove(id, user.tenantId);
  }

  @Post(':id/roles/:roleId')
  @RequirePermissions('users:UPDATE')
  @ApiOperation({ summary: 'Assign a role to a user' })
  assignRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.assignRole(id, roleId, user.tenantId);
  }

  @Delete(':id/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('users:UPDATE')
  @ApiOperation({ summary: 'Remove a role from a user' })
  removeRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.removeRole(id, roleId, user.tenantId);
  }

  @Get(':id/permissions')
  @RequirePermissions('users:READ')
  @ApiOperation({ summary: 'List user-level permission overrides' })
  getUserPermissions(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getUserPermissions(id, user.tenantId);
  }

  @Post(':id/permissions')
  @RequirePermissions('users:UPDATE')
  @ApiOperation({ summary: 'Grant a direct permission override to a user' })
  addUserPermission(
    @Param('id') id: string,
    @Body('permissionId') permissionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!permissionId) throw new BadRequestException('permissionId is required');
    return this.usersService.addUserPermission(id, permissionId, user.tenantId);
  }

  @Delete(':id/permissions/:permissionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('users:UPDATE')
  @ApiOperation({ summary: 'Remove a direct permission override from a user' })
  removeUserPermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.removeUserPermission(id, permissionId, user.tenantId);
  }
}
