import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Database, 
  Palette, 
  Clock,
  MessageSquare,
  Users,
  Save
} from "lucide-react";

export default function Settings() {
  const [settings, setSettings] = useState({
    // General Settings
    applicationName: "Waziper",
    timezone: "UTC",
    language: "en",
    
    // Messaging Settings
    defaultRateLimit: 30,
    enableSpintax: true,
    autoRetryFailed: true,
    messageDelay: 2,
    
    // Notifications
    emailNotifications: true,
    campaignAlerts: true,
    errorAlerts: true,
    
    // Security
    sessionTimeout: 24,
    enableApiAccess: false,
    ipWhitelist: "",
    
    // Advanced
    logLevel: "info",
    retentionDays: 30,
    enableAnalytics: true,
  });

  const { toast } = useToast();

  const { data: sessions = [] } = useQuery({
    queryKey: ["/api/sessions"],
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      // In a real app, this would save to backend
      return new Promise(resolve => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      toast({ title: "Settings saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  const connectedSessions = sessions.filter((s: any) => s.status === 'connected');

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar connectedSessions={connectedSessions} />
      
      <div className="flex-1 overflow-hidden">
        <Header 
          title="Settings" 
          subtitle="Configure your application preferences and security settings"
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* General Settings */}
            <Card>
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <SettingsIcon className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
                </div>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="appName">Application Name</Label>
                    <Input
                      id="appName"
                      value={settings.applicationName}
                      onChange={(e) => updateSetting('applicationName', e.target.value)}
                      data-testid="input-app-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      value={settings.timezone}
                      onChange={(e) => updateSetting('timezone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-500 focus:border-whatsapp-500"
                      data-testid="select-timezone"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Messaging Settings */}
            <Card>
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Messaging Settings</h3>
                </div>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rateLimit">Default Rate Limit (messages/minute)</Label>
                    <Input
                      id="rateLimit"
                      type="number"
                      min="1"
                      max="60"
                      value={settings.defaultRateLimit}
                      onChange={(e) => updateSetting('defaultRateLimit', parseInt(e.target.value))}
                      data-testid="input-rate-limit"
                    />
                    <p className="text-xs text-gray-500 mt-1">Recommended: 30 to avoid WhatsApp blocking</p>
                  </div>
                  <div>
                    <Label htmlFor="messageDelay">Message Delay (seconds)</Label>
                    <Input
                      id="messageDelay"
                      type="number"
                      min="0"
                      max="60"
                      value={settings.messageDelay}
                      onChange={(e) => updateSetting('messageDelay', parseInt(e.target.value))}
                      data-testid="input-message-delay"
                    />
                    <p className="text-xs text-gray-500 mt-1">Delay between individual messages</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Spintax</Label>
                      <p className="text-sm text-gray-500">Allow message variations using spintax syntax</p>
                    </div>
                    <Switch
                      checked={settings.enableSpintax}
                      onCheckedChange={(checked) => updateSetting('enableSpintax', checked)}
                      data-testid="switch-enable-spintax"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-retry Failed Messages</Label>
                      <p className="text-sm text-gray-500">Automatically retry failed message deliveries</p>
                    </div>
                    <Switch
                      checked={settings.autoRetryFailed}
                      onCheckedChange={(checked) => updateSetting('autoRetryFailed', checked)}
                      data-testid="switch-auto-retry"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                </div>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-gray-500">Receive email alerts for important events</p>
                    </div>
                    <Switch
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                      data-testid="switch-email-notifications"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Campaign Alerts</Label>
                      <p className="text-sm text-gray-500">Get notified when campaigns complete</p>
                    </div>
                    <Switch
                      checked={settings.campaignAlerts}
                      onCheckedChange={(checked) => updateSetting('campaignAlerts', checked)}
                      data-testid="switch-campaign-alerts"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Error Alerts</Label>
                      <p className="text-sm text-gray-500">Receive notifications for system errors</p>
                    </div>
                    <Switch
                      checked={settings.errorAlerts}
                      onCheckedChange={(checked) => updateSetting('errorAlerts', checked)}
                      data-testid="switch-error-alerts"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <Card>
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
                </div>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      min="1"
                      max="168"
                      value={settings.sessionTimeout}
                      onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                      data-testid="input-session-timeout"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable API Access</Label>
                      <p className="text-sm text-gray-500">Allow external API access to your account</p>
                    </div>
                    <Switch
                      checked={settings.enableApiAccess}
                      onCheckedChange={(checked) => updateSetting('enableApiAccess', checked)}
                      data-testid="switch-api-access"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="ipWhitelist">IP Whitelist</Label>
                    <Textarea
                      id="ipWhitelist"
                      placeholder="Enter IP addresses (one per line)&#10;192.168.1.1&#10;10.0.0.1"
                      value={settings.ipWhitelist}
                      onChange={(e) => updateSetting('ipWhitelist', e.target.value)}
                      className="min-h-[100px]"
                      data-testid="textarea-ip-whitelist"
                    />
                    <p className="text-xs text-gray-500 mt-1">One IP address per line</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Card>
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <Database className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Advanced Settings</h3>
                </div>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="logLevel">Log Level</Label>
                    <select
                      id="logLevel"
                      value={settings.logLevel}
                      onChange={(e) => updateSetting('logLevel', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-500 focus:border-whatsapp-500"
                      data-testid="select-log-level"
                    >
                      <option value="error">Error</option>
                      <option value="warn">Warning</option>
                      <option value="info">Info</option>
                      <option value="debug">Debug</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="retention">Data Retention (days)</Label>
                    <Input
                      id="retention"
                      type="number"
                      min="1"
                      max="365"
                      value={settings.retentionDays}
                      onChange={(e) => updateSetting('retentionDays', parseInt(e.target.value))}
                      data-testid="input-retention-days"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Analytics</Label>
                    <p className="text-sm text-gray-500">Collect usage analytics for performance insights</p>
                  </div>
                  <Switch
                    checked={settings.enableAnalytics}
                    onCheckedChange={(checked) => updateSetting('enableAnalytics', checked)}
                    data-testid="switch-enable-analytics"
                  />
                </div>
              </CardContent>
            </Card>

            {/* System Information */}
            <Card>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">System Information</h3>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-whatsapp-600 mb-1">
                      {connectedSessions.length}
                    </div>
                    <p className="text-sm text-gray-600">Active Sessions</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      v1.0.0
                    </div>
                    <p className="text-sm text-gray-600">Application Version</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      Online
                    </div>
                    <p className="text-sm text-gray-600">System Status</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saveSettingsMutation.isPending}
                className="bg-whatsapp-500 text-white hover:bg-whatsapp-600"
                data-testid="button-save-settings"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
