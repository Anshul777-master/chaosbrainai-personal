import React, { useState, useRef } from 'react';
import { Mic, Radio, Square, Volume2, Bot, User as UserIcon } from 'lucide-react';
import { ServiceNode, Incident } from '../types';

interface GeminiVoiceAssistantProps {
  services: ServiceNode[];
  activeIncident: Incident | null;
}

export const GeminiVoiceAssistant: React.FC<GeminiVoiceAssistantProps> = ({
  services,
  activeIncident,
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<Array<{ sender: 'user' | 'gemini'; text: string; time: string }>>([
    {
      sender: 'gemini',
      text: 'Gemini 3.8 Live Voice Session ready. Tap "Connect Live Voice" or click any query shortcut below.',
      time: new Date().toLocaleTimeString(),
    },
  ]);
  const [voiceStatus, setVoiceStatus] = useState<string>('IDLE');
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startSession = async () => {
    try {
      setVoiceStatus('CONNECTING');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setVoiceStatus('CONNECTED');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.text) {
            setTranscript((prev) => [
              ...prev,
              { sender: 'gemini', text: msg.text, time: new Date().toLocaleTimeString() },
            ]);
            if ('speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(msg.text);
              utterance.rate = 1.05;
              window.speechSynthesis.speak(utterance);
            }
          }
          if (msg.status) {
            setVoiceStatus(msg.status);
          }
        } catch (e) {
          console.error('Error handling WS audio message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setVoiceStatus('DISCONNECTED');
      };

      ws.onerror = () => {
        setVoiceStatus('ERROR');
      };

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateAudioMeter = () => {
          analyser.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((acc, v) => acc + v, 0);
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animationFrameRef.current = requestAnimationFrame(updateAudioMeter);
        };
        updateAudioMeter();
      }
    } catch (err: any) {
      console.warn('Microphone error or permission denied:', err);
      setVoiceStatus('MIC_RESTRICTED');
      setIsConnected(true);
    }
  };

  const stopSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsConnected(false);
    setAudioLevel(0);
    setVoiceStatus('IDLE');
  };

  const handleSimulateVoiceQuery = (query: string) => {
    setTranscript((prev) => [
      ...prev,
      { sender: 'user', text: query, time: new Date().toLocaleTimeString() },
    ]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ text: query }));
    } else {
      setTimeout(() => {
        let reply = '';
        if (query.includes('status') || query.includes('Payment')) {
          reply = `Payment Service latency is currently 780 milliseconds. Error rate is 18.4%. Downstream cascading impact reaches Order Service and API Gateway.`;
        } else if (query.includes('blast radius')) {
          reply = `The current blast radius is 37.5% across 4 affected microservices. Applying an Envoy Circuit Breaker will reduce blast radius to 6.2%.`;
        } else {
          reply = `Acknowledged. Telemetry metrics are within continuous bounds. All 8 microservices are being monitored via 1-second ticks.`;
        }

        setTranscript((prev) => [
          ...prev,
          { sender: 'gemini', text: reply, time: new Date().toLocaleTimeString() },
        ]);

        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(reply);
          window.speechSynthesis.speak(utterance);
        }
      }, 500);
    }
  };

  return (
    <div className="bg-[#121318] border border-[#1f2128] rounded-lg p-4 space-y-4 shadow-xl font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1f2128] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[#1a1b22] border border-[#2b2e3a] flex items-center justify-center text-white">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">Gemini 3.8 Live Voice Conversations</h3>
              <span className="text-[10px] font-mono-code text-[#8e909d] bg-[#1a1b22] px-1.5 py-0.5 rounded border border-[#262833]">
                gemini-3.8-live
              </span>
            </div>
            <p className="text-[11px] text-[#717380] font-mono-code">
              Real-time bidirectional speech with Live API WebSocket streaming
            </p>
          </div>
        </div>

        {/* Connect / Disconnect Buttons */}
        <div className="flex items-center gap-2">
          <span
            className={`font-mono-code text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${
              isConnected
                ? 'border-emerald-800 text-emerald-400 bg-emerald-950/60'
                : 'border-[#262833] text-[#717380] bg-[#14151b]'
            }`}
          >
            {voiceStatus}
          </span>

          {!isConnected ? (
            <button
              onClick={startSession}
              className="flex items-center gap-1.5 bg-white hover:bg-[#e4e4e7] text-black font-bold px-3 py-1.5 rounded-md text-xs font-mono-code transition-colors shadow-sm"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Connect Live Voice</span>
            </button>
          ) : (
            <button
              onClick={stopSession}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-md text-xs font-mono-code transition-colors shadow-sm"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Disconnect</span>
            </button>
          )}
        </div>
      </div>

      {/* Voice Waveform Visualizer */}
      <div className="bg-[#0b0c10] border border-[#1f2128] rounded-lg p-5 flex flex-col items-center justify-center space-y-3">
        <div className="flex items-center gap-1.5 h-12">
          {[...Array(16)].map((_, i) => {
            const barHeight = isConnected
              ? Math.max(6, Math.min(48, Math.round(audioLevel * (0.4 + 0.6 * Math.sin(i + Date.now() / 200)))))
              : 6;
            return (
              <div
                key={i}
                className="w-1.5 bg-gradient-to-t from-emerald-600 to-white rounded-full transition-all duration-100 ease-out"
                style={{ height: `${barHeight}px` }}
              />
            );
          })}
        </div>
        <p className="text-[11px] font-mono-code text-[#717380]">
          {isConnected
            ? 'Listening to microphone stream (16kHz PCM) ... Speak anytime'
            : 'Live audio channel idle. Click Connect Live Voice to begin audio stream.'}
        </p>
      </div>

      {/* Quick Voice Commands */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono-code uppercase text-[#717380] block">
          Spoken Query Shortcuts (Click to speak):
        </span>
        <div className="flex flex-wrap gap-2 text-xs font-mono-code">
          {[
            'What is the current health and latency of Payment Service?',
            'What is the estimated blast radius if Order Service fails?',
            'Explain how circuit breakers protect the API Gateway from cascading failure',
          ].map((cmd, i) => (
            <button
              key={i}
              onClick={() => handleSimulateVoiceQuery(cmd)}
              className="bg-[#0b0c10] hover:bg-[#191b22] text-[#d1d5db] hover:text-white border border-[#22242e] px-2.5 py-1 rounded-md text-[11px] transition-colors flex items-center gap-1.5"
            >
              <Volume2 className="w-3 h-3 text-emerald-400" />
              <span>"{cmd}"</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live Transcript Log */}
      <div className="bg-[#0b0c10] border border-[#1f2128] rounded-lg p-3 max-h-56 overflow-y-auto space-y-2 text-xs font-sans">
        <span className="text-[10px] font-mono-code uppercase text-[#555763] block mb-1">
          Live Conversation Transcript
        </span>
        {transcript.map((item, idx) => (
          <div
            key={idx}
            className={`p-2.5 rounded-md flex items-start gap-2.5 ${
              item.sender === 'user'
                ? 'bg-[#181920] border border-[#262833] text-white'
                : 'bg-[#14151b] border border-[#22242e] text-[#d1d5db]'
            }`}
          >
            {item.sender === 'user' ? (
              <UserIcon className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
            ) : (
              <Bot className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between text-[10px] font-mono-code text-[#717380] mb-0.5">
                <span>{item.sender === 'user' ? 'You (Spoken)' : 'Gemini 3.8 Live'}</span>
                <span>{item.time}</span>
              </div>
              <p className="leading-relaxed">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
