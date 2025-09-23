import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const SupportTicket = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-lightest-slate mb-6">Support Ticket</h1>
      <Card>
        <CardHeader>
          <CardTitle>Get Help</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate">Submit a new support ticket or view the status of your existing tickets.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportTicket;