import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssistantService } from './assistant.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-request.type';

class ChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] }) @IsString() role: 'user' | 'assistant';
  @ApiProperty() @IsString() content: string;
}

class ChatDto {
  @ApiProperty({ type: [ChatMessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @ApiPropertyOptional() @IsOptional() @IsString() context?: string;
}

@ApiTags('Assistant')
@ApiBearerAuth()
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Chat with the ERP AI assistant (requires ANTHROPIC_API_KEY)' })
  chat(@Body() dto: ChatDto, @CurrentUser() user: AuthenticatedUser) {
    return this.assistant.chat(dto.messages, dto.context ?? `tenantId: ${user.tenantId}`);
  }
}
