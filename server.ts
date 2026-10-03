import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

app.use(express.json());

// Initialize GoogleGenAI SDK with server-side key
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Endpoint: Multi-Turn Chatbot with Model Selection & Search Grounding
app.post('/api/gemini/chat', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
    }

    const {
      messages = [],
      model = 'gemini-3.5-flash',
      systemInstruction = 'You are ChaosBrain SRE Assistant — an expert Site Reliability Engineer, Distributed Systems Architect, and Incident Commander.',
      enableSearchGrounding = false,
    } = req.body;

    // Model selection validation
    // gemini-3.1-pro-preview for complex tasks
    // gemini-3.5-flash for general tasks & search grounding
    // gemini-3.1-flash-lite for fast tasks
    let selectedModel = model;
    if (enableSearchGrounding) {
      selectedModel = 'gemini-3.5-flash';
    }

    const tools: any[] = [];
    if (enableSearchGrounding) {
      tools.push({ googleSearch: {} });
    }

    // Format history for multi-turn conversation
    const contents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction,
        ...(tools.length > 0 ? { tools } : {}),
      },
    });

    const text = response.text || 'No response generated.';
    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata || null;

    // Extract search sources if present
    const sources: Array<{ title: string; url: string }> = [];
    if (groundingMetadata?.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks as any[]) {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({
            title: chunk.web.title,
            url: chunk.web.uri,
          });
        }
      }
    }

    const searchQueries: string[] = groundingMetadata?.webSearchQueries || [];

    res.json({
      text,
      modelUsed: selectedModel,
      groundingSources: sources,
      searchQueries,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/chat:', error);
    res.status(500).json({
      error: error.message || 'Internal error calling Gemini API',
    });
  }
});

// Endpoint: Deep RCA Architectural Insight
app.post('/api/gemini/rca-deep', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const { incident, services, blastRadius } = req.body;

    const prompt = `Perform an advanced SRE Root Cause Analysis and Post-Mortem review for this incident:
Incident ID: ${incident?.id}
Title: ${incident?.title}
Severity: ${incident?.severity}
Trigger: ${incident?.triggerMetric}
Blast Radius: ${blastRadius}%
Affected Services: ${JSON.stringify(incident?.cascadingServices)}
Cluster Topology: ${JSON.stringify(services?.map((s: any) => ({ id: s.id, name: s.name, tier: s.tier, latency: s.currentMetrics.latency, errorRate: s.currentMetrics.errorRate })))}

Provide:
1. Executive Post-Mortem Summary
2. Why the cascading failure occurred across the dependency graph
3. Exact Envoy/Istio and Kubernetes resilience mitigation recommendations`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        systemInstruction:
          'You are a Principal Site Reliability Engineer conducting an incident post-mortem for high-scale microservices.',
      },
    });

    res.json({ text: response.text || '' });
  } catch (error: any) {
    console.error('Error in /api/gemini/rca-deep:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket Server for Gemini Live API (gemini-3.8-live) Voice Conversations
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Client connected to Live API WebSocket');
  let liveSession: any = null;

  try {
    if (ai) {
      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction:
            'You are ChaosBrain SRE Voice Copilot. You assist engineers via voice during real-time chaos experiments and outages. Speak concisely, clearly, and technically like a seasoned Lead SRE.',
        },
        callbacks: {
          onmessage: (message: any) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (text) {
              clientWs.send(JSON.stringify({ text }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
        },
      });
      clientWs.send(JSON.stringify({ status: 'CONNECTED', message: 'Connected to Gemini 3.8 Live API' }));
    } else {
      clientWs.send(
        JSON.stringify({
          status: 'SIMULATED',
          message: 'Live API running in simulated SRE voice mode (GEMINI_API_KEY required for live cloud audio stream)',
        })
      );
    }
  } catch (err: any) {
    console.error('Failed to establish Live session:', err);
    clientWs.send(JSON.stringify({ status: 'ERROR', error: err.message }));
  }

  clientWs.on('message', (data: any) => {
    try {
      const parsed = JSON.parse(data.toString());
      if (parsed.audio && liveSession) {
        liveSession.sendRealtimeInput({
          audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
        });
      } else if (parsed.text && liveSession) {
        liveSession.sendRealtimeInput({
          text: parsed.text,
        });
      } else if (!liveSession) {
        // Fallback simulated voice response if key not available
        setTimeout(() => {
          clientWs.send(
            JSON.stringify({
              text: `[SRE Voice Dispatch] Received telemetry query: "${parsed.text || 'Voice stream'}". Payment Service is isolated; Envoy circuit breaker status is OPEN with 99.4% availability.`,
            })
          );
        }, 500);
      }
    } catch (e) {
      console.error('Error parsing client WS message:', e);
    }
  });

  clientWs.on('close', () => {
    console.log('Client disconnected from Live API WebSocket');
  });
});

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;
  if (pathname === '/live' || pathname === '/live/') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

// Vite Middleware Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, () => {
    console.log(`ChaosBrain AI server running on port ${port}`);
  });
}

startServer();
