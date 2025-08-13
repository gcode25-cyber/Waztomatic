import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/use-websocket";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  CheckCheck, 
  MessageCircle,
  Download,
  Calendar,
  Filter
} from "lucide-react";
import { format, subDays } from "date-fns";

export default function Analytics() {
  const [dateRange, setDateRange] = useState("7days");
  const { lastMessage } = useWebSocket();

  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ["/api/analytics/dashboard", dateRange],
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["/api/sessions"],
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  useEffect(() => {
    if (lastMessage?.type?.includes('campaign') || lastMessage?.type?.includes('message')) {
      refetch();
    }
  }, [lastMessage, refetch]);

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
      changeLabel: "this period",
      icon: Users,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600"
    }
  ];

  const getDateRangeText = (range: string) => {
    switch (range) {
      case "today":
        return "Today";
      case "7days":
        return "Last 7 days";
      case "30days":
        return "Last 30 days";
      case "90days":
        return "Last 90 days";
      default:
        return "Last 7 days";
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar connectedSessions={connectedSessions} />
      
      <div className="flex-1 overflow-hidden">
        <Header 
          title="Analytics" 
          subtitle="Track your messaging performance and campaign effectiveness"
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Date Range Selector */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-500 focus:border-whatsapp-500"
                  data-testid="select-date-range"
                >
                  <option value="today">Today</option>
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="90days">Last 90 days</option>
                </select>
              </div>
              <span className="text-sm text-gray-600">
                Showing data for {getDateRangeText(dateRange).toLowerCase()}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" data-testid="button-export-analytics">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" data-testid="button-filter-analytics">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

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
                      <TrendingUp className="w-4 h-4 text-whatsapp-500 mr-1" />
                      <span className="text-whatsapp-500 font-medium">{stat.change}</span>
                      <span className="text-gray-600 ml-1">
                        {stat.changeLabel || "vs previous period"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Campaign Performance */}
            <Card>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Campaign Performance</h3>
              </div>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-gray-200 rounded"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : campaigns.length > 0 ? (
                  <div className="space-y-4">
                    {campaigns.slice(0, 5).map((campaign: any) => {
                      const deliveryRate = campaign.totalRecipients > 0 
                        ? Math.round((campaign.messagesDelivered / campaign.totalRecipients) * 100)
                        : 0;
                      
                      return (
                        <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`campaign-analytics-${campaign.id}`}>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                              <span>{campaign.messagesSent || 0} sent</span>
                              <span>{campaign.messagesDelivered || 0} delivered</span>
                              <span className="text-whatsapp-600 font-medium">{deliveryRate}% rate</span>
                            </div>
                          </div>
                          <div className="w-16 h-16 relative">
                            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                              <path
                                className="text-gray-200"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="none"
                                d="M18 2.0845
                                  a 15.9155 15.9155 0 0 1 0 31.831
                                  a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                              <path
                                className="text-whatsapp-500"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeDasharray={`${deliveryRate}, 100`}
                                strokeLinecap="round"
                                fill="none"
                                d="M18 2.0845
                                  a 15.9155 15.9155 0 0 1 0 31.831
                                  a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-700">{deliveryRate}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No campaign data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Session Status */}
            <Card>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Session Status</h3>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {sessions.length > 0 ? (
                    sessions.map((session: any) => (
                      <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`session-status-${session.id}`}>
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            session.status === 'connected' ? 'bg-whatsapp-500' : 
                            session.status === 'connecting' ? 'bg-blue-500' :
                            session.status === 'qr_pending' ? 'bg-orange-500' : 'bg-red-500'
                          }`}></div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {session.phone || session.sessionId}
                            </p>
                            <p className="text-sm text-gray-500">
                              {session.status === 'connected' ? 'Online' : 
                               session.status === 'connecting' ? 'Connecting...' :
                               session.status === 'qr_pending' ? 'Waiting for QR scan' : 'Offline'}
                            </p>
                          </div>
                        </div>
                        {session.lastSeen && (
                          <span className="text-xs text-gray-500">
                            {format(new Date(session.lastSeen), 'MMM d, h:mm a')}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No sessions available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Message Timeline */}
          <Card className="mt-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Message Timeline</h3>
            </div>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Sample timeline data - in real app this would come from analytics API */}
                <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-whatsapp-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-whatsapp-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Campaign "Black Friday Sale" started</p>
                    <p className="text-sm text-gray-500">2,450 messages queued for delivery</p>
                  </div>
                  <span className="text-sm text-gray-500">2 hours ago</span>
                </div>
                
                <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CheckCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">High delivery rate achieved</p>
                    <p className="text-sm text-gray-500">98.2% of messages delivered successfully</p>
                  </div>
                  <span className="text-sm text-gray-500">3 hours ago</span>
                </div>
                
                <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">New contacts imported</p>
                    <p className="text-sm text-gray-500">156 contacts added from CSV import</p>
                  </div>
                  <span className="text-sm text-gray-500">1 day ago</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics Summary */}
          <Card className="mt-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Key Metrics Summary</h3>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-whatsapp-600 mb-2">
                    {analytics?.deliveryRate || '0'}%
                  </div>
                  <p className="text-sm text-gray-600">Average Delivery Rate</p>
                  <p className="text-xs text-gray-500 mt-1">Industry average: 95%</p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {analytics?.responseRate || '0'}%
                  </div>
                  <p className="text-sm text-gray-600">Response Rate</p>
                  <p className="text-xs text-gray-500 mt-1">Industry average: 8%</p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {campaigns.filter((c: any) => c.status === 'completed').length}
                  </div>
                  <p className="text-sm text-gray-600">Completed Campaigns</p>
                  <p className="text-xs text-gray-500 mt-1">This period</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
