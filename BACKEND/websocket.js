const WebSocket = require('ws');

const clients = new Map();

function createWebSocketServer(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/chat'  // Important for Railway routing
  });

  wss.on('connection', (ws, req) => {
    let username = null;

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);

        if (msg.type === 'auth') {
          username = msg.username;
          clients.set(username, ws);
          console.log(`✅ ${username} connected to chat`);
          
          ws.send(JSON.stringify({ 
            type: 'auth_success', 
            username 
          }));
        }

        if (msg.type === 'message' && username) {
          const recipientWs = clients.get(msg.to);
          
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify({
              type: 'message',
              from: username,
              to: msg.to,
              content: msg.content,
              timestamp: new Date().toISOString(),
              id: msg.id
            }));
            
            ws.send(JSON.stringify({
              type: 'message_sent',
              messageId: msg.id,
              status: 'delivered'
            }));
          } else {
            ws.send(JSON.stringify({
              type: 'message_sent',
              messageId: msg.id,
              status: 'offline'
            }));
          }
        }

      } catch (error) {
        console.error('WebSocket error:', error);
      }
    });

    ws.on('close', () => {
      if (username) {
        clients.delete(username);
        console.log(`❌ ${username} disconnected`);
      }
    });
  });

  console.log('🔌 WebSocket server ready at /chat');
  return wss;
}

module.exports = { createWebSocketServer };
