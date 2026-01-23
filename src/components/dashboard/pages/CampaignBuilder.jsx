import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Users,
  Palette,
  Send,
  Check,
  ChevronRight,
  ChevronLeft,
  Wallet,
  AlertCircle,
  Loader2,
  Mail,
  MapPin,
  Home,
  RefreshCw
} from 'lucide-react';
import { useWallet } from '../../../hooks/useWallet';
import { useAuth } from '../../../contexts/SupabaseAuthContext';
import { supabase } from '../../../lib/customSupabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Separator } from '../../ui/separator';
import { Textarea } from '../../ui/textarea';
import { Checkbox } from '../../ui/checkbox';
import { useToast } from '../../ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

const STEPS = [
  { id: 'template', title: 'Choose Template', icon: FileText },
  { id: 'customize', title: 'Customize', icon: Palette },
  { id: 'recipients', title: 'Select Recipients', icon: Users },
  { id: 'review', title: 'Review & Send', icon: Send },
];

const MAIL_TYPES = [
  { id: 'postcard', name: 'Postcard', price: 1.50, description: '4x6 full-color postcard' },
  { id: 'letter', name: 'Letter', price: 2.50, description: 'Personalized letter in envelope' },
  { id: 'handwritten', name: 'Handwritten', price: 3.50, description: 'Premium handwritten style' },
];

export default function CampaignBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { balance, formattedBalance, hasSufficientBalance } = useWallet();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [listings, setListings] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingListings, setLoadingListings] = useState(false);

  // Campaign state
  const [campaign, setCampaign] = useState({
    name: '',
    template_id: null,
    template: null,
    mail_type: 'postcard',
    customizations: {
      headline: '',
      body_text: '',
      call_to_action: '',
      sender_name: '',
      sender_company: '',
      sender_phone: '',
    },
    recipients: [],
    recipient_source: 'sold', // 'sold' or 'just_listed'
  });

  // Fetch templates
  useEffect(() => {
    async function fetchTemplates() {
      try {
        const { data, error } = await supabase
          .from('mail_templates')
          .select('*')
          .eq('is_active', true)
          .order('is_featured', { ascending: false });

        if (error) throw error;
        setTemplates(data || []);
      } catch (err) {
        console.error('Error fetching templates:', err);
        toast({
          title: 'Error',
          description: 'Failed to load templates',
          variant: 'destructive',
        });
      } finally {
        setLoadingTemplates(false);
      }
    }
    fetchTemplates();
  }, [toast]);

  // Fetch listings when on recipients step
  const fetchListings = useCallback(async (source) => {
    if (!user?.id) return;

    setLoadingListings(true);
    try {
      const table = source === 'sold' ? 'sold_listings' : 'just_listed';
      const { data, error } = await supabase
        .from(table)
        .select('id, address, addresscity, addressstate, addresszipcode, price, created_at')
        .limit(100)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Map to consistent field names
      const mappedData = (data || []).map(item => ({
        id: item.id,
        address: item.address,
        city: item.addresscity,
        state: item.addressstate,
        zip_code: item.addresszipcode,
        price: item.price,
        date: item.created_at
      }));
      setListings(mappedData);
    } catch (err) {
      console.error('Error fetching listings:', err);
    } finally {
      setLoadingListings(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (currentStep === 2) {
      fetchListings(campaign.recipient_source);
    }
  }, [currentStep, campaign.recipient_source, fetchListings]);

  // Calculate totals
  const mailType = MAIL_TYPES.find(t => t.id === campaign.mail_type);
  const pricePerPiece = mailType?.price || 1.50;
  const recipientCount = campaign.recipients.length;
  const totalCost = recipientCount * pricePerPiece;
  const hasEnoughFunds = hasSufficientBalance(totalCost);

  const updateCampaign = (updates) => {
    setCampaign(prev => ({ ...prev, ...updates }));
  };

  const updateCustomizations = (updates) => {
    setCampaign(prev => ({
      ...prev,
      customizations: { ...prev.customizations, ...updates }
    }));
  };

  const selectTemplate = (template) => {
    updateCampaign({
      template_id: template.id,
      template: template,
      mail_type: template.type || 'postcard',
    });
  };

  const toggleRecipient = (listing) => {
    const isSelected = campaign.recipients.some(r => r.id === listing.id);
    if (isSelected) {
      updateCampaign({
        recipients: campaign.recipients.filter(r => r.id !== listing.id)
      });
    } else {
      updateCampaign({
        recipients: [...campaign.recipients, listing]
      });
    }
  };

  const selectAllListings = () => {
    updateCampaign({ recipients: [...listings] });
  };

  const clearRecipients = () => {
    updateCampaign({ recipients: [] });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return campaign.template_id !== null;
      case 1:
        return campaign.name.trim() !== '' && campaign.customizations.sender_name.trim() !== '';
      case 2:
        return campaign.recipients.length > 0;
      case 3:
        return hasEnoughFunds;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!hasEnoughFunds) {
      toast({
        title: 'Insufficient Balance',
        description: 'Please add funds to your wallet to complete this campaign.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Create campaign via edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-campaign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            name: campaign.name,
            template_id: campaign.template_id,
            mail_type: campaign.mail_type,
            customizations: campaign.customizations,
            recipients: campaign.recipients.map(r => ({
              listing_id: r.id,
              address: r.address,
              city: r.city,
              state: r.state,
              zip_code: r.zip_code,
            })),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create campaign');
      }

      toast({
        title: 'Campaign Created!',
        description: `Your campaign "${campaign.name}" has been submitted for processing.`,
      });

      navigate('/dashboard/mailing');
    } catch (err) {
      console.error('Error creating campaign:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to create campaign',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (canProceed() && currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Campaign</h1>
        <p className="text-muted-foreground">
          Design and send direct mail to your target audience
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <div
              className={`flex items-center gap-2 ${
                index <= currentStep ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  index < currentStep
                    ? 'bg-primary border-primary text-primary-foreground'
                    : index === currentStep
                    ? 'border-primary text-primary'
                    : 'border-muted-foreground/30'
                }`}
              >
                {index < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              <span className="hidden md:block font-medium">{step.title}</span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 ${
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Wallet Balance Banner */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Wallet Balance</p>
                <p className="text-lg font-bold text-primary">{formattedBalance}</p>
              </div>
            </div>
            {recipientCount > 0 && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Campaign Cost</p>
                <p className={`text-lg font-bold ${hasEnoughFunds ? 'text-green-500' : 'text-destructive'}`}>
                  ${totalCost.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card className="min-h-[400px]">
        <CardContent className="pt-6">
          {/* Step 1: Choose Template */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Select a Template</h2>
                <p className="text-muted-foreground text-sm">
                  Choose a professional template for your direct mail campaign
                </p>
              </div>

              {loadingTemplates ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No templates available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => selectTemplate(template)}
                      className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md ${
                        campaign.template_id === template.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {template.is_featured && (
                        <Badge className="absolute -top-2 -right-2 bg-primary">Featured</Badge>
                      )}
                      <div className="aspect-video bg-muted rounded-md mb-3 flex items-center justify-center overflow-hidden">
                        {template.preview_url ? (
                          <img
                            src={template.preview_url}
                            alt={template.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline">{template.category || 'General'}</Badge>
                        <span className="text-sm font-medium">${template.cost_per_piece?.toFixed(2) || '1.50'}/pc</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Customize */}
          {currentStep === 1 && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-lg font-semibold mb-2">Customize Your Campaign</h2>
                <p className="text-muted-foreground text-sm">
                  Personalize your mail piece with your information
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="campaignName">Campaign Name *</Label>
                  <Input
                    id="campaignName"
                    placeholder="e.g., Spring 2024 Just Sold Campaign"
                    value={campaign.name}
                    onChange={(e) => updateCampaign({ name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mailType">Mail Type</Label>
                  <Select
                    value={campaign.mail_type}
                    onValueChange={(value) => updateCampaign({ mail_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MAIL_TYPES.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{type.name}</span>
                            <span className="text-muted-foreground ml-4">${type.price.toFixed(2)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{mailType?.description}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="senderName">Your Name *</Label>
                    <Input
                      id="senderName"
                      placeholder="John Smith"
                      value={campaign.customizations.sender_name}
                      onChange={(e) => updateCustomizations({ sender_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senderCompany">Company Name</Label>
                    <Input
                      id="senderCompany"
                      placeholder="ABC Moving Co."
                      value={campaign.customizations.sender_company}
                      onChange={(e) => updateCustomizations({ sender_company: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senderPhone">Phone Number</Label>
                  <Input
                    id="senderPhone"
                    placeholder="(555) 123-4567"
                    value={campaign.customizations.sender_phone}
                    onChange={(e) => updateCustomizations({ sender_phone: e.target.value })}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="headline">Headline (optional)</Label>
                  <Input
                    id="headline"
                    placeholder="Your Home Just Sold? Let Us Help You Move!"
                    value={campaign.customizations.headline}
                    onChange={(e) => updateCustomizations({ headline: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bodyText">Custom Message (optional)</Label>
                  <Textarea
                    id="bodyText"
                    placeholder="Add a personal message to your mail piece..."
                    rows={4}
                    value={campaign.customizations.body_text}
                    onChange={(e) => updateCustomizations({ body_text: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cta">Call to Action (optional)</Label>
                  <Input
                    id="cta"
                    placeholder="Call today for a free quote!"
                    value={campaign.customizations.call_to_action}
                    onChange={(e) => updateCustomizations({ call_to_action: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Select Recipients */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Select Recipients</h2>
                  <p className="text-muted-foreground text-sm">
                    Choose which properties to send mail to
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={campaign.recipient_source}
                    onValueChange={(value) => {
                      updateCampaign({ recipient_source: value, recipients: [] });
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sold">Sold Listings</SelectItem>
                      <SelectItem value="just_listed">Just Listed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {campaign.recipients.length} of {listings.length} selected
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllListings}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearRecipients}>
                    Clear
                  </Button>
                </div>
              </div>

              {loadingListings ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : listings.length === 0 ? (
                <div className="text-center py-12">
                  <Home className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No listings available</p>
                  <p className="text-sm text-muted-foreground/70">
                    Check your service areas in settings
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                  {listings.map((listing) => {
                    const isSelected = campaign.recipients.some(r => r.id === listing.id);
                    return (
                      <div
                        key={listing.id}
                        onClick={() => toggleRecipient(listing)}
                        className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRecipient(listing)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{listing.address}</p>
                          <p className="text-sm text-muted-foreground">
                            {listing.city}, {listing.state} {listing.zip_code}
                          </p>
                        </div>
                        <div className="text-right">
                          {listing.price && (
                            <p className="font-medium">
                              ${parseInt(listing.price).toLocaleString()}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {listing.date
                              ? `${campaign.recipient_source === 'sold' ? 'Sold' : 'Listed'} ${new Date(listing.date).toLocaleDateString()}`
                              : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review & Send */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Review Your Campaign</h2>
                <p className="text-muted-foreground text-sm">
                  Confirm the details before sending
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Campaign Details */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Campaign Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{campaign.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Template</span>
                      <span className="font-medium">{campaign.template?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mail Type</span>
                      <span className="font-medium">{mailType?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">From</span>
                      <span className="font-medium">
                        {campaign.customizations.sender_name}
                        {campaign.customizations.sender_company && ` (${campaign.customizations.sender_company})`}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Cost Summary */}
                <Card className={!hasEnoughFunds ? 'border-destructive' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Cost Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recipients</span>
                      <span className="font-medium">{recipientCount} addresses</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price per piece</span>
                      <span className="font-medium">${pricePerPiece.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">Total Cost</span>
                      <span className="font-bold">${totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Wallet Balance</span>
                      <span className={`font-medium ${hasEnoughFunds ? 'text-green-500' : 'text-destructive'}`}>
                        {formattedBalance}
                      </span>
                    </div>
                    {!hasEnoughFunds && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">Insufficient balance. Please add funds.</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recipients Preview */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recipients Preview</CardTitle>
                  <CardDescription>{recipientCount} addresses selected</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {campaign.recipients.slice(0, 10).map((r) => (
                      <Badge key={r.id} variant="secondary" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        {r.city}, {r.state}
                      </Badge>
                    ))}
                    {campaign.recipients.length > 10 && (
                      <Badge variant="outline">+{campaign.recipients.length - 10} more</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {!hasEnoughFunds && (
                <div className="flex justify-center">
                  <Button onClick={() => navigate('/dashboard/wallet')}>
                    <Wallet className="mr-2 h-4 w-4" />
                    Add Funds to Wallet
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Navigation */}
        <CardFooter className="flex justify-between border-t pt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button onClick={nextStep} disabled={!canProceed()}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || !hasEnoughFunds}
              className="min-w-[140px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Campaign
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
