/**
 * Simple WebSocket Test Client
 * Tests connection to ws://localhost:8000/ws/chat
 */

import WebSocket from 'ws';

const SESSION_ID = 'test-session-123';
const WS_URL = `ws://localhost:8000/ws/chat?session=${SESSION_ID}`;

console.log('🧪 WebSocket Test Client');
console.log('========================\n');
console.log(`Connecting to: ${WS_URL}\n`);

const ws = new WebSocket(WS_URL);

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
console.log(`   curl -X POST http://localhost:8000/api/health-check \\`);
console.log(`     -H "Content-Type: application/json" \\`);
console.log(`     -d '{"text":"eye pain","user_id":"anonymous","session_id":"${SESSION_ID}"}'`);
console.log('');
console.log('Press Ctrl+C to exit\n');
