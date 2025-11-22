/**
 * Interactive WebSocket Test Client
 * Tests connection and message flow on HuggingFace Space or local server
 * 
 * Usage:
 *   npx tsx test-websocket-interactive.js
 *   WS_URL=wss://medagen-backend.hf.space/ws/chat API_URL=https://medagen-backend.hf.space/api/health-check npx tsx test-websocket-interactive.js
 */

import WebSocket from 'ws';
import * as readline from 'readline';

const SESSION_ID = 'test-session-123';
const WS_URL = process.env.WS_URL || 'wss://medagen-backend.hf.space/ws/chat';
const API_URL = process.env.API_URL || 'https://medagen-backend.hf.space/api/health-check';
const fullWsUrl = `${WS_URL}?session=${SESSION_ID}`;

console.log('🧪 WebSocket Interactive Test Client');
console.log('====================================\n');
console.log(`📡 WebSocket URL: ${fullWsUrl}`);
console.log(`🌐 API URL: ${API_URL}\n`);
console.log(`Connecting to: ${fullWsUrl}\n`);

const ws = new WebSocket(fullWsUrl);

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully!\n');
  console.log('Listening for messages...\n');
  console.log('Commands:');
  console.log('  q - Quit');
  console.log('  t - Test sending a triage request');
  console.log('  p - Send ping\n');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('\n📩 Received message:');
    console.log('Type:', message.type);
    console.log('Data:', JSON.stringify(message, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ Error parsing message:', error);
    console.log('Raw data:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`\n🔌 WebSocket closed: code=${code}, reason=${reason || 'none'}`);
  process.exit(0);
});

// Create readline interface for interactive input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> ',
});

rl.prompt();

rl.on('line', async (line) => {
  const cmd = line.trim().toLowerCase();

  if (cmd === 'q' || cmd === 'quit') {
    console.log('👋 Closing connection...');
    ws.close();
    rl.close();
  } else if (cmd === 'p' || cmd === 'ping') {
    ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
    console.log('💓 Sent ping');
  } else if (cmd === 't' || cmd === 'test') {
    console.log('📤 Sending test triage request...');

    // Send HTTP request to trigger backend agent
    const fetch = await import('node-fetch').then(m => m.default);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'eye pain',
          user_id: 'anonymous',
          session_id: SESSION_ID,
        }),
      });

      const result = await response.json();
      console.log('✅ Triage request sent successfully');
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('\nWatch for WebSocket messages above!\n');
    } catch (error) {
      console.error('❌ Error sending triage request:', error.message);
    }
  }

  rl.prompt();
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Closing connection...');
  ws.close();
  rl.close();
  process.exit(0);
});
