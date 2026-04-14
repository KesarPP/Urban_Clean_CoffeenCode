import { useMemo, useState } from 'react';
import { Bot, MessageCircle, Send, X } from 'lucide-react';

function getBotReply(input) {
  const text = input.toLowerCase();

  if (text.includes('report') || text.includes('complaint') || text.includes('issue')) {
    return 'To report an issue, open the Report page from the citizen menu and submit a photo, location, and description. This helps officials respond faster.';
  }

  if (text.includes('track') || text.includes('status')) {
    return 'You can track your complaint from the Track page. Keep your report ID ready for the quickest status lookup.';
  }

  if (text.includes('event') || text.includes('activity') || text.includes('ngo')) {
    return 'Go to Activities to discover nearby events and NGO drives. You can filter by category and register directly.';
  }

  if (text.includes('education') || text.includes('recycle') || text.includes('waste')) {
    return 'The Education Hub has recycling guides, awareness tips, and practical actions for cleaner neighborhoods.';
  }

  if (text.includes('theme') || text.includes('dark') || text.includes('light')) {
    return 'You can switch between light and dark themes using the theme toggle in the app interface.';
  }

  if (text.includes('hello') || text.includes('hi') || text.includes('help')) {
    return 'Hi! I can help with reporting issues, tracking complaints, activities, and education resources. Try asking: "How do I report an issue?"';
  }

  return 'I can help with: reporting issues, tracking complaint status, finding events, and using the education hub. Ask me one of these topics.';
}

export default function CitizenChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Hi! I am your Urban Clean assistant. Ask me anything about citizen features.'
    }
  ]);

  const quickPrompts = useMemo(
    () => [
      'How do I report an issue?',
      'How can I track complaint status?',
      'Where are citizen activities?',
      'How to learn recycling tips?'
    ],
    []
  );

  const addMessage = (sender, text) => {
    setMessages((prev) => [...prev, { id: prev.length + 1, sender, text }]);
  };

  const submitMessage = (rawText) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    addMessage('user', trimmed);
    const botReply = getBotReply(trimmed);
    addMessage('bot', botReply);
    setInput('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[120]">
      {isOpen && (
        <div className="w-[340px] max-w-[90vw] h-[460px] bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-3">
          <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--input-bg)]">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-bold text-text-primary">Citizen Help Assistant</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-[var(--card-bg)] transition-colors"
              aria-label="Close chat assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 border-b border-[var(--border-color)] flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => submitMessage(prompt)}
                className="text-xs px-2.5 py-1.5 rounded-full border border-[var(--border-color)] text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[var(--bg)]">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  message.sender === 'bot'
                    ? 'bg-[var(--input-bg)] text-text-primary border border-[var(--border-color)]'
                    : 'ml-auto bg-primary text-white'
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitMessage(input);
            }}
            className="p-3 border-t border-[var(--border-color)] bg-[var(--card-bg)]"
          >
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for help..."
                className="flex-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-primary text-white hover:bg-blue-600 transition-colors"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-14 w-14 rounded-full bg-primary text-white shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center"
        aria-label="Open citizen help assistant"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </div>
  );
}
