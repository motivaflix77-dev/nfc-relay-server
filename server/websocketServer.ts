import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { relayManager } from './relayManager';
import url from 'url';

export function setupWebSocketServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  // Upgrade HTTP connection to WebSocket
  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url || '').pathname;

    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket, request) => {
    console.log('[WebSocket] New connection');

    // Aguardar mensagem de join
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.action === 'join') {
          const { session_id, client_type, device_info } = message;

          if (!session_id || !client_type) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Missing session_id or client_type',
            }));
            ws.close(1008, 'Invalid join message');
            return;
          }

          if (client_type !== 'reader' && client_type !== 'emulator') {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Invalid client_type. Must be "reader" or "emulator"',
            }));
            ws.close(1008, 'Invalid client_type');
            return;
          }

          // Registrar conexão no relay manager
          relayManager.handleConnection(ws, session_id, client_type, device_info);
        }
      } catch (error) {
        console.error('[WebSocket] Error parsing join message:', error);
        ws.close(1008, 'Invalid message format');
      }
    });

    // Timeout se não receber join em 10 segundos
    const joinTimeout = setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Join timeout - no join message received',
        }));
        ws.close(1008, 'Join timeout');
      }
    }, 10000);

    ws.on('close', () => {
      clearTimeout(joinTimeout);
    });
  });

  console.log('[WebSocket] Server initialized on /ws endpoint');
}
