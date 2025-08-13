import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BulkMessageModal } from "@/components/modals/bulk-message-modal";
import { QRCodeModal } from "@/components/modals/qr-code-modal";
import { ImportContactsModal } from "@/components/modals/import-contacts-modal";
import { AutoReplyModal } from "@/components/modals/auto-reply-modal";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  MessageSquare, 
  CheckCheck, 
  MessageCircle, 
  Users, 
  QrCode, 
  Upload, 
  Bot,
  Send,
  Eye,
  Copy,
  Edit,
  Trash,
  Pause,
  Plus
} from "lucide-react";

export default function Dashboard() {
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAutoReplyModalOpen, setIsAutoReplyModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const { lastMessage } = useWebSocket();

  const { data: analytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ["/api/analytics/dashboard"],
  });

  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ["/api/sessions"],
  });

  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: { sessionId: string; phone: string }) => {
      const response = await apiRequest('POST', '/api/sessions', sessionData);
      return response.json();
    },
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setSelectedSession(newSession);
      setIsQRModalOpen(true);
    },
  });

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'session_created':
        case 'session_updated':
        case 'session_deleted':
          refetchSessions();
          break;
        case 'campaign_created':
        case 'campaign_updated':
        case 'campaign_deleted':
          refetchAnalytics();
          break;
      }
    }
  }, [lastMessage, refetchSessions, refetchAnalytics]);

  const connectedSessions = sessions.filter((s: any) => s.status === 'connected');

  const statsCards = [
    {
      title: "Messages Sent",
      value: analytics?.messagesSent?.toLocaleString() || "0",
      change: "+12.5%",
      changeType: "positive",
      icon: MessageSquare,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      title: "Delivered",
      value: analytics?.messagesDelivered?.toLocaleString() || "0",
      change: `${analytics?.deliveryRate || 0}%`,
      changeLabel: "delivery rate",
      icon: CheckCheck,
      iconBg: "bg-whatsapp-100",
      iconColor: "text-whatsapp-600"
    },
    {
      title: "Responses",
      value: analytics?.messagesResponded?.toLocaleString() || "0",
      change: `${analytics?.responseRate || 0}%`,
      changeLabel: "response rate",
      icon: MessageCircle,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600"
    },
    {
      title: "Active Contacts",
      value: analytics?.activeContacts?.toLocaleString() || "0",
      change: "+156",
      changeLabel: "this week",
      icon: Users,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600"
    }
  ];

  const quickActions = [
    {
      title: "Bulk Message",
      description: "Send personalized messages to multiple contacts",
      icon: Send,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      buttonText: "Start Campaign",
      buttonBg: "bg-blue-50",
      buttonColor: "text-blue-700",
      buttonHover: "hover:bg-blue-100",
      onClick: () => setIsBulkModalOpen(true),
      testId: "card-bulk-message"
    },
    {
      title: "Connect Device",
      description: "Scan QR code to connect new WhatsApp session",
      icon: QrCode,
      iconBg: "bg-whatsapp-100",
      iconColor: "text-whatsapp-600",
      buttonText: "Scan QR Code",
      buttonBg: "bg-whatsapp-50",
      buttonColor: "text-whatsapp-700",
      buttonHover: "hover:bg-whatsapp-100",
      onClick: () => {
        // Create a new session for the QR modal
        const sessionId = `session-${Date.now()}`;
        createSessionMutation.mutate({
          sessionId,
          phone: ""
        });
      },
      testId: "card-qr-scan"
    },
    {
      title: "Import Contacts",
      description: "Upload CSV file to import contact lists",
      icon: Upload,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      buttonText: "Upload CSV",
      buttonBg: "bg-purple-50",
      buttonColor: "text-purple-700",
      buttonHover: "hover:bg-purple-100",
      onClick: () => setIsImportModalOpen(true),
      testId: "card-import-contacts"
    },
    {
      title: "Auto-Reply",
      description: "Set up automated responses with keywords",
      icon: Bot,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      buttonText: "Configure",
      buttonBg: "bg-orange-50",
      buttonColor: "text-orange-700",
      buttonHover: "hover:bg-orange-100",
      onClick: () => setIsAutoReplyModalOpen(true),
      testId: "card-auto-reply"
    }
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar connectedSessions={connectedSessions} />
      
      <div className="flex-1 overflow-hidden">
        <Header 
          title="Dashboard" 
          subtitle="Monitor your WhatsApp automation campaigns"
          onNewCampaign={() => setIsBulkModalOpen(true)}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="bg-white border border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className={`w-12 h-12 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                        <Icon className={`${stat.iconColor} text-xl w-6 h-6`} />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                        <p className="text-2xl font-bold text-gray-900" data-testid={`stat-${stat.title.toLowerCase().replace(' ', '-')}`}>
                          {stat.value}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                      <span className="text-whatsapp-500 font-medium">{stat.change}</span>
                      <span className="text-gray-600 ml-1">
                        {stat.changeLabel || "from last month"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="lg:col-span-2">
              <Card className="bg-white border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quickActions.map((action, index) => {
                      const Icon = action.icon;
                      return (
                        <div 
                          key={index}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                          data-testid={action.testId}
                        >
                          <div className="flex items-center mb-3">
                            <div className={`w-10 h-10 ${action.iconBg} rounded-lg flex items-center justify-center`}>
                              <Icon className={`${action.iconColor} w-5 h-5`} />
                            </div>
                            <h4 className="ml-3 font-semibold text-gray-900">{action.title}</h4>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{action.description}</p>
                          <Button
                            className={`w-full ${action.buttonBg} ${action.buttonColor} ${action.buttonHover} border-0`}
                            variant="outline"
                            onClick={action.onClick}
                            data-testid={`button-${action.title.toLowerCase().replace(' ', '-')}`}
                          >
                            {action.buttonText}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Active Sessions */}
            <div>
              <Card className="bg-white border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Active Sessions</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-whatsapp-600 hover:text-whatsapp-700"
                    data-testid="button-manage-sessions"
                  >
                    Manage All
                  </Button>
                </div>
                <CardContent className="p-6 space-y-4">
                  {sessions.length > 0 ? (
                    sessions.slice(0, 3).map((session: any) => (
                      <div 
                        key={session.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        data-testid={`session-${session.id}`}
                      >
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-whatsapp-500 rounded-full flex items-center justify-center">
                            <MessageCircle className="text-white w-5 h-5" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {session.phone || session.sessionId}
                            </p>
                            <p className={`text-xs ${
                              session.status === 'connected' ? 'text-whatsapp-600' : 'text-red-500'
                            }`}>
                              {session.status === 'connected' ? 'Connected' : 'Disconnected'}
                            </p>
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${
                          session.status === 'connected' ? 'bg-whatsapp-500' : 'bg-red-500'
                        }`}></div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-sm">No active sessions</p>
                      <Button
                        className="mt-3 bg-whatsapp-500 text-white hover:bg-whatsapp-600"
                        onClick={() => setIsQRModalOpen(true)}
                        data-testid="button-add-session"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Session
                      </Button>
                    </div>
                  )}
                  
                  {sessions.length > 0 && (
                    <Button
                      className="w-full bg-whatsapp-50 text-whatsapp-700 hover:bg-whatsapp-100 border-0"
                      variant="outline"
                      onClick={() => setIsQRModalOpen(true)}
                      data-testid="button-add-new-session"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add New Session
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Campaigns Table */}
          <div className="mt-8">
            <Card className="bg-white border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Campaigns</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-whatsapp-600 hover:text-whatsapp-700"
                  data-testid="button-view-all-campaigns"
                >
                  View All
                </Button>
              </div>
              <div className="overflow-x-auto">
                {analytics?.campaigns?.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Campaign
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Recipients
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Delivered
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analytics.campaigns.map((campaign: any) => (
                        <tr key={campaign.id} data-testid={`campaign-row-${campaign.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                              <div className="text-sm text-gray-500">
                                {new Date(campaign.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge
                              variant={
                                campaign.status === 'completed' ? 'default' :
                                campaign.status === 'sending' ? 'secondary' :
                                campaign.status === 'scheduled' ? 'outline' : 'secondary'
                              }
                              className={
                                campaign.status === 'completed' ? 'bg-whatsapp-100 text-whatsapp-800' :
                                campaign.status === 'sending' ? 'bg-yellow-100 text-yellow-800' :
                                campaign.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                              }
                            >
                              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {campaign.totalRecipients?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {campaign.messagesSent?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {campaign.messagesDelivered?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm" data-testid={`button-view-${campaign.id}`}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              {campaign.status === 'sending' ? (
                                <Button variant="ghost" size="sm" data-testid={`button-pause-${campaign.id}`}>
                                  <Pause className="w-4 h-4 text-red-600" />
                                </Button>
                              ) : (
                                <Button variant="ghost" size="sm" data-testid={`button-copy-${campaign.id}`}>
                                  <Copy className="w-4 h-4 text-blue-600" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No campaigns yet</p>
                    <Button
                      className="mt-3 bg-whatsapp-500 text-white hover:bg-whatsapp-600"
                      onClick={() => setIsBulkModalOpen(true)}
                      data-testid="button-create-first-campaign"
                    >
                      Create Your First Campaign
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>

      {/* Modals */}
      <BulkMessageModal 
        isOpen={isBulkModalOpen} 
        onClose={() => setIsBulkModalOpen(false)} 
      />
      <QRCodeModal 
        isOpen={isQRModalOpen} 
        onClose={() => {
          setIsQRModalOpen(false);
          setSelectedSession(null);
        }}
        session={selectedSession}
      />
      <ImportContactsModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
      />
      <AutoReplyModal 
        isOpen={isAutoReplyModalOpen} 
        onClose={() => setIsAutoReplyModalOpen(false)} 
      />
    </div>
  );
}
