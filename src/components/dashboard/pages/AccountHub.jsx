import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const AccountHub = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-lightest-slate mb-6">Account Hub</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate">Manage your account settings and profile information here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountHub;