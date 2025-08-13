import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { X, Upload, Download, FileText, CheckCircle, AlertCircle } from "lucide-react";

interface ImportContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportContactsModal({ isOpen, onClose }: ImportContactsModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csv', file);
      
      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to import contacts');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setImportResult(data);
      toast({ 
        title: `Successfully imported ${data.imported} contacts`,
        description: data.errors > 0 ? `${data.errors} rows had errors` : undefined
      });
    },
    onError: () => {
      toast({ title: "Failed to import contacts", variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast({ title: "Please select a CSV file", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = 'name,phone,email,groups\n"John Doe","+1234567890","john@example.com","VIP,Customers"\n"Jane Smith","+1234567891","jane@example.com","Newsletter"';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImportResult(null);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      handleReset();
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Upload className="w-5 h-5 text-purple-600" />
              <span>Import Contacts</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose} data-testid="button-close-import-modal">
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!importResult ? (
            <>
              {/* File Upload Area */}
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="csv-upload"
                    data-testid="input-csv-file"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedFile ? selectedFile.name : "Choose CSV file"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Or drag and drop your CSV file here
                        </p>
                      </div>
                    </div>
                  </label>
                </div>

                {selectedFile && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-900">{selectedFile.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      data-testid="button-remove-file"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* CSV Format Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">CSV Format Requirements</h4>
                <div className="text-xs text-blue-700 space-y-1">
                  <p><strong>Required columns:</strong> name, phone</p>
                  <p><strong>Optional columns:</strong> email, groups</p>
                  <p><strong>Groups:</strong> Separate multiple groups with commas</p>
                  <p><strong>Example:</strong> "John Doe","+1234567890","john@example.com","VIP,Customers"</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="mt-3"
                  data-testid="button-download-template"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  data-testid="button-cancel-import"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!selectedFile || importMutation.isPending}
                  className="bg-purple-500 text-white hover:bg-purple-600"
                  data-testid="button-start-import"
                >
                  {importMutation.isPending ? "Importing..." : "Import Contacts"}
                </Button>
              </div>
            </>
          ) : (
            /* Import Results */
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-whatsapp-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-whatsapp-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Import Complete!</h3>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Successfully imported:</span>
                  <span className="text-sm font-medium text-whatsapp-600" data-testid="text-imported-count">
                    {importResult.imported} contacts
                  </span>
                </div>
                
                {importResult.errors > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Errors encountered:</span>
                    <span className="text-sm font-medium text-red-600" data-testid="text-error-count">
                      {importResult.errors} rows
                    </span>
                  </div>
                )}
              </div>

              {importResult.errorDetails && importResult.errorDetails.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-red-900 mb-2">Error Details</h4>
                      <div className="text-xs text-red-700 space-y-1">
                        {importResult.errorDetails.slice(0, 5).map((error: string, index: number) => (
                          <p key={index}>• {error}</p>
                        ))}
                        {importResult.errorDetails.length > 5 && (
                          <p>... and {importResult.errorDetails.length - 5} more errors</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-center space-x-3">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  data-testid="button-import-more"
                >
                  Import More
                </Button>
                <Button
                  onClick={handleClose}
                  className="bg-whatsapp-500 text-white hover:bg-whatsapp-600"
                  data-testid="button-done-import"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
