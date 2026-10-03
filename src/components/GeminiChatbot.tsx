import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Search,
  Globe,
  Bot,
  User as UserIcon,
  Trash2,
  ExternalLink,
  Loader2,
  Cpu,
} from 'lucide-react';
import { User, Incident, ServiceNode } from '../types';
import { saveChatMessageToFirestore, fetchChatMessagesFromFirestore } from '../services/firebase';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  modelUsed?: string;
  groundingSources?: Array<{ title: string; url: string }>;
  searchQueries?: string[];
  timestamp: string;
}

interface GeminiChatbotProps {
  user: User | null;
  activeIncident: Incident | null;
  services: ServiceNode[];
}

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({
  user,
  activeIncident,
  services,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      role: 'model',
      content:
        'Hello Engineer. I am ChaosBrain SRE Assistant. I can assist with root cause analysis, Envoy/Istio circuit breaker configurations, resilience scoring, or search for real-world outage case studies with Google Search Grounding. How can I assist your cluster today?',
      modelUsed: 'gemini-3.5-flash',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [enableSearchGrounding, setEnableSearchGrounding] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChatMessagesFromFirestore().then((persisted) => {
      if (persisted.length > 0) {
        const formatted: ChatMessage[] = persisted
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          .map((p) => ({
            id: p.id,
            role: p.role,
            content: p.content,
            modelUsed: p.model,
            groundingSources: p.groundingSources,
            timestamp: new Date(p.timestamp).toLocaleTimeString(),
          }));
        setMessages((prev) => [...prev, ...formatted]);
      }
    });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    const userMessageId = `msg-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    saveChatMessageToFirestore({
      id: userMessageId,
      userId: user?.id,
      role: 'user',
      content: text,
    });

    try {
      const clusterContext = `Current Cluster Context:
- Active Incident: ${activeIncident ? `${activeIncident.id} (${activeIncident.title} on ${activeIncident.affectedServiceId})` : 'None'}
- Services: ${services.map((s) => `${s.name} (${s.health}, latency: ${s.currentMetrics.latency}ms, errorRate: ${s.currentMetrics.errorRate}%)`).join(', ')}
`;

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: `${text}\n\n[System Telemetry Context: ${clusterContext}]` },
          ],
          model: enableSearchGrounding ? 'gemini-3.5-flash' : selectedModel,
          systemInstruction:
            'You are ChaosBrain SRE Assistant — an expert Site Reliability Engineer, Distributed Systems Architect, and Incident Commander. Answer questions with actionable SRE guidance, technical accuracy, and reference microservice topologies, circuit breakers, and blast radius.',
          enableSearchGrounding,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate response from Gemini API');
      }

      const botMessageId = `msg-bot-${Date.now()}`;
      const botMsg: ChatMessage = {
        id: botMessageId,
        role: 'model',
        content: data.text,
        modelUsed: data.modelUsed,
        groundingSources: data.groundingSources,
        searchQueries: data.searchQueries,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, botMsg]);

      saveChatMessageToFirestore({
        id: botMessageId,
        userId: user?.id,
        role: 'model',
        content: data.text,
        model: data.modelUsed,
        groundingSources: data.groundingSources,
      });
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'model',
        content: `Error communicating with Gemini: ${err.message}.`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const promptSuggestions = [
    'Analyze root cause of Payment Service latency cascading to API Gateway',
    'Generate Envoy circuit breaker configuration with 5s timeout and 3 retries',
    'Search Google for recent microservice cascading outages and post-mortems',
    'Explain how to calculate Blast Radius in a directed dependency graph',
  ];

  return (
    <div className="bg-[#121318] border border-[#1f2128] rounded-lg flex flex-col h-[650px] shadow-xl overflow-hidden font-sans">
      {/* Chat Header */}
      <div className="p-3 border-b border-[#1f2128] bg-[#0e0f13] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#1e2029] border border-[#2f3240] flex items-center justify-center text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm">ChaosBrain AI Chatbot</h3>
              <span className="text-[10px] font-mono-code text-purple-400 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-850">
                Multi-Turn SRE Assistant
              </span>
            </div>
            <p className="text-[11px] text-[#717380] font-mono-code">
              Powered by Google Gemini with Search Grounding
            </p>
          </div>
        </div>

        {/* Model Selector & Google Search Grounding Toggle */}
        <div className="flex items-center gap-2 font-mono-code text-xs">
          <div className="flex items-center gap-1 bg-[#181920] border border-[#262833] px-2 py-1 rounded">
            <Cpu className="w-3.5 h-3.5 text-[#8e909d]" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={enableSearchGrounding}
              className="bg-transparent text-[#ededef] text-xs focus:outline-none cursor-pointer"
            >
              <option value="gemini-3.5-flash" className="bg-[#181920] text-white">
                gemini-3.5-flash (General)
              </option>
              <option value="gemini-3.1-pro-preview" className="bg-[#181920] text-white">
                gemini-3.1-pro-preview (Complex)
              </option>
              <option value="gemini-3.1-flash-lite" className="bg-[#181920] text-white">
                gemini-3.1-flash-lite (Fast)
              </option>
            </select>
          </div>

          <button
            onClick={() => setEnableSearchGrounding(!enableSearchGrounding)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-semibold transition-colors ${
              enableSearchGrounding
                ? 'border-emerald-600 bg-emerald-950/40 text-emerald-300'
                : 'border-[#262833] bg-[#181920] text-[#8e909d] hover:text-white'
            }`}
            title="Enables real-time Google Search Grounding via gemini-3.5-flash"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Search Grounding</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                enableSearchGrounding ? 'bg-emerald-400 animate-pulse' : 'bg-[#555763]'
              }`}
            />
          </button>

          <button
            onClick={() =>
              setMessages([
                {
                  id: 'msg-welcome',
                  role: 'model',
                  content: 'Chat thread reset. How can I assist with your cluster resilience?',
                  timestamp: new Date().toLocaleTimeString(),
                },
              ])
            }
            className="p-1.5 text-[#717380] hover:text-white hover:bg-[#1a1b22] rounded transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0b0e]">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded bg-[#181922] border border-[#2b2e3c] flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-lg p-3 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-white text-black font-medium ml-12'
                    : 'bg-[#14151b] border border-[#22242e] text-[#ededef]'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-[10px] font-mono-code mb-1 opacity-70">
                  <span>{isUser ? 'You' : `ChaosBrain (${msg.modelUsed || 'Gemini'})`}</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div className="whitespace-pre-wrap">{msg.content}</div>

                {msg.groundingSources && msg.groundingSources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-[#22242e] space-y-1 font-mono-code text-[11px]">
                    <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <Search className="w-3 h-3" />
                      <span>Google Search Grounding Sources:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {msg.groundingSources.map((source, idx) => (
                        <a
                          key={idx}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 bg-[#0b0c10] hover:bg-[#1a1b22] text-[#ededef] border border-[#22242e] px-2 py-0.5 rounded text-[10px] transition-colors"
                        >
                          <span className="truncate max-w-[180px]">{source.title}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded bg-[#22242e] border border-[#333642] flex items-center justify-center text-white shrink-0 mt-0.5">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-[#8e909d] text-xs font-mono-code bg-[#14151b] p-2.5 rounded border border-[#22242e] max-w-sm">
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            <span>Gemini is analyzing cluster topology and reasoning...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="px-3 py-2 bg-[#0e0f13] border-t border-[#1f2128] flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono-code">
        <span className="text-[#555763] whitespace-nowrap">Suggested:</span>
        {promptSuggestions.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            className="px-2 py-0.5 rounded bg-[#14151b] hover:bg-[#1f2129] text-[#8e909d] hover:text-white border border-[#22242e] whitespace-nowrap transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-[#121318] border-t border-[#1f2128] flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
          placeholder={
            enableSearchGrounding
              ? 'Ask with Google Search Grounding enabled (e.g. "Latest Envoy CVEs")...'
              : 'Ask Gemini SRE Assistant about failures, root causes, or Istio patches...'
          }
          className="flex-1 bg-[#0b0c10] border border-[#22242e] rounded-md px-3 py-2 text-xs text-white placeholder-[#555763] focus:outline-none focus:border-white transition-colors"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || isLoading}
          className="bg-white hover:bg-[#e4e4e7] disabled:opacity-50 text-black font-bold px-3 py-2 rounded-md text-xs transition-colors flex items-center gap-1"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};
