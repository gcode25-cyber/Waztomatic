import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, QrCode, Smartphone, RefreshCw } from "lucide-react";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  session?: any;
}

export function QRCodeModal({ isOpen, onClose, session }: QRCodeModalProps) {
  const [connectionStatus, setConnectionStatus] = useState<string>("waiting");

  const { data: qrData, refetch } = useQuery<{ qrCode: string }>({
    queryKey: ["/api/sessions", session?.id, "qr"],
    enabled: isOpen && !!session?.id,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  useEffect(() => {
    if (session?.status) {
      setConnectionStatus(session.status);
    }
  }, [session?.status]);

  const handleRefresh = () => {
    refetch();
  };

  const getStatusMessage = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          title: "Successfully Connected!",
          message: "Your WhatsApp session is now active and ready to send messages.",
          color: "text-whatsapp-600"
        };
      case 'connecting':
        return {
          title: "Connecting...",
          message: "Please wait while we establish the connection.",
          color: "text-blue-600"
        };
      case 'qr_pending':
        return {
          title: "Scan QR Code",
          message: "Use your phone to scan the QR code below.",
          color: "text-orange-600"
        };
      default:
        return {
          title: "Waiting for QR Code",
          message: "Generating QR code for WhatsApp connection...",
          color: "text-gray-600"
        };
    }
  };

  const status = getStatusMessage();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect WhatsApp</DialogTitle>
          <DialogDescription>
            Scan the QR code with your WhatsApp mobile app to connect your session.
          </DialogDescription>
        </DialogHeader>

        <div className="text-center space-y-6">
          {/* QR Code Display */}
          <div className="w-64 h-64 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mx-auto relative">
            {qrData?.qrCode ? (
              <img 
                src={qrData.qrCode} 
                alt="WhatsApp QR Code" 
                className="w-full h-full object-contain rounded-lg"
                data-testid="img-qr-code"
              />
            ) : connectionStatus === 'connected' ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-whatsapp-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-8 h-8 text-whatsapp-600" />
                </div>
                <p className="text-sm text-whatsapp-600 font-medium">Connected!</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-whatsapp-500 mx-auto mb-4"></div>
                <p className="text-sm text-gray-500">Generating QR Code...</p>
              </div>
            )}
            
            {/* Refresh button */}
            {qrData?.qrCode && connectionStatus !== 'connected' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="absolute top-2 right-2 bg-white shadow-md"
                data-testid="button-refresh-qr"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Status Message */}
          <div className="space-y-2">
            <h3 className={`font-medium ${status.color}`} data-testid="text-connection-status">
              {status.title}
            </h3>
            <p className="text-sm text-gray-600">{status.message}</p>
          </div>

          {/* Instructions */}
          {connectionStatus !== 'connected' && (
            <div className="bg-gray-50 p-4 rounded-lg text-left">
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <Smartphone className="w-4 h-4 mr-2" />
                How to connect:
              </h4>
              <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                <li>Open WhatsApp on your phone</li>
                <li>Go to Settings → Linked Devices</li>
                <li>Tap "Link a Device"</li>
                <li>Scan this QR code with your camera</li>
              </ol>
            </div>
          )}

          {/* Connection Status Indicator */}
          <div className="flex items-center justify-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-whatsapp-500' :
              connectionStatus === 'connecting' ? 'bg-blue-500 animate-pulse' :
              connectionStatus === 'qr_pending' ? 'bg-orange-500 animate-pulse' :
              'bg-gray-300'
            }`}></div>
            <span className="text-sm text-gray-600">
              {connectionStatus === 'connected' ? 'Connected' :
               connectionStatus === 'connecting' ? 'Connecting...' :
               connectionStatus === 'qr_pending' ? 'Waiting for scan...' :
               'Preparing...'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-3">
            {connectionStatus === 'connected' ? (
              <Button
                onClick={onClose}
                className="bg-whatsapp-500 text-white hover:bg-whatsapp-600"
                data-testid="button-close-connected"
              >
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={onClose} data-testid="button-close-qr">
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  data-testid="button-refresh-connection"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </>
            )}
          </div>

          {/* Additional Help */}
          {connectionStatus === 'qr_pending' && (
            <div className="text-xs text-gray-500">
              <p>QR code not working?</p>
              <p>Make sure your phone and computer are connected to the internet.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
