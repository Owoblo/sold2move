import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const Resources = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-lightest-slate mb-6">Resources</h1>
      <Card>
        <CardHeader>
          <CardTitle>Helpful Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate">Access marketing guides, best practices, and other resources to help you succeed.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Resources;