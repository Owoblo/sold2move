import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const Mailing = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-lightest-slate mb-6">Mailing</h1>
      <Card>
        <CardHeader>
          <CardTitle>Direct Mail Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate">Create, manage, and track your direct mail campaigns here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Mailing;