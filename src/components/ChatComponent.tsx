import  { useMemo, useState } from "react";
import { LuBot, LuSendHorizontal, LuPlus, LuMessageSquare, LuTrash2, LuMenu } from "react-icons/lu";
import useGroqResponse from "../hooks/useGroqResponse";

type Message = { id: string; role: "user" | "assistant"; text: string };
type Conversation = { id: string; title: string; messages: Message[] };

export default function ChatWithHistoryAndFollowups() {
  const { send, loading, abort, reset } = useGroqResponse();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const id = String(Date.now());
    return [
      {
        id,
        title: "New chat",
        messages: [],
      },
    ];
  });

  const [activeId, setActiveId] = useState<string>(conversations[0].id);
  const [input, setInput] = useState("");

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId)!,
    [conversations, activeId]
  );

  function newChat() {
    const id = String(Date.now());
    const conv: Conversation = { id, title: "New chat", messages: [] };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(id);
    setInput("");
  }

  function selectConversation(id: string) {
    setActiveId(id);
    setInput("");
  }

  function updateActiveMessages(fn: (msgs: Message[]) => Message[]) {
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, messages: fn(c.messages) } : c))
    );
  }

  async function handleSend() {
    if (!input.trim()) return;

    const userMsg: Message = { id: String(Date.now()) + ":u", role: "user", text: input };
    updateActiveMessages((m) => [...m, userMsg]);

    const conv = activeConversation.messages.concat(userMsg);
    const prompt = conv.map((m) => (m.role === "user" ? `User: ${m.text}` : `Assistant: ${m.text}`)).join("\n");

    setInput("");

    try {
      const res = await send(prompt);
      const assistantMsg: Message = { id: String(Date.now()) + ":a", role: "assistant", text: res ?? "(no response)" };
      updateActiveMessages((m) => [...m, assistantMsg]);
    } catch (err) {
      const assistantMsg: Message = { id: String(Date.now()) + ":a", role: "assistant", text: "Error: no response" };
      updateActiveMessages((m) => [...m, assistantMsg]);
    }
  }

  function deleteConversation(id: string) {
    if (conversations.length === 1) {
      setConversations([{ id: String(Date.now()), title: "New chat", messages: [] }]);
      setActiveId(conversations[0].id);
    } else {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === activeId) {
        const remaining = conversations.filter((c) => c.id !== id);
        setActiveId(remaining[0].id);
      }
    }
  }

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-gray-950 flex flex-col overflow-hidden`}>
        <div className="p-3">
          <button
            onClick={newChat}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors"
          >
            <LuPlus size={18} />
            <span className="text-sm font-medium">New chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => selectConversation(c.id)}
              className={`w-full group text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors relative ${
                c.id === activeId ? "bg-gray-800" : "hover:bg-gray-800"
              }`}
            >
              <LuMessageSquare size={16} className="flex-shrink-0 text-gray-400" />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{c.title}</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(c.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                title="Delete"
              >
                <LuTrash2 size={14} />
              </button>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-gray-800 text-xs text-gray-500">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-gray-700 bg-gray-900">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <LuMenu size={20} />
            </button>
            <div className="flex items-center gap-2 flex-1">
              <LuBot size={20} className="text-blue-400" />
              <span className="font-medium text-sm">{activeConversation.title}</span>
            </div>
            {loading && (
              <button
                onClick={() => {
                  reset();
                  abort();
                }}
                className="text-sm px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                Stop
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {activeConversation.messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md px-4">
                <LuBot size={48} className="mx-auto mb-4 text-gray-600" />
                <h2 className="text-2xl font-semibold mb-2">How can I help you today?</h2>
                <p className="text-gray-400 text-sm">Start a conversation by typing a message below</p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {activeConversation.messages.map((m) => (
                <div key={m.id} className="group">
                  <div className={`flex gap-4 ${m.role === "user" ? "justify-end" : ""}`}>
                    {m.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <LuBot size={18} />
                      </div>
                    )}
                    <div className={`flex-1 max-w-[80%] ${m.role === "user" ? "text-right" : ""}`}>
                      <div className={`inline-block px-4 py-3 rounded-2xl ${
                        m.role === "user" 
                          ? "bg-blue-600 text-white" 
                          : "bg-gray-800 text-gray-100"
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                      </div>
                    </div>
                    {m.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium">U</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <LuBot size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block px-4 py-3 rounded-2xl bg-gray-800">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-700 bg-gray-900">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="relative flex items-end gap-3 bg-gray-800 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Message ChatBot..."
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-sm max-h-32 overflow-y-auto"
                style={{ minHeight: '24px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <LuSendHorizontal size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              Press Enter to send, Shift + Enter for new line
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}