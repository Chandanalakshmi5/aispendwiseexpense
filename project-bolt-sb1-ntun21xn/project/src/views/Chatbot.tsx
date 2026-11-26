import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Sparkles, Bot, User, TrendingUp } from 'lucide-react';
import type { Expense, Budget } from '@/lib/supabase';
import { generateInsightResponse, type ChatMessage } from '@/lib/analytics';

type Props = {
  expenses: Expense[];
  budgets: Budget[];
};

const SUGGESTED_QUESTIONS = [
  'How much did I spend on food this month?',
  'Where am I spending the most money?',
  'How much will I spend by the end of this month?',
  'Am I likely to exceed my budget?',
  'Which expenses are unnecessary?',
  'Can I save ₹5,000 next month?',
];

export default function Chatbot({ expenses, budgets }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ctx = useMemo(() => ({ expenses, budgets }), [expenses, budgets]);

  // Seed initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = generateInsightResponse('summary', ctx);
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: greeting,
        timestamp: Date.now(),
      }]);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  function sendQuestion(question: string) {
    const q = question.trim();
    if (!q || typing) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: q,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Simulate AI thinking delay for natural feel
    setTimeout(() => {
      const response = generateInsightResponse(q, ctx);
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setTyping(false);
      inputRef.current?.focus();
    }, 400 + Math.random() * 400);
  }

  function renderContent(content: string) {
    // Simple markdown-ish: **bold**, bullet lines starting with •
    const lines = content.split('\n');
    return lines.map((line, i) => {
      if (line.trim() === '') return <div key={i} className="h-2" />;
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <div key={i} className="leading-relaxed">
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <span key={j} className="font-semibold text-teal-200">
                  {part.slice(2, -2)}
                </span>
              );
            }
            // Handle ₹ symbol
            const inrParts = part.split(/(₹[\d,]+)/g);
            return inrParts.map((p, k) => {
              if (p.startsWith('₹')) {
                return <span key={k} className="font-semibold text-white">{p}</span>;
              }
              return p ? <span key={k}>{p}</span> : null;
            });
          })}
        </div>
      );
    });
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400/20 to-sky-400/10 border border-teal-400/30 flex items-center justify-center">
          <Sparkles size={22} className="text-teal-300" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-white">AI Financial Assistant</h1>
          <p className="text-sm text-slate-400">
            Ask me about your spending, get forecasts, and find ways to save
          </p>
        </div>
      </div>

      {/* Chat container */}
      <div className="glass-card rounded-2xl flex flex-col" style={{ height: 'calc(100vh - 180px)', minHeight: '520px' }}>
        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-slide-in-right`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-sky-400/15 border border-sky-400/30'
                    : 'bg-gradient-to-br from-teal-400/20 to-sky-400/10 border border-teal-400/30'
                }`}
              >
                {msg.role === 'user' ? (
                  <User size={16} className="text-sky-300" />
                ) : (
                  <Bot size={16} className="text-teal-300" />
                )}
              </div>
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${msg.role === 'user' ? 'max-w-[80%]' : 'min-w-0 flex-1'} ${
                  msg.role === 'user'
                    ? 'bg-sky-400/10 border border-sky-400/20 text-sky-50'
                    : 'bg-white/5 border border-white/10 text-slate-200'
                }`}
              >
                {renderContent(msg.content)}
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400/20 to-sky-400/10 border border-teal-400/30 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-teal-300" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-teal-300 animate-pulse-glow" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 rounded-full bg-teal-300 animate-pulse-glow" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 rounded-full bg-teal-300 animate-pulse-glow" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
        </div>

        {/* Suggested questions */}
        {messages.length <= 1 && (
          <div className="px-4 sm:px-6 pb-2 flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendQuestion(q)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:bg-teal-400/10 hover:border-teal-400/30 hover:text-teal-200"
              >
                <TrendingUp size={12} />
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-white/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendQuestion(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your spending, budgets, or savings..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-teal-400/50"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              className="p-3 rounded-xl bg-teal-400 text-slate-900 hover:bg-teal-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
