import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  ArrowRight, 
  RotateCcw,
  Minimize2,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api';
import { Category } from '../types';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  action?: {
    type: string;
    label: string;
    payload?: string;
  };
}

interface ChatbotWidgetProps {
  onOpenMerchantHub: () => void;
  onOpenOrderTracking: () => void;
  onOpenLocationPicker: () => void;
  onSelectCategory: (category: Category) => void;
  onOpenCart: () => void;
}

const QUICK_QUESTIONS = [
  { label: '🚚 Delivery & Transit', query: 'How does delivery and shipping work across Sierra Leone?' },
  { label: '💵 Payment & COD', query: 'What payment methods are used? Can I pay with mobile money?' },
  { label: '🏪 Create a Store', query: 'How do I create a store or sell items as a vendor?' },
  { label: '📦 Track My Order', query: 'How can I track my order status?' },
  { label: '⚡ Solar Stations', query: 'Tell me about solar generators and backup power equipment.' },
  { label: '🛠️ Trade Artisans', query: 'Can I book blue-collar trade services like electricians?' },
];

export const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  onOpenMerchantHub,
  onOpenOrderTracking,
  onOpenLocationPicker,
  onSelectCategory,
  onOpenCart,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: "Hello! Welcome to Abu Marketplace Sierra Leone. I'm your instant assistant. Please note: NO mobile money is being used initially — all orders are strictly Cash on Delivery / Pay on Delivery upon physical inspection. Ask me anything about delivery across Sierra Leone, placing orders, opening a vendor store, or tracking a shipment!",
      timestamp: 'Just now',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await api.sendChatMessage(text);
      const assistantMessage: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: response.action,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ast-${Date.now()}`,
          sender: 'assistant',
          text: "Please note: No mobile money is being used initially. All orders are fulfilled with Cash on Delivery (Pay on Delivery) upon arrival and inspection. You can enjoy fast delivery across Sierra Leone, or click 'Create Store' at the top to sell items.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: { type: string; label: string; payload?: string }) => {
    if (action.type === 'open_merchant') {
      onOpenMerchantHub();
    } else if (action.type === 'open_tracking') {
      onOpenOrderTracking();
    } else if (action.type === 'open_location') {
      onOpenLocationPicker();
    } else if (action.type === 'view_cart') {
      onOpenCart();
    } else if (action.type === 'filter_category' && action.payload) {
      onSelectCategory(action.payload as Category);
    }
    // Optionally close chat or keep open
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: 'Chat history cleared. How else can I assist you with shopping or selling today?',
        timestamp: 'Just now',
      },
    ]);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-5 right-4 sm:right-6 z-40 flex items-center gap-2">
          {/* Quick Helper Teaser */}
          <button
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-white text-[#002541] px-3.5 py-2 rounded-full shadow-lg border border-[#E7ECF0] text-xs font-semibold hover:shadow-xl transition-all hover:scale-105 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00875A]" />
            <span>Questions? Ask AI Assistant</span>
          </button>

          {/* Main Floating Circle Button */}
          <button
            onClick={() => setIsOpen(true)}
            className="w-13 h-13 rounded-full bg-[#002541] hover:bg-[#0B3B60] text-white shadow-xl flex items-center justify-center relative transition-transform hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8df7c1] focus:ring-offset-2"
            title="Open Quick Q&A Chatbot"
            aria-label="Open Chatbot"
          >
            <MessageSquare className="w-6 h-6 text-[#8df7c1]" />
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#00875A] border-2 border-white rounded-full"></span>
          </button>
        </div>
      )}

      {/* Responsive Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-3 sm:right-6 z-50 w-[calc(100vw-24px)] sm:w-[390px] h-[540px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-[#E7ECF0] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-[#002541] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0B3B60] border border-[#144b77] flex items-center justify-center relative">
                <Bot className="w-4 h-4 text-[#8df7c1]" />
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-[#00875A] rounded-full ring-1 ring-[#002541]"></span>
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold flex items-center gap-1.5 leading-tight">
                  <span>Abu Assistant</span>
                  <span className="bg-[#8df7c1]/20 text-[#8df7c1] text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase">
                    AI Support
                  </span>
                </div>
                <p className="text-[10px] text-[#d0e4ff] leading-none mt-0.5">
                  Instant Q&A · Sierra Leone Commerce
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                className="p-2.5 text-[#d0e4ff] hover:text-white hover:bg-[#0B3B60] rounded transition-colors cursor-pointer"
                title="Restart conversation"
                aria-label="Restart conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2.5 text-[#d0e4ff] hover:text-white hover:bg-[#0B3B60] rounded transition-colors cursor-pointer"
                title="Minimize chat"
                aria-label="Minimize chat"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2.5 text-[#d0e4ff] hover:text-white hover:bg-[#0B3B60] rounded transition-colors cursor-pointer"
                title="Close chat"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick FAQ Pills Tray */}
          <div className="bg-[#F8FAFC] border-b border-[#E7ECF0] px-3 py-2 shrink-0">
            <div className="text-[10px] uppercase font-bold text-[#5A6872] tracking-wider mb-1.5">
              Quick Questions:
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {QUICK_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q.query)}
                  disabled={isLoading}
                  className="whitespace-nowrap px-2.5 py-1 bg-white hover:bg-[#0B3B60] hover:text-white text-[#1A242D] border border-[#DCE1E5] rounded-full text-[11px] font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#FCFCFD]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-[#002541] text-[#8df7c1] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`max-w-[82%] flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#002541] text-white rounded-br-xs font-normal'
                        : 'bg-[#F1F4F8] text-[#1A242D] rounded-bl-xs border border-[#E2E8F0]'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>

                  {/* Optional Interactive Action Button */}
                  {msg.action && (
                    <button
                      onClick={() => handleActionClick(msg.action!)}
                      className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00875A] hover:bg-[#00704a] text-white text-[11px] font-bold rounded-lg shadow-2xs transition-all cursor-pointer hover:gap-2"
                    >
                      <span>{msg.action.label}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}

                  <span className="text-[9px] text-[#8C9BA5] mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-[#0B3B60] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-[#d0e4ff]" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-full bg-[#002541] text-[#8df7c1] flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-[#F1F4F8] border border-[#E2E8F0] px-4 py-2.5 rounded-2xl rounded-bl-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#002541] animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-[#002541] animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 rounded-full bg-[#002541] animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-white border-t border-[#E7ECF0] flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your question..."
              className="flex-1 h-9.5 px-3.5 bg-[#F4F6F8] text-[#1A242D] placeholder-[#73777f] text-xs sm:text-sm rounded-full border border-transparent focus:border-[#0B3B60] focus:bg-white focus:outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="w-9.5 h-9.5 rounded-full bg-[#002541] hover:bg-[#0B3B60] disabled:bg-[#DCE1E5] text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed"
              title="Send message"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
