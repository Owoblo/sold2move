
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const NotificationsSettings = () => {
  const { toast } = useToast();

  const showNotImplementedToast = () => {
    toast({
      title: "🚧 Feature Coming Soon!",
      description: "Notification settings are not yet implemented. You can request this feature in your next prompt! 🚀",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-heading">Notification Preferences</CardTitle>
        <CardDescription>Choose how you receive notifications from us.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col space-y-4">
          <h3 className="font-semibold text-lightest-slate">Email Notifications</h3>
          <div className="flex items-center justify-between p-4 rounded-lg border border-lightest-navy/20 bg-deep-navy">
            <div>
              <p className="font-medium text-light-slate">New Lead Alerts</p>
              <p className="text-sm text-slate">Receive an email when new leads match your criteria.</p>
            </div>
            <Button variant="outline" onClick={showNotImplementedToast}>Toggle</Button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border border-lightest-navy/20 bg-deep-navy">
            <div>
              <p className="font-medium text-light-slate">Weekly Summary</p>
              <p className="text-sm text-slate">Get a weekly digest of your account activity.</p>
            </div>
            <Button variant="outline" onClick={showNotImplementedToast}>Toggle</Button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border border-lightest-navy/20 bg-deep-navy">
            <div>
              <p className="font-medium text-light-slate">Promotional Updates</p>
              <p className="text-sm text-slate">Receive news about new features and special offers.</p>
            </div>
            <Button variant="outline" onClick={showNotImplementedToast}>Toggle</Button>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={showNotImplementedToast}>Save Preferences</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationsSettings;
