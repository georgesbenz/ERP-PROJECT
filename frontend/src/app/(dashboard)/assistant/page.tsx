'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send, Bot, User, Sparkles, Trash2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { assistantService, type ChatMessage } from '@/services/assistant.service';

const WELCOME = `Bonjour ! Je suis l'assistant IA de votre ERP SAFIRA.

Je peux vous aider à :
• Analyser vos données de ventes et inventaire
• Expliquer les rapports financiers (OHADA)
• Répondre aux questions sur la gestion commerciale
• Proposer des recommandations métier

Comment puis-je vous aider aujourd'hui ?`;

const QUICK_PROMPTS = [
  "Comment interpréter le ratio de marge brute ?",
  "Qu'est-ce qu'un inventaire physique (cycle count) ?",
  "Comment calculer le seuil de réapprovisionnement ?",
  "Explique-moi la TVA au Cameroun",
];

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? 'bg-indigo-600' : 'bg-gradient-to-br from-violet-500 to-indigo-600'}`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
      </div>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-indigo-600 text-white rounded-tr-sm'
          : 'bg-white border border-stone-200 text-slate-800 rounded-tl-sm shadow-sm'
      }`}>
        {msg.content.split('\n').map((line, i) => (
          <span key={i}>{line}{i < msg.content.split('\n').length - 1 && <br />}</span>
        ))}
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: WELCOME },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chatMutation = useMutation({
    mutationFn: (msgs: ChatMessage[]) => assistantService.chat(msgs),
    onSuccess: (res) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Désolé, une erreur s'est produite. Veuillez réessayer." },
      ]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || chatMutation.isPending) return;

    const userMsg: ChatMessage = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');

    chatMutation.mutate(newMessages.slice(-20)); // keep last 20 messages
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: WELCOME }]);
  };

  return (
    <>
      <Header title="Assistant IA" />
      <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-stone-50">
        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">ERP Assistant</p>
              <p className="text-xs text-slate-400">Powered by Claude (Anthropic)</p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={12} /> Effacer
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {chatMutation.isPending && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600">
                <Bot size={14} className="text-white" />
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-stone-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex gap-1.5 items-center h-5">
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        {messages.length <= 2 && (
          <div className="px-6 pb-2 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-stone-200 bg-white p-4">
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question… (Entrée pour envoyer, Maj+Entrée pour saut de ligne)"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-stone-200 px-4 py-3 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300 max-h-32 overflow-y-auto"
              style={{ minHeight: '2.75rem' }}
            />
            <Button
              onClick={() => send()}
              disabled={!input.trim() || chatMutation.isPending}
              loading={chatMutation.isPending}
              className="shrink-0"
            >
              <Send size={14} />
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-center text-slate-400">
            L&apos;assistant peut faire des erreurs. Vérifiez les informations importantes.
          </p>
        </div>
      </div>
    </>
  );
}
