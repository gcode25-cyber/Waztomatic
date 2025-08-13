import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  MessageSquare, 
  Users, 
  Bot, 
  Calendar, 
  Settings, 
  BarChart, 
  MessageCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Campaigns", href: "/campaigns", icon: MessageSquare },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Auto-Reply", href: "/auto-reply", icon: Bot },
  { name: "Scheduler", href: "/scheduler", icon: Calendar },
  { name: "Sessions", href: "/sessions", icon: MessageCircle },
  { name: "Analytics", href: "/analytics", icon: BarChart },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  connectedSessions: Array<{ id: string; phone: string; status: string }>;
}

export function Sidebar({ connectedSessions }: SidebarProps) {
  const [location] = useLocation();

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="flex items-center h-16 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-whatsapp-500 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="ml-3 text-xl font-bold text-gray-900">Waziper</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                    isActive
                      ? "text-whatsapp-700 bg-whatsapp-50"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Connected Sessions Status */}
        <div className="px-4 py-4 border-t border-gray-200">
          {connectedSessions.length > 0 ? (
            connectedSessions.slice(0, 2).map((session) => (
              <div key={session.id} className="flex items-center mb-2">
                <div className="w-3 h-3 bg-whatsapp-500 rounded-full"></div>
                <span className="ml-2 text-sm text-gray-600">
                  Connected: {session.phone}
                </span>
              </div>
            ))
          ) : (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
              <span className="ml-2 text-sm text-gray-600">No active sessions</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
