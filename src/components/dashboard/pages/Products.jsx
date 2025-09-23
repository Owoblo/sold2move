import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const Products = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-lightest-slate mb-6">Products</h1>
      <Card>
        <CardHeader>
          <CardTitle>Available Products</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate">Browse and purchase products like postcard templates, letter designs, and more.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Products;