import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeModal } from "@/components/modals/qr-code-modal";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  MessageCircle, 
  Power, 
  Trash, 
  QrCode,
  Phone,
  Clock,
  Activity,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff
} from "lucide-react";
import { format } from "date-fns";

interface WhatsappSession {
  id: string;
  sessionId: string;
  phone: string | null;
  status: string;
  qrCode: string | null;
  lastSeen: string | null;
  createdAt: string;
}

export default function Sessions() {
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<WhatsappSession | null>(null);
  const { toast } = useToast();
  const { lastMessage } = useWebSocket();

  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/sessions"],
  });

  const createSessionMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/sessions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Session created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create session", variant: "destructive" });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Session deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete session", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (lastMessage?.type?.includes('session')) {
      refetch();
    }
  }, [lastMessage, refetch]);

  const connectedSessions = sessions.filter((s: WhatsappSession) => s.status === 'connected');
  const disconnectedSessions = sessions.filter((s: WhatsappSession) => s.status === 'disconnected');
  const pendingSessions = sessions.filter((s: WhatsappSession) => s.status === 'qr_pending' || s.status === 'connecting');

  const handleCreateSession = () => {
    const sessionId = `session_${Date.now()}`;
    createSessionMutation.mutate({ sessionId, status: 'connecting' });
    setIsQRModalOpen(true);
  };

  const handleShowQR = (session: WhatsappSession) => {
    setSelectedSession(session);
    setIsQRModalOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-whatsapp-600" />;
      case 'connecting':
        return <Activity className="w-5 h-5 text-blue-600 animate-pulse" />;
      case 'qr_pending':
        return <QrCode className="w-5 h-5 text-orange-600" />;
      case 'disconnected':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <WifiOff className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-whatsapp-100 text-whatsapp-800';
      case 'connecting':
        return 'bg-blue-100 text-blue-800';
      case 'qr_pending':
        return 'bg-orange-100 text-orange-800';
      case 'disconnected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'qr_pending':
        return 'QR Pending';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar connectedSessions={connectedSessions} />
      
      <div className="flex-1 overflow-hidden">
        <Header 
          title="Sessions" 
          subtitle="Manage your WhatsApp connections and devices"
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-whatsapp-100 rounded-lg flex items-center justify-center">
                    <Wifi className="w-6 h-6 text-whatsapp-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Connected</p>
                    <p className="text-2xl font-bold text-gray-900" data-testid="stat-connected-sessions">
                      {connectedSessions.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-gray-900" data-testid="stat-pending-sessions">
                      {pendingSessions.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <WifiOff className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Disconnected</p>
                    <p className="text-2xl font-bold text-gray-900" data-testid="stat-disconnected-sessions">
                      {disconnectedSessions.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                    <p className="text-2xl font-bold text-gray-900" data-testid="stat-total-sessions">
                      {sessions.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Header Actions */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">WhatsApp Sessions</h2>
            <Button
              onClick={handleCreateSession}
              className="bg-whatsapp-500 text-white hover:bg-whatsapp-600"
              disabled={createSessionMutation.isPending}
              data-testid="button-new-session"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </div>

          {/* Sessions Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((session: WhatsappSession) => (
                <Card key={session.id} className="hover:shadow-md transition-shadow" data-testid={`session-card-${session.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-whatsapp-500 rounded-full flex items-center justify-center">
                          <MessageCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {session.phone || session.sessionId}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Session: {session.sessionId.substring(0, 12)}...
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(session.status)}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status</span>
                        <Badge className={getStatusColor(session.status)}>
                          {getStatusText(session.status)}
                        </Badge>
                      </div>

                      {session.phone && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Phone</span>
                          <div className="flex items-center text-sm text-gray-900">
                            <Phone className="w-4 h-4 mr-1" />
                            {session.phone}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Created</span>
                        <span className="text-sm text-gray-900">
                          {format(new Date(session.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>

                      {session.lastSeen && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Last Seen</span>
                          <div className="flex items-center text-sm text-gray-900">
                            <Clock className="w-4 h-4 mr-1" />
                            {format(new Date(session.lastSeen), 'MMM d, h:mm a')}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                      <div className="flex space-x-2">
                        {(session.status === 'qr_pending' || session.status === 'connecting') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShowQR(session)}
                            data-testid={`qr-${session.id}`}
                          >
                            <QrCode className="w-4 h-4 mr-1" />
                            QR Code
                          </Button>
                        )}
                        {session.status === 'disconnected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShowQR(session)}
                            data-testid={`reconnect-${session.id}`}
                          >
                            <Power className="w-4 h-4 mr-1" />
                            Reconnect
                          </Button>
                        )}
                      </div>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteSessionMutation.mutate(session.id)}
                        disabled={deleteSessionMutation.isPending}
                        data-testid={`delete-${session.id}`}
                      >
                        <Trash className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No WhatsApp sessions</h3>
                <p className="text-gray-500 mb-6">
                  Create your first WhatsApp session to start sending messages.
                </p>
                <Button
                  onClick={handleCreateSession}
                  className="bg-whatsapp-500 text-white hover:bg-whatsapp-600"
                  disabled={createSessionMutation.isPending}
                  data-testid="button-create-first-session"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Session
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Session Management Tips */}
          {sessions.length > 0 && (
            <Card className="mt-8">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Session Management Tips</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Keep your WhatsApp Web session active for continuous messaging</li>
                      <li>• Each session can handle up to 30 messages per minute to avoid blocking</li>
                      <li>• Scan QR codes with your phone's WhatsApp app {'>'} Settings {'>'} Linked Devices</li>
                      <li>• Sessions may disconnect due to phone battery, network issues, or WhatsApp updates</li>
                      <li>• Always reconnect quickly to maintain message delivery rates</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      <QRCodeModal 
        isOpen={isQRModalOpen} 
        onClose={() => {
          setIsQRModalOpen(false);
          setSelectedSession(null);
        }}
        session={selectedSession}
      />
    </div>
  );
}
