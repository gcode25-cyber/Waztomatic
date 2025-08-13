import { User, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onNewCampaign?: () => void;
}

export function Header({ title, subtitle, onNewCampaign }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {onNewCampaign && (
            <Button 
              className="bg-whatsapp-500 text-white hover:bg-whatsapp-600"
              onClick={onNewCampaign}
              data-testid="button-new-campaign"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          )}
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
        </div>
      </div>
    </header>
  );
}
