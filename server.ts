import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ai } from './server/gemini.ts';
import {
  insertSubmission,
  getAllSubmissions,
  deleteSubmissionById,
  StoredSubmission
} from './server/sqlite.ts';

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = parseInt(process.env.PORT || '3000', 10);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'adm-secret-superkey-8899';
const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyAIzViRqCEzl-p7aeHP3IHz0wNNtJi-Thk';

app.use(express.json({ limit: '15mb' }));

// Middleware to check admin token
function requireAdminToken(req: Request, res: Response, next: () => void) {
  const token = req.headers['x-admin-token'] || req.query.admin_token;
  if (!token || token !== ADMIN_TOKEN) {
    res.status(401).json({ error: 'Unauthorized: Invalid or missing x-admin-token' });
    return;
  }
  next();
}

// 1. GET /api/config -> client config
app.get('/api/config', (_req, res) => {
  res.json({
    mapsApiKey: GOOGLE_MAPS_API_KEY,
    adminTokenHint: ADMIN_TOKEN ? 'Token configured' : 'Not configured'
  });
});

// 2. POST /api/validate -> Google Address Validation API
app.post('/api/validate', async (req: Request, res: Response) => {
  try {
    const { addressLines, regionCode, enableUspsCass } = req.body;
    if (!addressLines || !Array.isArray(addressLines) || addressLines.length === 0) {
      res.status(400).json({ error: 'addressLines array is required.' });
      return;
    }

    const payload: any = {
      address: {
        addressLines,
        regionCode: regionCode || undefined,
      },
      enableUspsCass: Boolean(enableUspsCass),
    };

    const endpoint = `https://addressvalidation.googleapis.com/v1:validateAddress?key=${GOOGLE_MAPS_API_KEY}`;
    const gResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await gResponse.json();

    if (!gResponse.ok) {
      console.warn('Google Address Validation API error response:', data);
      res.status(gResponse.status).json({
        error: data.error?.message || 'Google Address Validation API returned an error',
        details: data
      });
      return;
    }

    res.json(data);
  } catch (error: any) {
    console.error('Validation route error:', error);
    res.status(500).json({ error: error.message || 'Server error while validating address' });
  }
});

// 3. POST /api/submissions -> Stores a validated submission in SQLite
app.post('/api/submissions', async (req: Request, res: Response) => {
  try {
    const sub: StoredSubmission = req.body;
    if (!sub || !sub.formattedAddress || sub.lat === undefined || sub.lng === undefined) {
      res.status(400).json({ error: 'Invalid submission format. formattedAddress, lat, lng required' });
      return;
    }
    const submissionId = sub.id || 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const itemToStore: StoredSubmission = {
      ...sub,
      id: submissionId,
      createdAt: sub.createdAt || new Date().toISOString()
    };

    await insertSubmission(itemToStore);
    res.json({ success: true, submission: itemToStore });
  } catch (err: any) {
    console.error('Save submission error:', err);
    res.status(500).json({ error: err.message || 'Failed to save submission' });
  }
});

// 4. GET /api/submissions -> Requires x-admin-token
app.get('/api/submissions', requireAdminToken, async (_req: Request, res: Response) => {
  try {
    const list = await getAllSubmissions();
    res.json({ submissions: list, total: list.length });
  } catch (err: any) {
    console.error('Get submissions error:', err);
    res.status(500).json({ error: err.message || 'Failed to retrieve submissions' });
  }
});

// 5. DELETE /api/submissions/:id -> Requires x-admin-token
app.delete('/api/submissions/:id', requireAdminToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteSubmissionById(id);
    res.json({ success: true, message: `Submission ${id} deleted` });
  } catch (err: any) {
    console.error('Delete submission error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete submission' });
  }
});

// 6. POST /api/meet/spaces -> Create Google Meet space using User OAuth token
app.post('/api/meet/spaces', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header with Bearer token is required' });
      return;
    }

    const { address, notes } = req.body;
    const meetResp = await fetch('https://meet.googleapis.com/v2/spaces', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const data = await meetResp.json();
    if (!meetResp.ok) {
      res.status(meetResp.status).json({
        error: data.error?.message || 'Google Meet API returned an error',
        details: data
      });
      return;
    }

    res.json({
      success: true,
      space: data,
      meetingUri: data.meetingUri,
      meetingCode: data.meetingCode,
      name: data.name
    });
  } catch (err: any) {
    console.error('Meet space error:', err);
    res.status(500).json({ error: err.message || 'Failed to create Meet space' });
  }
});

// 7. POST /api/ai/analyze-address -> Gemini intelligence on address
app.post('/api/ai/analyze-address', async (req: Request, res: Response) => {
  try {
    const { address, validationResult, mode } = req.body;
    let prompt = `You are an expert address and geographic verification intelligence system.
Analyze the following address and its Google Address Validation result:
Address: ${address}
Validation Data: ${JSON.stringify(validationResult || {})}

Provide a concise, practical, highly informative breakdown including:
1. Deliverability confidence rating (High / Medium / Low) with exact reasoning.
2. Missing or suspicious components (e.g., missing apartment/unit, unconfirmed subpremise, postal discrepancy).
3. Recommended formatted correction or delivery carrier note (e.g. USPS/FedEx/DHL delivery instructions).
4. Local zoning or area context if identifiable.`;

    if (mode === 'fast') {
      const resp = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt
      });
      res.json({ result: resp.text });
      return;
    }

    const resp = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt
    });
    res.json({ result: resp.text });
  } catch (err: any) {
    console.error('AI analyze error:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze address' });
  }
});

// 8. POST /api/ai/maps-grounding -> Gemini with Google Maps Grounding
app.post('/api/ai/maps-grounding', async (req: Request, res: Response) => {
  try {
    const { query, lat, lng } = req.body;
    const contents = query || 'What key landmarks, transport hubs, and services are nearby this address?';
    const toolConfig = (lat !== undefined && lng !== undefined)
      ? {
          retrievalConfig: {
            latLng: {
              latitude: Number(lat),
              longitude: Number(lng)
            }
          }
        }
      : undefined;

    const resp = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig
      }
    });

    const groundingChunks = resp.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    res.json({
      text: resp.text,
      groundingChunks
    });
  } catch (err: any) {
    console.error('Maps grounding error:', err);
    res.status(500).json({ error: err.message || 'Failed to query with Maps Grounding' });
  }
});

// 9. POST /api/ai/search-grounding -> Gemini with Google Search Grounding
app.post('/api/ai/search-grounding', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    const contents = query || 'Find recent news, historical context, or neighborhood public services.';

    const resp = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const groundingChunks = resp.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    res.json({
      text: resp.text,
      groundingChunks
    });
  } catch (err: any) {
    console.error('Search grounding error:', err);
    res.status(500).json({ error: err.message || 'Failed to query with Search Grounding' });
  }
});

// 10. POST /api/ai/chat -> Multi-turn chat
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { messages, addressContext } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'messages array required' });
      return;
    }

    const systemInstruction = `You are the Address Map App intelligent assistant.
Your job is to assist users in inspecting validated addresses, understanding postal deliverability (USPS, CASS, international post), coordinate geocoding, route access, local amenities, and scheduling site meetings via Google Meet.
Current active address context:
${JSON.stringify(addressContext || 'No current address selected.')}
Be friendly, professional, clear, and cite actionable recommendations.`;

    const chat = ai.chats.create({
      model: 'gemini-3.8-flash',
      config: {
        systemInstruction
      }
    });

    let lastResp = '';
    for (const msg of messages) {
      if (msg.role === 'user') {
        const r = await chat.sendMessage({ message: msg.content });
        lastResp = r.text || '';
      }
    }

    res.json({ text: lastResp });
  } catch (err: any) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Chat turn failed' });
  }
});

// Setup Live API WebSocket on /live
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', async (clientWs: WebSocket) => {
  try {
    const session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
        },
        systemInstruction: 'You are an intelligent voice companion for the Address Map App. You help users review real-world addresses, check deliverability, and discuss geographic coordinates in real-time conversation.'
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ audio }));
          }
          if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
        },
        onclose: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close();
          }
        }
      }
    });

    clientWs.on('message', (raw) => {
      try {
        const parsed = JSON.parse(raw.toString());
        if (parsed.audio) {
          session.sendRealtimeInput({
            audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' }
          });
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    });

    clientWs.on('close', () => {
      try {
        session.close();
      } catch {}
    });
  } catch (liveErr) {
    console.error('Live connect error:', liveErr);
    clientWs.send(JSON.stringify({ error: 'Failed to connect to Live API' }));
    clientWs.close();
  }
});

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
  if (pathname === '/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Setup Vite middleware in dev or static files in production
async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production' || !process.env.VITE_DEV_SERVER;
  const distPath = path.resolve(process.cwd(), 'dist');

  // If in production or dist exists and Vite is not explicitly requested, serve static dist
  if (isProd) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('Vite middleware could not be loaded, falling back to static dist:', e);
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Address Map App server listening on http://0.0.0.0:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
});
