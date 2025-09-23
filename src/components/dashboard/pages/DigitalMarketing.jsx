import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const DigitalMarketing = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-lightest-slate mb-6">Digital Marketing</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate">Manage your digital marketing campaigns, including social media and email.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DigitalMarketing;