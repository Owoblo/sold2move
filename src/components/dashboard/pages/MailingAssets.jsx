import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const MailingAssets = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-lightest-slate mb-6">Mailing Assets</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate">Upload and manage your logos, images, and other assets for mailers.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MailingAssets;