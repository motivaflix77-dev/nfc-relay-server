import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { Activity, Smartphone, CreditCard, Wifi, WifiOff, RefreshCw } from "lucide-react";

export default function Home() {
  const [sessionId, setSessionId] = useState("");
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  // Listar todas as sessões ativas
  const { data: sessions, refetch: refetchSessions } = trpc.relay.listSessions.useQuery(
    undefined,
    { refetchInterval: 2000 }
  );

  // Obter detalhes de uma sessão específica
  const { data: sessionDetails } = trpc.relay.getSession.useQuery(
    { sessionId: selectedSession || "" },
    { enabled: !!selectedSession, refetchInterval: 1000 }
  );

  // Obter logs de uma sessão
  const { data: sessionLogs } = trpc.relay.getSessionLogs.useQuery(
    { sessionId: selectedSession || "" },
    { enabled: !!selectedSession, refetchInterval: 2000 }
  );

  const handleViewSession = () => {
    if (sessionId.trim()) {
      setSelectedSession(sessionId.trim());
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">NFC Relay Server</h1>
            <p className="text-muted-foreground mt-2">
              Monitor de sessões de retransmissão NFC (EMV)
            </p>
          </div>
          <Button onClick={() => refetchSessions()} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Separator />

        {/* Buscar sessão específica */}
        <Card>
          <CardHeader>
            <CardTitle>Buscar Sessão</CardTitle>
            <CardDescription>
              Digite o ID da sessão para visualizar detalhes e logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="sessionId">Session ID</Label>
                <Input
                  id="sessionId"
                  placeholder="sala_teste_123"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleViewSession()}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleViewSession}>Visualizar</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessões ativas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Sessões Ativas
            </CardTitle>
            <CardDescription>
              {sessions?.length || 0} sessão(ões) em andamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessions && sessions.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sessions.map((session) => (
                  <Card
                    key={session?.sessionId}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setSelectedSession(session?.sessionId || null)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-mono">
                        {session?.sessionId}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          <span className="text-sm">Reader</span>
                        </div>
                        {session?.readerConnected ? (
                          <Badge variant="default" className="gap-1">
                            <Wifi className="h-3 w-3" />
                            Conectado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <WifiOff className="h-3 w-3" />
                            Desconectado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <span className="text-sm">Emulator</span>
                        </div>
                        {session?.emulatorConnected ? (
                          <Badge variant="default" className="gap-1">
                            <Wifi className="h-3 w-3" />
                            Conectado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <WifiOff className="h-3 w-3" />
                            Desconectado
                          </Badge>
                        )}
                      </div>
                      {session?.relayActive && (
                        <Badge className="w-full justify-center" variant="default">
                          Relay Ativo
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma sessão ativa no momento
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detalhes da sessão selecionada */}
        {selectedSession && sessionDetails && (
          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Sessão</CardTitle>
              <CardDescription className="font-mono">{selectedSession}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status do Reader</Label>
                  <div className="mt-1">
                    {sessionDetails.readerConnected ? (
                      <Badge variant="default">Conectado</Badge>
                    ) : (
                      <Badge variant="secondary">Desconectado</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Status do Emulator</Label>
                  <div className="mt-1">
                    {sessionDetails.emulatorConnected ? (
                      <Badge variant="default">Conectado</Badge>
                    ) : (
                      <Badge variant="secondary">Desconectado</Badge>
                    )}
                  </div>
                </div>
              </div>

              {sessionLogs && sessionLogs.length > 0 && (
                <div>
                  <Label>Logs de Comunicação ({sessionLogs.length})</Label>
                  <div className="mt-2 max-h-96 overflow-y-auto space-y-2">
                    {sessionLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-lg bg-muted font-mono text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant={log.direction === "request" ? "default" : "secondary"}>
                            {log.direction === "request" ? "→ Request" : "← Response"}
                          </Badge>
                          <Badge variant="outline">{log.clientType}</Badge>
                          <span className="text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="break-all text-foreground">{log.apduData}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
