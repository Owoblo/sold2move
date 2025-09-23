import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

const Orders = () => {
  const isLoading = false; // Set to true to see loading state

  return (
    <div>
      <h1 className="text-3xl font-bold text-lightest-slate mb-6">Orders</h1>
      <Card className="bg-light-navy border-lightest-navy/20">
        <CardHeader>
          <CardTitle className="text-lightest-slate">Your Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <SkeletonLoader count={3} className="h-10"/>
            </div>
          ) : (
            <div className="text-center py-10 text-slate">
              <p>You have no orders yet.</p>
              <p className="text-sm">Your mail campaigns and product purchases will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Orders;