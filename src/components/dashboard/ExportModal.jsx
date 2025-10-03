import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Download, 
  FileText, 
  Mail, 
  Database,
  Zap,
  CheckCircle,
  Building
} from 'lucide-react';
import { 
  exportListingsWithContact, 
  exportForCRM, 
  generateMailMergeTemplate 
} from '@/lib/csvExporter';
import LoadingButton from '@/components/ui/LoadingButton';

const ExportModal = ({ 
  isOpen, 
  onClose, 
  listings, 
  listingType = 'just-listed',
  onExport 
}) => {
  const [exportFormat, setExportFormat] = useState('basic');
  const [includeContactInfo, setIncludeContactInfo] = useState(true);
  const [crmType, setCrmType] = useState('generic');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!listings || listings.length === 0) {
      return;
    }

    setIsExporting(true);
    
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${listingType}-${timestamp}.csv`;

      switch (exportFormat) {
        case 'basic':
          exportListingsWithContact(listings, filename, false);
          break;
        case 'detailed':
          exportListingsWithContact(listings, filename, includeContactInfo);
          break;
        case 'crm':
          exportForCRM(listings, crmType);
          break;
        case 'mail-merge':
          generateMailMergeTemplate(listings);
          break;
        default:
          exportListingsWithContact(listings, filename, includeContactInfo);
      }

      // Track export analytics
      if (onExport) {
        onExport({
          format: exportFormat,
          listingCount: listings.length,
          includeContactInfo,
          crmType: exportFormat === 'crm' ? crmType : null
        });
      }

      // Close modal after successful export
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 1000);

    } catch (error) {
      console.error('Export error:', error);
      setIsExporting(false);
    }
  };

  const exportOptions = [
    {
      id: 'basic',
      title: 'Basic Export',
      description: 'Property details only (address, price, beds, baths)',
      icon: FileText,
      recommended: false
    },
    {
      id: 'detailed',
      title: 'Detailed Export',
      description: 'Complete property information with contact details',
      icon: Database,
      recommended: true
    },
    {
      id: 'crm',
      title: 'CRM Integration',
      description: 'Formatted for popular CRM systems',
      icon: Building,
      recommended: false
    },
    {
      id: 'mail-merge',
      title: 'Mail Merge Template',
      description: 'Generate email template for outreach',
      icon: Mail,
      recommended: false
    }
  ];

  const crmOptions = [
    { value: 'generic', label: 'Generic CSV' },
    { value: 'salesforce', label: 'Salesforce' },
    { value: 'hubspot', label: 'HubSpot' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-light-navy border-lightest-navy/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lightest-slate">
            <Download className="h-5 w-5 text-green" />
            Export Listings
          </DialogTitle>
          <DialogDescription className="text-slate">
            Choose how you'd like to export your {listings?.length || 0} listings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Format Selection */}
          <div>
            <Label className="text-lightest-slate font-semibold mb-4 block">
              Export Format
            </Label>
            <RadioGroup value={exportFormat} onValueChange={setExportFormat}>
              <div className="space-y-3">
                {exportOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <motion.div
                      key={option.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card className={`cursor-pointer transition-all duration-200 ${
                        exportFormat === option.id 
                          ? 'bg-green/10 border-green/50' 
                          : 'bg-deep-navy/30 border-lightest-navy/20 hover:bg-deep-navy/50'
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <RadioGroupItem value={option.id} id={option.id} />
                            <div className="p-2 bg-light-navy rounded-md">
                              <IconComponent className="h-5 w-5 text-green" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Label 
                                  htmlFor={option.id} 
                                  className="text-lightest-slate font-medium cursor-pointer"
                                >
                                  {option.title}
                                </Label>
                                {option.recommended && (
                                  <span className="text-xs bg-green text-deep-navy px-2 py-1 rounded-full">
                                    Recommended
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate mt-1">
                                {option.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          {/* Additional Options */}
          {exportFormat === 'detailed' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <Card className="bg-deep-navy/30 border-lightest-navy/20">
                <CardHeader>
                  <CardTitle className="text-sm text-lightest-slate">Export Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-contact"
                      checked={includeContactInfo}
                      onCheckedChange={setIncludeContactInfo}
                    />
                    <Label 
                      htmlFor="include-contact" 
                      className="text-sm text-lightest-slate cursor-pointer"
                    >
                      Include contact information (agent phone, email, office details)
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {exportFormat === 'crm' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <Card className="bg-deep-navy/30 border-lightest-navy/20">
                <CardHeader>
                  <CardTitle className="text-sm text-lightest-slate">CRM System</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={crmType} onValueChange={setCrmType}>
                    <div className="space-y-2">
                      {crmOptions.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={option.value} />
                          <Label 
                            htmlFor={option.value} 
                            className="text-sm text-lightest-slate cursor-pointer"
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Export Summary */}
          <Card className="bg-green/5 border-green/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green" />
                <span className="text-sm font-medium text-lightest-slate">Export Summary</span>
              </div>
              <div className="text-sm text-slate">
                <p>• {listings?.length || 0} listings will be exported</p>
                <p>• Format: {exportOptions.find(opt => opt.id === exportFormat)?.title}</p>
                {exportFormat === 'detailed' && includeContactInfo && (
                  <p>• Contact information included</p>
                )}
                {exportFormat === 'crm' && (
                  <p>• Optimized for {crmOptions.find(opt => opt.value === crmType)?.label}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="text-xs text-slate">
            <Zap className="inline h-3 w-3 mr-1" />
            Export saves time and improves lead management
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <LoadingButton
              onClick={handleExport}
              disabled={!listings || listings.length === 0 || isExporting}
              isLoading={isExporting}
              className="bg-green text-deep-navy hover:bg-green/90"
            >
              <Download className="h-4 w-4 mr-2" />
              Export {listings?.length || 0} Listings
            </LoadingButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportModal;
