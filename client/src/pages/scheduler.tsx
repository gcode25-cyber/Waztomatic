import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BulkMessageModal } from "@/components/modals/bulk-message-modal";
import { useWebSocket } from "@/hooks/use-websocket";
import { 
  Calendar, 
  Clock, 
  Plus, 
  Play, 
  Pause, 
  Edit, 
  Trash,
  MessageSquare,
  Users,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { format, isAfter, isBefore, addDays } from "date-fns";

interface Campaign {
  id: string;
  name: string;
  message: string;
  scheduledAt: string | null;
  status: string;
  totalRecipients: number;
  messagesSent: number;
  createdAt: string;
}

export default function Scheduler() {
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { lastMessage } = useWebSocket();

  const { data: campaigns = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["/api/sessions"],
  });

  const { data: messageQueue = [] } = useQuery({
    queryKey: ["/api/analytics/message-queue"],
  });

  useEffect(() => {
    if (lastMessage?.type?.includes('campaign')) {
      refetch();
    }
  }, [lastMessage, refetch]);

  const connectedSessions = sessions.filter((s: any) => s.status === 'connected');

  // Filter scheduled campaigns
  const scheduledCampaigns = campaigns.filter((campaign: Campaign) => 
    campaign.scheduledAt && campaign.status === 'scheduled'
  );

  // Filter campaigns by selected date
  const campaignsForDate = scheduledCampaigns.filter((campaign: Campaign) => {
    if (!campaign.scheduledAt) return false;
    const campaignDate = new Date(campaign.scheduledAt);
    return format(campaignDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
  });

  // Get upcoming campaigns (next 7 days)
  const upcomingCampaigns = scheduledCampaigns.filter((campaign: Campaign) => {
    if (!campaign.scheduledAt) return false;
    const campaignDate = new Date(campaign.scheduledAt);
    const now = new Date();
    const weekFromNow = addDays(now, 7);
    return isAfter(campaignDate, now) && isBefore(campaignDate, weekFromNow);
  }).sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());

  // Get pending messages count
  const pendingMessages = messageQueue.filter((msg: any) => msg.status === 'pending').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'sending':
        return <Play className="w-4 h-4 text-whatsapp-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-orange-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'sending':
        return 'bg-whatsapp-100 text-whatsapp-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-orange-100 text-orange-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar connectedSessions={connectedSessions} />
      
      <div className="flex-1 overflow-hidden">
        <Header 
          title="Scheduler" 
          subtitle="Manage and schedule your message campaigns"
          onNewCampaign={() => setIsBulkModalOpen(true)}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Scheduled</p>
                    <p className="text-2xl font-bold text-gray-900" data-testid="stat-scheduled-campaigns">
                      {scheduledCampaigns.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-whatsapp-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-whatsapp-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">This Week</p>
                    <p className="text-2xl font-bold text-gray-900" data-testid="stat-upcoming-campaigns">
                      {upcomingCampaigns.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending Messages</p>
                    <p className="text-2xl font-bold text-gray-900" data-testid="stat-pending-messages">
                      {pendingMessages}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                    <p className="text-2xl font-bold text-gray-900" data-testid="stat-active-sessions">
                      {connectedSessions.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar View */}
            <div className="lg:col-span-2">
              <Card>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Campaign Calendar</h3>
                </div>
                <CardContent className="p-6">
                  {/* Simple date picker */}
                  <div className="mb-6">
                    <input
                      type="date"
                      value={format(selectedDate, 'yyyy-MM-dd')}
                      onChange={(e) => setSelectedDate(new Date(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-500 focus:border-whatsapp-500"
                      data-testid="input-date-picker"
                    />
                  </div>

                  {/* Campaigns for selected date */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">
                      Campaigns for {format(selectedDate, 'MMMM d, yyyy')}
                    </h4>
                    
                    {campaignsForDate.length > 0 ? (
                      <div className="space-y-3">
                        {campaignsForDate.map((campaign: Campaign) => (
                          <div 
                            key={campaign.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            data-testid={`scheduled-campaign-${campaign.id}`}
                          >
                            <div className="flex items-center space-x-3">
                              {getStatusIcon(campaign.status)}
                              <div>
                                <p className="font-medium text-gray-900">{campaign.name}</p>
                                <p className="text-sm text-gray-500">
                                  {format(new Date(campaign.scheduledAt!), 'h:mm a')} • {campaign.totalRecipients} recipients
                                </p>
                              </div>
                            </div>
                            <Badge className={getStatusColor(campaign.status)}>
                              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No campaigns scheduled for this date</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Campaigns */}
            <div>
              <Card>
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Upcoming Campaigns</h3>
                  <Button
                    size="sm"
                    onClick={() => setIsBulkModalOpen(true)}
                    className="bg-whatsapp-500 text-white hover:bg-whatsapp-600"
                    data-testid="button-schedule-campaign"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Schedule
                  </Button>
                </div>
                <CardContent className="p-6">
                  {upcomingCampaigns.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingCampaigns.map((campaign: Campaign) => (
                        <div 
                          key={campaign.id}
                          className="border border-gray-200 rounded-lg p-4"
                          data-testid={`upcoming-campaign-${campaign.id}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                            <Badge className={getStatusColor(campaign.status)}>
                              {campaign.status}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2" />
                              {format(new Date(campaign.scheduledAt!), 'MMM d, yyyy')}
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2" />
                              {format(new Date(campaign.scheduledAt!), 'h:mm a')}
                            </div>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-2" />
                              {campaign.totalRecipients} recipients
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-700 mt-3 line-clamp-2">
                            {campaign.message}
                          </p>
                          
                          <div className="flex items-center justify-end space-x-2 mt-3">
                            <Button variant="ghost" size="sm" data-testid={`edit-campaign-${campaign.id}`}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" data-testid={`delete-campaign-${campaign.id}`}>
                              <Trash className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm mb-4">No upcoming campaigns</p>
                      <Button
                        size="sm"
                        onClick={() => setIsBulkModalOpen(true)}
                        className="bg-whatsapp-500 text-white hover:bg-whatsapp-600"
                        data-testid="button-create-scheduled-campaign"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Schedule Campaign
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* All Scheduled Campaigns */}
          <Card className="mt-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">All Scheduled Campaigns</h3>
            </div>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6">
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : scheduledCampaigns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Campaign
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Scheduled Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Recipients
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {scheduledCampaigns.map((campaign: Campaign) => (
                        <tr key={campaign.id} data-testid={`campaign-row-${campaign.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                              <div className="text-sm text-gray-500 line-clamp-1">{campaign.message}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {campaign.scheduledAt && format(new Date(campaign.scheduledAt), 'MMM d, yyyy')}
                            </div>
                            <div className="text-sm text-gray-500">
                              {campaign.scheduledAt && format(new Date(campaign.scheduledAt), 'h:mm a')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {campaign.totalRecipients.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(campaign.status)}
                              <Badge className={getStatusColor(campaign.status)}>
                                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm" data-testid={`edit-${campaign.id}`}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`delete-${campaign.id}`}>
                                <Trash className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled campaigns</h3>
                  <p className="text-gray-500 mb-6">
                    Schedule your first campaign to automate your messaging.
                  </p>
                  <Button
                    onClick={() => setIsBulkModalOpen(true)}
                    className="bg-whatsapp-500 text-white hover:bg-whatsapp-600"
                    data-testid="button-schedule-first-campaign"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Campaign
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      <BulkMessageModal 
        isOpen={isBulkModalOpen} 
        onClose={() => setIsBulkModalOpen(false)} 
      />
    </div>
  );
}
