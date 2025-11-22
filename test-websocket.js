/**
 * Simple WebSocket Test Client
 * Tests WebSocket connection to HuggingFace Space or local server
 * 
 * Usage:
 *   npx tsx test-websocket.js
 *   WS_URL=wss://medagen-backend.hf.space/ws/chat npx tsx test-websocket.js
 */

import WebSocket from 'ws';

const SESSION_ID = 'test-session-123';
const WS_URL = process.env.WS_URL || 'wss://medagen-backend.hf.space/ws/chat';
const API_URL = process.env.API_URL || 'https://medagen-backend.hf.space/api/health-check';
const fullWsUrl = `${WS_URL}?session=${SESSION_ID}`;

console.log('🧪 WebSocket Test Client');
console.log('========================\n');
console.log(`Connecting to: ${fullWsUrl}\n`);

const ws = new WebSocket(fullWsUrl);

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully!\n');
  console.log('Listening for messages...\n');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📩 Received message:');
    console.log(JSON.stringify(message, null, 2));
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

// Keep alive - send ping every 10 seconds
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'ping',
      timestamp: new Date().toISOString(),
    }));
    console.log('💓 Sent ping');
  }
}, 10000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Closing connection...');
  ws.close();
});

console.log('💡 Tip: Open another terminal and send a POST request to:');
console.log(`   curl -X POST ${API_URL} \\`);
console.log(`     -H "Content-Type: application/json" \\`);
console.log(`     -d '{"text":"eye pain","user_id":"anonymous","session_id":"${SESSION_ID}"}'`);
console.log('');
console.log(`📡 WebSocket URL: ${fullWsUrl}`);
console.log(`🌐 API URL: ${API_URL}`);
console.log('');
console.log('Press Ctrl+C to exit\n');
