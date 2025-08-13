import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AutoReplyModal } from "@/components/modals/auto-reply-modal";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Bot, 
  Edit, 
  Trash, 
  Power, 
  Clock,
  MessageCircle,
  Settings,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

interface AutoReplyRule {
  id: string;
  name: string;
  keywords: string[];
  triggerType: string;
  response: string;
  delay: number;
  isActive: boolean;
  businessHoursOnly: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  sessionId: string;
  createdAt: string;
}

export default function AutoReply() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null);
  const { toast } = useToast();
  const { lastMessage } = useWebSocket();

  const { data: rules = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/auto-reply-rules"],
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["/api/sessions"],
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/auto-reply-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-reply-rules"] });
      toast({ title: "Auto-reply rule deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete auto-reply rule", variant: "destructive" });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      apiRequest("PUT", `/api/auto-reply-rules/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-reply-rules"] });
      toast({ title: "Auto-reply rule updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update auto-reply rule", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (lastMessage?.type?.includes('auto_reply_rule')) {
      refetch();
    }
  }, [lastMessage, refetch]);

  const connectedSessions = sessions.filter((s: any) => s.status === 'connected');

  const handleEdit = (rule: AutoReplyRule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleNewRule = () => {
    setEditingRule(null);
    setIsModalOpen(true);
  };

  const getTriggerTypeDisplay = (type: string) => {
    switch (type) {
      case 'contains': return 'Contains keywords';
      case 'exact': return 'Exact match';
      case 'starts_with': return 'Starts with';
      case 'ends_with': return 'Ends with';
      case 'any': return 'Any message';
      case 'first_message': return 'First message';
      default: return type;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar connectedSessions={connectedSessions} />
      
      <div className="flex-1 overflow-hidden">
        <Header 
          title="Auto-Reply" 
          subtitle="Configure automated responses for incoming messages"
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Bot className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Rules</p>
                    <p className="text-2xl font-bold text-gray-900" data-testid="stat-total-rules">
                      {rules.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-whatsapp-100 rounded-lg flex items-center justify-center">
                    <Power className="w-6 h-6 text-whatsapp-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Rules</p>
                    <p className="text-2xl font-bold text-gray-900" data-testid="stat-active-rules">
                      {rules.filter((rule: AutoReplyRule) => rule.isActive).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Sessions</p>
                    <p className="text-2xl font-bold text-gray-900" data-testid="stat-connected-sessions">
                      {connectedSessions.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Header Actions */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Auto-Reply Rules</h2>
            <Button
              onClick={handleNewRule}
              className="bg-whatsapp-500 text-white hover:bg-whatsapp-600"
              data-testid="button-add-rule"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </div>

          {/* Rules List */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-6 w-16 bg-gray-200 rounded"></div>
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : rules.length > 0 ? (
            <div className="space-y-4">
              {rules.map((rule: AutoReplyRule) => (
                <Card key={rule.id} className="border border-gray-200" data-testid={`rule-card-${rule.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                          <Badge
                            variant={rule.isActive ? "default" : "secondary"}
                            className={rule.isActive ? "bg-whatsapp-100 text-whatsapp-800" : ""}
                          >
                            {rule.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <span className="text-gray-500">Trigger:</span>
                            <span className="ml-2 text-gray-900">
                              {getTriggerTypeDisplay(rule.triggerType)}
                            </span>
                          </div>
                          {rule.keywords.length > 0 && (
                            <div>
                              <span className="text-gray-500">Keywords:</span>
                              <span className="ml-2 text-gray-900">
                                {rule.keywords.join(", ")}
                              </span>
                            </div>
                          )}
                          {rule.delay > 0 && (
                            <div>
                              <span className="text-gray-500">Delay:</span>
                              <span className="ml-2 text-gray-900">
                                {rule.delay} seconds
                              </span>
                            </div>
                          )}
                          {rule.businessHoursOnly && (
                            <div>
                              <span className="text-gray-500">Business Hours:</span>
                              <span className="ml-2 text-gray-900">
                                {rule.businessHoursStart} - {rule.businessHoursEnd}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <span className="text-gray-500 text-sm">Response:</span>
                          <p className="mt-1 text-gray-900 text-sm bg-gray-50 p-3 rounded-lg">
                            {rule.response}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={(checked) => 
                            toggleRuleMutation.mutate({ id: rule.id, isActive: checked })
                          }
                          data-testid={`toggle-${rule.id}`}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`menu-${rule.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleEdit(rule)}
                              data-testid={`edit-${rule.id}`}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => deleteRuleMutation.mutate(rule.id)}
                              data-testid={`delete-${rule.id}`}
                            >
                              <Trash className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No auto-reply rules</h3>
                <p className="text-gray-500 mb-6">
                  Create your first auto-reply rule to start responding to messages automatically.
                </p>
                <Button
                  onClick={handleNewRule}
                  className="bg-whatsapp-500 text-white hover:bg-whatsapp-600"
                  data-testid="button-create-first-rule"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Auto-Reply Rule
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Help Section */}
          {rules.length > 0 && (
            <Card className="mt-8">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Settings className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">How Auto-Reply Works</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Rules are checked in the order they appear</li>
                      <li>• Only the first matching rule will trigger</li>
                      <li>• Business hours rules only trigger during specified times</li>
                      <li>• Delays are applied before sending the response</li>
                      <li>• Keywords are case-insensitive</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      <AutoReplyModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingRule(null);
        }}
        editingRule={editingRule}
      />
    </div>
  );
}
