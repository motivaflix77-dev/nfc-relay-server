const express = require('express');
const http = require('http' );
const WebSocket = require('ws');

// A porta deve ser lida da variável de ambiente PORT, fornecida pelo Railway.app
const PORT = process.env.PORT || 3000;

// 1. Configurar o servidor HTTP (Express)
const app = express();

// Endpoint simples para verificar se o servidor está rodando
app.get('/', (req, res) => {
    res.send('NFC Relay WebSocket Server is running!');
});

// 2. Criar o servidor HTTP
const server = http.createServer(app );

// 3. Criar o servidor WebSocket e anexá-lo ao servidor HTTP
// O path '/ws' é usado para distinguir as conexões WebSocket das requisições HTTP normais
const wss = new WebSocket.Server({ server, path: '/ws' });

// Armazenamento para as conexões dos dois apps (App A - Reader e App B - Emulator)
let appA = null;
let appB = null;

wss.on('connection', (ws, req) => {
    // A URL de conexão deve ser formatada no Android App como:
    // wss://<URL_DO_RAILWAY>/ws?client=reader
    // wss://<URL_DO_RAILWAY>/ws?client=emulator
    const url = req.url;
    let clientType = 'Unknown';

    // Lógica de identificação e registro do cliente
    if (url.includes('client=reader')) {
        appA = ws;
        clientType = 'App A (Reader)';
        console.log('App A (Reader) connected.');
    } else if (url.includes('client=emulator')) {
        appB = ws;
        clientType = 'App B (Emulator)';
        console.log('App B (Emulator) connected.');
    } else {
        console.log('Unknown client connected. Closing connection.');
        ws.close();
        return;
    }

    // Lógica de recebimento de mensagens
    ws.on('message', (message) => {
        const data = message.toString();
        console.log(`Received from ${clientType}: ${data}`);

        // Lógica de Relay:
        // Se a mensagem veio do App A (Reader), envie para o App B (Emulator)
        if (ws === appA && appB && appB.readyState === WebSocket.OPEN) {
            console.log('Relaying data from App A to App B.');
            appB.send(data);
        }
        // Se a mensagem veio do App B (Emulator), envie para o App A (Reader)
        else if (ws === appB && appA && appA.readyState === WebSocket.OPEN) {
            console.log('Relaying data from App B to App A.');
            appA.send(data);
        }
    });

    // Lógica de fechamento de conexão
    ws.on('close', () => {
        console.log(`${clientType} disconnected.`);
        if (ws === appA) {
            appA = null;
        } else if (ws === appB) {
            appB = null;
        }
    });

    // Lógica de erro
    ws.on('error', (error) => {
        console.error(`WebSocket error on ${clientType}:`, error);
    });
});

// 4. Iniciar o servidor HTTP na porta definida
server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
    console.log('Ready for deployment on Railway.app!');
});
