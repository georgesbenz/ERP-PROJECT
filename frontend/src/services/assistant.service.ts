import { api } from '@/lib/api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const assistantService = {
  async chat(messages: ChatMessage[], context?: string) {
    const { data } = await api.post('/assistant/chat', { messages, context });
    return data.data as { reply: string; model: string };
  },
};
