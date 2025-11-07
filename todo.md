# Project TODO

## Servidor Relay (WebSocket)
- [x] Implementar gerenciamento de sessões (criar, entrar, sair)
- [x] Implementar lógica de retransmissão de APDUs entre Reader e HCE
- [x] Adicionar suporte para comandos especiais (REQUEST_PIN, PIN_PROCESSED, CARD_REMOVED, etc.)
- [x] Implementar monitoramento de conexão e reconexão automática
- [x] Adicionar logs e métricas de comunicação

## App A (Reader - Leitor NFC)
- [ ] Estrutura básica do projeto Android
- [ ] Implementar conexão WebSocket com o servidor Relay
- [ ] Implementar leitura NFC (IsoDep)
- [ ] Implementar envio de comandos APDU via WebSocket
- [ ] Implementar recebimento de respostas APDU via WebSocket
- [ ] Interface de usuário (tema dark, tela de conexão, tela de leitura NFC)

## App B (HCE - Emulação de Cartão)
- [ ] Estrutura básica do projeto Android
- [ ] Implementar conexão WebSocket com o servidor Relay
- [ ] Implementar serviço HCE (Host Card Emulation)
- [ ] Implementar recebimento de comandos APDU via WebSocket
- [ ] Implementar envio de respostas APDU via WebSocket
- [ ] Interface de usuário (tema dark, tela de conexão, tela de emulação)

## Documentação
- [ ] Criar README com instruções de instalação e uso
- [ ] Documentar o protocolo de comunicação WebSocket
- [ ] Criar diagramas de fluxo de comunicação
