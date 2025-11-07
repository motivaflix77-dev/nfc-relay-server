import { WebSocket } from 'ws';
import { createRelaySession, updateRelaySession, getRelaySession, logCommunication } from './db';

interface ClientConnection {
  ws: WebSocket;
  clientType: 'reader' | 'emulator';
  deviceInfo?: any;
}

interface SessionData {
  sessionId: string;
  reader: ClientConnection | null;
  emulator: ClientConnection | null;
  requestQueue: Array<{ apdu: string; timestamp: number }>;
  responseQueue: Array<{ apdu: string; timestamp: number }>;
}

class RelayManager {
  private sessions: Map<string, SessionData> = new Map();
  private clientToSession: Map<WebSocket, string> = new Map();

  async handleConnection(ws: WebSocket, sessionId: string, clientType: 'reader' | 'emulator', deviceInfo?: any) {
    console.log(`[RelayManager] New ${clientType} connection for session: ${sessionId}`);

    // Criar ou obter sessão
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        reader: null,
        emulator: null,
        requestQueue: [],
        responseQueue: [],
      };
      this.sessions.set(sessionId, session);
      await createRelaySession(sessionId);
    }

    // Registrar cliente
    const client: ClientConnection = { ws, clientType, deviceInfo };
    if (clientType === 'reader') {
      if (session.reader) {
        // Desconectar reader anterior
        session.reader.ws.close(1000, 'New reader connected');
      }
      session.reader = client;
      await updateRelaySession(sessionId, { readerConnected: true });
    } else {
      if (session.emulator) {
        // Desconectar emulator anterior
        session.emulator.ws.close(1000, 'New emulator connected');
      }
      session.emulator = client;
      await updateRelaySession(sessionId, { emulatorConnected: true });
    }

    this.clientToSession.set(ws, sessionId);

    // Verificar se ambos estão conectados
    this.checkRelayStatus(sessionId);

    // Configurar handlers de mensagem
    ws.on('message', (data: any) => this.handleMessage(ws, data));
    ws.on('close', () => this.handleDisconnection(ws));
    ws.on('error', (error: any) => {
      console.error(`[RelayManager] WebSocket error for ${clientType}:`, error);
    });

    // Enviar status de conexão
    this.sendStatus(ws, clientType === 'reader' ? 'connected' : 'waiting_for_reader');
  }

  private async checkRelayStatus(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const bothConnected = session.reader && session.emulator;
    
    if (bothConnected) {
      await updateRelaySession(sessionId, { relayActive: true });
      
      // Notificar ambos os clientes
      if (session.reader) {
        this.sendStatus(session.reader.ws, 'relay_started');
      }
      if (session.emulator) {
        this.sendStatus(session.emulator.ws, 'relay_started');
      }

      console.log(`[RelayManager] Relay started for session: ${sessionId}`);
    } else if (session.reader && !session.emulator) {
      this.sendStatus(session.reader.ws, 'waiting_for_emulator');
    } else if (session.emulator && !session.reader) {
      this.sendStatus(session.emulator.ws, 'waiting_for_reader');
    }
  }

  private async handleMessage(ws: WebSocket, data: any) {
    const sessionId = this.clientToSession.get(ws);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      const message = JSON.parse(data.toString());
      
      // Determinar tipo de cliente
      const isReader = session.reader?.ws === ws;
      const clientType = isReader ? 'reader' : 'emulator';

      console.log(`[RelayManager] Message from ${clientType}:`, message);

      // Processar diferentes tipos de mensagens
      if (message.direction === 'request' && isReader) {
        // Reader enviando comando APDU para emulator
        await this.relayApduRequest(session, message.apdu);
      } else if (message.direction === 'response' && !isReader) {
        // Emulator enviando resposta APDU para reader
        await this.relayApduResponse(session, message.apdu);
      } else if (message.command) {
        // Comando especial
        await this.handleSpecialCommand(session, message.command, clientType);
      }
    } catch (error) {
      console.error('[RelayManager] Error handling message:', error);
    }
  }

  private async relayApduRequest(session: SessionData, apdu: string) {
    console.log(`[RelayManager] Relaying APDU request: ${apdu}`);

    // Logar comunicação
    await logCommunication({
      sessionId: session.sessionId,
      direction: 'request',
      apduData: apdu,
      clientType: 'reader',
    });

    // Enviar para emulator
    if (session.emulator) {
      const message = {
        direction: 'request',
        apdu,
        timestamp: Date.now(),
      };
      session.emulator.ws.send(JSON.stringify(message));
    } else {
      console.warn('[RelayManager] No emulator connected to receive APDU request');
    }
  }

  private async relayApduResponse(session: SessionData, apdu: string) {
    console.log(`[RelayManager] Relaying APDU response: ${apdu}`);

    // Logar comunicação
    await logCommunication({
      sessionId: session.sessionId,
      direction: 'response',
      apduData: apdu,
      clientType: 'emulator',
    });

    // Enviar para reader
    if (session.reader) {
      const message = {
        direction: 'response',
        apdu,
        timestamp: Date.now(),
      };
      session.reader.ws.send(JSON.stringify(message));
    } else {
      console.warn('[RelayManager] No reader connected to receive APDU response');
    }
  }

  private async handleSpecialCommand(session: SessionData, command: string, clientType: 'reader' | 'emulator') {
    console.log(`[RelayManager] Special command from ${clientType}: ${command}`);

    // Retransmitir comando especial para o outro cliente
    const targetClient = clientType === 'reader' ? session.emulator : session.reader;
    
    if (targetClient) {
      const message = {
        command,
        timestamp: Date.now(),
      };
      targetClient.ws.send(JSON.stringify(message));
    }

    // Processar comandos específicos
    switch (command) {
      case 'REQUEST_PIN':
        console.log('[RelayManager] PIN requested');
        break;
      case 'PIN_PROCESSED':
        console.log('[RelayManager] PIN processed');
        break;
      case 'CARD_REMOVED':
        console.log('[RelayManager] Card removed');
        break;
      case 'NEW_TRANSACTION':
        console.log('[RelayManager] New transaction requested');
        session.requestQueue = [];
        session.responseQueue = [];
        break;
      case 'FORCE_RESET':
        console.log('[RelayManager] Force reset requested');
        session.requestQueue = [];
        session.responseQueue = [];
        break;
    }
  }

  private sendStatus(ws: WebSocket, status: string) {
    const message = {
      type: 'status',
      status,
      timestamp: Date.now(),
    };
    ws.send(JSON.stringify(message));
  }

  private async handleDisconnection(ws: WebSocket) {
    const sessionId = this.clientToSession.get(ws);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Determinar qual cliente desconectou
    if (session.reader?.ws === ws) {
      console.log(`[RelayManager] Reader disconnected from session: ${sessionId}`);
      session.reader = null;
      await updateRelaySession(sessionId, { readerConnected: false, relayActive: false });
      
      // Notificar emulator
      if (session.emulator) {
        this.sendStatus(session.emulator.ws, 'reader_disconnected');
      }
    } else if (session.emulator?.ws === ws) {
      console.log(`[RelayManager] Emulator disconnected from session: ${sessionId}`);
      session.emulator = null;
      await updateRelaySession(sessionId, { emulatorConnected: false, relayActive: false });
      
      // Notificar reader
      if (session.reader) {
        this.sendStatus(session.reader.ws, 'emulator_disconnected');
      }
    }

    this.clientToSession.delete(ws);

    // Limpar sessão se ambos desconectaram
    if (!session.reader && !session.emulator) {
      console.log(`[RelayManager] Session ${sessionId} is now empty, cleaning up`);
      this.sessions.delete(sessionId);
    }
  }

  getSessionInfo(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      sessionId: session.sessionId,
      readerConnected: !!session.reader,
      emulatorConnected: !!session.emulator,
      relayActive: !!session.reader && !!session.emulator,
      queueSizes: {
        requests: session.requestQueue.length,
        responses: session.responseQueue.length,
      },
    };
  }

  getAllSessions() {
    return Array.from(this.sessions.keys()).map(sessionId => this.getSessionInfo(sessionId));
  }
}

export const relayManager = new RelayManager();
