import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { X, Upload, Calendar, Clock, Info, AlertTriangle } from "lucide-react";

const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  message: z.string().min(1, "Message content is required"),
  contactGroups: z.array(z.string()).optional(),
  scheduledAt: z.string().optional(),
  rateLimit: z.number().min(1).max(60).default(30),
  sessionId: z.string().min(1, "Please select a WhatsApp session"),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

interface BulkMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkMessageModal({ isOpen, onClose }: BulkMessageModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [spintaxInfo, setSpintaxInfo] = useState({ isValid: true, variations: 1, errors: [] });
  const { toast } = useToast();

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      message: "",
      contactGroups: [],
      rateLimit: 30,
      sessionId: "",
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["/api/contacts"],
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["/api/sessions"],
  });

  const spintaxMutation = useMutation({
    mutationFn: (text: string) => apiRequest("POST", "/api/spintax/validate", { text }),
    onSuccess: (data) => {
      setSpintaxInfo(data);
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const formData = new FormData();
      formData.append('data', JSON.stringify(data));
      if (selectedFile) {
        formData.append('media', selectedFile);
      }
      
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to create campaign');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      toast({ title: "Campaign created successfully" });
      onClose();
      form.reset();
      setSelectedFile(null);
      setIsScheduled(false);
    },
    onError: () => {
      toast({ title: "Failed to create campaign", variant: "destructive" });
    },
  });

  // Get unique groups from contacts
  const contactGroups = Array.from(
    new Set(contacts.flatMap((contact: any) => contact.groups || []))
  );

  const connectedSessions = sessions.filter((s: any) => s.status === 'connected');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 16 * 1024 * 1024; // 16MB
      if (file.size > maxSize) {
        toast({ title: "File too large. Maximum size is 16MB.", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
    }
  };

  const insertVariable = (variable: string) => {
    const currentMessage = form.getValues('message');
    const textarea = document.querySelector('textarea[name="message"]') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = currentMessage.substring(0, start) + `{${variable}}` + currentMessage.substring(end);
      form.setValue('message', newMessage);
      
      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 2, start + variable.length + 2);
      }, 0);
    }
  };

  const onSubmit = (data: CampaignFormData) => {
    if (isScheduled && data.scheduledAt) {
      const scheduledDate = new Date(data.scheduledAt);
      if (scheduledDate <= new Date()) {
        toast({ title: "Scheduled time must be in the future", variant: "destructive" });
        return;
      }
      data.scheduledAt = scheduledDate.toISOString();
    } else {
      data.scheduledAt = undefined;
    }

    createCampaignMutation.mutate(data);
  };

  // Validate spintax when message changes
  const messageValue = form.watch('message');
  useEffect(() => {
    if (messageValue && messageValue.includes('{') && messageValue.includes('|')) {
      const timeoutId = setTimeout(() => {
        spintaxMutation.mutate(messageValue);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setSpintaxInfo({ isValid: true, variations: 1, errors: [] });
    }
  }, [messageValue]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Create Bulk Message Campaign
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-bulk-modal">
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter campaign name..." {...field} data-testid="input-campaign-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sessionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Session</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-session">
                        <SelectValue placeholder="Select a connected session" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {connectedSessions.map((session: any) => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.phone || session.sessionId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactGroups"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Contacts</FormLabel>
                  <div className="space-y-2">
                    <Select 
                      onValueChange={(value) => {
                        const newGroups = [...(field.value || [])];
                        if (value === "all") {
                          field.onChange([]);
                        } else if (!newGroups.includes(value)) {
                          newGroups.push(value);
                          field.onChange(newGroups);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-contact-groups">
                          <SelectValue placeholder="Select contact groups" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Contacts ({contacts.length})</SelectItem>
                        {contactGroups.map((group) => {
                          const groupCount = contacts.filter((c: any) => c.groups?.includes(group)).length;
                          return (
                            <SelectItem key={group} value={group}>
                              {group} ({groupCount})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    
                    {field.value && field.value.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {field.value.map((group) => (
                          <Badge key={group} variant="secondary" className="flex items-center gap-1">
                            {group}
                            <button
                              type="button"
                              onClick={() => {
                                const newGroups = field.value?.filter(g => g !== group) || [];
                                field.onChange(newGroups);
                              }}
                              className="ml-1 hover:bg-gray-200 rounded"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-sm text-gray-500">
                      Selected: {
                        !field.value || field.value.length === 0 
                          ? contacts.length 
                          : contacts.filter((c: any) => 
                              field.value?.some(group => c.groups?.includes(group))
                            ).length
                      } contacts
                    </p>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Hello {name}, we have exciting news for you..."
                      rows={4}
                      {...field}
                      data-testid="textarea-message-content"
                    />
                  </FormControl>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => insertVariable('name')}
                      data-testid="button-insert-name"
                    >
                      {"{name}"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => insertVariable('phone')}
                      data-testid="button-insert-phone"
                    >
                      {"{phone}"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => insertVariable('email')}
                      data-testid="button-insert-email"
                    >
                      {"{email}"}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Spintax Support */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Spintax Support</h4>
                  <p className="text-xs text-blue-700 mb-2">
                    Use {"{option1|option2|option3}"} for message variations
                  </p>
                  <p className="text-xs text-blue-600">
                    Example: "Hello {"{name}"}, {"{hope you're doing well|how are you today|hope you're having a great day}"}!"
                  </p>
                  {messageValue && spintaxInfo.variations > 1 && (
                    <p className="text-xs text-whatsapp-600 mt-2 font-medium">
                      ✓ {spintaxInfo.variations} message variations detected
                    </p>
                  )}
                  {!spintaxInfo.isValid && (
                    <div className="mt-2">
                      <p className="text-xs text-red-600 font-medium">Spintax errors:</p>
                      {spintaxInfo.errors.map((error, index) => (
                        <p key={index} className="text-xs text-red-600">• {error}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Media Attachment */}
            <div>
              <FormLabel>Media Attachment (Optional)</FormLabel>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  id="media-upload"
                  data-testid="input-media-upload"
                />
                <label htmlFor="media-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {selectedFile ? selectedFile.name : "Drag and drop files or browse"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Supports: Images, Videos, Documents (Max 16MB)
                  </p>
                </label>
                {selectedFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    className="mt-2"
                    data-testid="button-remove-media"
                  >
                    Remove file
                  </Button>
                )}
              </div>
            </div>

            {/* Scheduling */}
            <div>
              <FormLabel>Schedule</FormLabel>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="schedule"
                      checked={!isScheduled}
                      onChange={() => setIsScheduled(false)}
                      className="text-whatsapp-500"
                      data-testid="radio-send-now"
                    />
                    <span className="ml-2 text-sm text-gray-700">Send Now</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="schedule"
                      checked={isScheduled}
                      onChange={() => setIsScheduled(true)}
                      className="text-whatsapp-500"
                      data-testid="radio-schedule-later"
                    />
                    <span className="ml-2 text-sm text-gray-700">Schedule for Later</span>
                  </label>
                </div>
                
                {isScheduled && (
                  <FormField
                    control={form.control}
                    name="scheduledAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <Input
                                type="date"
                                {...field}
                                min={new Date().toISOString().split('T')[0]}
                                className="pl-10"
                                data-testid="input-schedule-date"
                              />
                            </div>
                            <div className="relative">
                              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <Input
                                type="time"
                                onChange={(e) => {
                                  const date = field.value?.split('T')[0] || new Date().toISOString().split('T')[0];
                                  const time = e.target.value;
                                  field.onChange(`${date}T${time}`);
                                }}
                                className="pl-10"
                                data-testid="input-schedule-time"
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Rate Limiting */}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-yellow-900 mb-2">Rate Limiting</h4>
                  <FormField
                    control={form.control}
                    name="rateLimit"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center space-x-4">
                          <FormLabel className="text-sm text-yellow-700">Messages per minute:</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="60"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              className="w-20"
                              data-testid="input-rate-limit"
                            />
                          </FormControl>
                        </div>
                        <p className="text-xs text-yellow-600 mt-1">
                          Recommended: 30 messages/minute to avoid WhatsApp blocking
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel-campaign"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!form.formState.isValid}
                data-testid="button-preview-campaign"
              >
                Preview
              </Button>
              <Button
                type="submit"
                disabled={createCampaignMutation.isPending || !spintaxInfo.isValid || connectedSessions.length === 0}
                className="bg-whatsapp-500 text-white hover:bg-whatsapp-600"
                data-testid="button-start-campaign"
              >
                {createCampaignMutation.isPending ? "Creating..." : isScheduled ? "Schedule Campaign" : "Start Campaign"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
