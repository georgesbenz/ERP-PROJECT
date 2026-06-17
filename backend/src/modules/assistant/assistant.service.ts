import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface Message { role: 'user' | 'assistant'; content: string; }

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(private readonly config: ConfigService) {}

  async chat(messages: Message[], tenantContext?: string): Promise<{ reply: string }> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('AI assistant not configured. Set ANTHROPIC_API_KEY.');
    }

    const systemPrompt = [
      'You are an intelligent ERP assistant for a business using the SAFIRA ERP platform.',
      'You help with inventory management, sales analysis, financial reporting, CRM, and business insights.',
      'Be concise, professional, and answer in the same language the user writes (French or English).',
      'When referencing numbers, use the FCFA currency and Cameroonian business context.',
      tenantContext ? `Current tenant context: ${tenantContext}` : '',
    ].filter(Boolean).join('\n');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.slice(-20), // Keep last 20 messages for context
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Anthropic API error: ${error}`);
      throw new ServiceUnavailableException('AI assistant temporarily unavailable');
    }

    const data = await response.json() as { content: Array<{ type: string; text: string }> };
    const reply = data.content.find((c) => c.type === 'text')?.text ?? '';

    return { reply };
  }
}
