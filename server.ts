/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not defined. Voice orders will fall back to local rule-based parsing.');
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// API endpoint to parse spoken orders using Gemini 3.5-flash
app.post('/api/parse-voice-order', async (req, res) => {
  try {
    const { transcript, menuItems } = req.body;

    if (!transcript || !menuItems || !Array.isArray(menuItems)) {
      res.status(400).json({ error: 'Missing transcript or menu items list' });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      // Return empty parsed state, client will fallback
      res.json({ items: [], tableNumber: '', specialNotes: '' });
      return;
    }

    // Format menu list for prompt context
    const menuContext = menuItems.map(item => `- ID: "${item.id}", Name: "${item.name}", Category: "${item.category}"`).join('\n');

    const prompt = `
You are a highly advanced AI voice command parser for a premium restaurant.
Your task is to take a spoken order transcript (which may be in English, Bangla, or a mixture of both - "Banglish") and accurately parse it into structured JSON matching the provided menu list.

Available Menu Items:
${menuContext}

Spoken Transcript:
"${transcript}"

Requirements:
1. Identify any menu items mentioned in the transcript. Match them against the available item names. Even if pronounced slightly incorrectly or translated (e.g. "beef steak" matches "Wagyu Ribeye Steak", "chocolate dome" matches "Royal Valrhona Chocolate Dome", "কোকা কোলা" or "drink" matches beverages, etc.), find the closest ID.
2. Determine the quantity of each matched item. If not specified, default to 1.
3. Detect if a table number is specified (e.g., "table 5", "৫ নম্বর টেবিল", "টেবিল ৪"). Extract only the digits/number as a string.
4. Detect any special instructions or notes (e.g., "extra cheese", "ঝাল ছাড়া", "less spicy", "not too sweet"). Include this in the specialNotes field.

Return a JSON object conforming exactly to the requested schema.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  menuItemId: { 
                    type: Type.STRING, 
                    description: 'The exact ID of the matching MenuItem from the menu list (e.g., "m1").' 
                  },
                  name: { 
                    type: Type.STRING, 
                    description: 'The matched MenuItem name.' 
                  },
                  quantity: { 
                    type: Type.INTEGER, 
                    description: 'Quantity of the item ordered.' 
                  }
                },
                required: ['menuItemId', 'name', 'quantity']
              },
              description: 'List of matching food/beverage items identified.'
            },
            tableNumber: { 
              type: Type.STRING, 
              description: 'The detected table number as a numeric string (e.g., "5"), or empty if not found.' 
            },
            specialNotes: { 
              type: Type.STRING, 
              description: 'Any special note, seasoning preference, or customization request (in English or Bangla).' 
            }
          },
          required: ['items', 'tableNumber', 'specialNotes']
        }
      }
    });

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error('Empty response from Gemini');
    }

    const parsedData = JSON.parse(textResponse.trim());
    res.json(parsedData);
  } catch (error) {
    console.error('Gemini Voice Parsing Error:', error);
    res.status(500).json({ error: 'Failed to parse voice command', details: error instanceof Error ? error.message : String(error) });
  }
});

// App Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', time: new Date().toISOString() });
});

async function bootstrap() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Luxury Restaurant SaaS Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

bootstrap();
