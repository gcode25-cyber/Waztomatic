import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { X, Bot, Clock, Info } from "lucide-react";

const autoReplySchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  triggerType: z.string().min(1, "Please select a trigger type"),
  keywords: z.array(z.string()).optional(),
  response: z.string().min(1, "Response message is required"),
  delay: z.number().min(0).max(300).default(0),
  isActive: z.boolean().default(true),
  businessHoursOnly: z.boolean().default(false),
  businessHoursStart: z.string().default("09:00"),
  businessHoursEnd: z.string().default("18:00"),
  sessionId: z.string().min(1, "Please select a WhatsApp session"),
});

type AutoReplyFormData = z.infer<typeof autoReplySchema>;

interface AutoReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingRule?: any;
}

export function AutoReplyModal({ isOpen, onClose, editingRule }: AutoReplyModalProps) {
  const [keywordInput, setKeywordInput] = useState("");
  const { toast } = useToast();

  const form = useForm<AutoReplyFormData>({
    resolver: zodResolver(autoReplySchema),
    defaultValues: editingRule ? {
      ...editingRule,
      keywords: editingRule.keywords || [],
    } : {
      name: "",
      triggerType: "",
      keywords: [],
      response: "",
      delay: 0,
      isActive: true,
      businessHoursOnly: false,
      businessHoursStart: "09:00",
      businessHoursEnd: "18:00",
      sessionId: "",
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["/api/sessions"],
  });

  const createRuleMutation = useMutation({
    mutationFn: (data: AutoReplyFormData) => 
      apiRequest("POST", "/api/auto-reply-rules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-reply-rules"] });
      toast({ title: "Auto-reply rule created successfully" });
      onClose();
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create auto-reply rule", variant: "destructive" });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: (data: AutoReplyFormData) => 
      apiRequest("PUT", `/api/auto-reply-rules/${editingRule.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-reply-rules"] });
      toast({ title: "Auto-reply rule updated successfully" });
      onClose();
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update auto-reply rule", variant: "destructive" });
    },
  });

  const connectedSessions = sessions.filter((s: any) => s.status === 'connected');

  const triggerTypes = [
    { value: "contains", label: "Contains keywords", needsKeywords: true },
    { value: "exact", label: "Exact match", needsKeywords: true },
    { value: "starts_with", label: "Starts with", needsKeywords: true },
    { value: "ends_with", label: "Ends with", needsKeywords: true },
    { value: "any", label: "Any message", needsKeywords: false },
    { value: "first_message", label: "First message from contact", needsKeywords: false },
  ];

  const selectedTriggerType = triggerTypes.find(t => t.value === form.watch('triggerType'));

  const addKeyword = () => {
    if (keywordInput.trim()) {
      const currentKeywords = form.getValues('keywords') || [];
      if (!currentKeywords.includes(keywordInput.trim())) {
        form.setValue('keywords', [...currentKeywords, keywordInput.trim()]);
        setKeywordInput("");
      }
    }
  };

  const removeKeyword = (keyword: string) => {
    const currentKeywords = form.getValues('keywords') || [];
    form.setValue('keywords', currentKeywords.filter(k => k !== keyword));
  };

  const onSubmit = (data: AutoReplyFormData) => {
    if (editingRule) {
      updateRuleMutation.mutate(data);
    } else {
      createRuleMutation.mutate(data);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-orange-600" />
            <span>{editingRule ? "Edit" : "Create"} Auto-Reply Rule</span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rule Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter rule name..." {...field} data-testid="input-rule-name" />
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
              name="triggerType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trigger Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-trigger-type">
                        <SelectValue placeholder="Select trigger type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {triggerTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedTriggerType?.needsKeywords && (
              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keywords</FormLabel>
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Enter keyword..."
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                          data-testid="input-keyword"
                        />
                        <Button
                          type="button"
                          onClick={addKeyword}
                          disabled={!keywordInput.trim()}
                          data-testid="button-add-keyword"
                        >
                          Add
                        </Button>
                      </div>
                      
                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {field.value.map((keyword) => (
                            <div
                              key={keyword}
                              className="flex items-center bg-gray-100 rounded-md px-2 py-1 text-sm"
                            >
                              <span>{keyword}</span>
                              <button
                                type="button"
                                onClick={() => removeKeyword(keyword)}
                                className="ml-2 text-gray-500 hover:text-red-500"
                                data-testid={`button-remove-keyword-${keyword}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-500">
                        Keywords are case-insensitive. Add multiple keywords to trigger on any of them.
                      </p>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="response"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auto-Reply Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your automatic response..."
                      rows={3}
                      {...field}
                      data-testid="textarea-response"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="delay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delay (seconds)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="300"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-delay"
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500">
                      Delay before sending the auto-reply (0-300 seconds)
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <div className="flex items-center space-x-2 pt-2">
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active"
                      />
                      <span className="text-sm text-gray-600">
                        {field.value ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="businessHoursOnly"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <div>
                      <FormLabel>Business Hours Only</FormLabel>
                      <p className="text-sm text-gray-500">Only trigger during specified business hours</p>
                    </div>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-business-hours"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('businessHoursOnly') && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="businessHoursStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-business-start" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessHoursEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-business-end" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Help Information */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Auto-Reply Tips</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Rules are processed in the order they were created</li>
                    <li>• Only the first matching rule will trigger for each message</li>
                    <li>• Use delays to make responses feel more natural</li>
                    <li>• Business hours are based on your system timezone</li>
                    <li>• Keywords are matched case-insensitively</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel-rule"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createRuleMutation.isPending || updateRuleMutation.isPending || connectedSessions.length === 0}
                className="bg-whatsapp-500 text-white hover:bg-whatsapp-600"
                data-testid="button-save-rule"
              >
                {createRuleMutation.isPending || updateRuleMutation.isPending 
                  ? "Saving..." 
                  : editingRule ? "Update Rule" : "Create Rule"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
