import React from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Mail } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const DemoDashboardPage = () => {
  const { toast } = useToast();

  const demoData = [
    { address: '123 Maple St, Springfield, IL', soldDate: '2025-08-28', price: '$250,000', type: 'Single Family' },
    { address: '456 Oak Ave, Shelbyville, IL', soldDate: '2025-08-27', price: '$320,000', type: 'Single Family' },
    { address: '789 Pine Ln, Capital City, IL', soldDate: '2025-08-26', price: '$180,000', type: 'Condo' },
    { address: '101 Elm Ct, Springfield, IL', soldDate: '2025-08-25', price: '$450,000', type: 'Townhouse' },
    { address: '212 Birch Rd, Shelbyville, IL', soldDate: '2025-08-24', price: '$210,000', type: 'Single Family' },
  ];

  const handleActionClick = (action) => {
    toast({
      title: `🚧 ${action}`,
      description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  return (
    <PageWrapper
      title="Demo Dashboard"
      description="Explore the Sold2Move dashboard with a live preview. Filter real-time leads and see how easy it is to manage your marketing campaigns."
    >
      <div className="container mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-lightest-slate font-heading">Live Preview Dashboard</h1>
            <p className="text-lg text-slate mt-2">This is a read-only demo with sample data.</p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button onClick={() => handleActionClick('Export CSV')} variant="outline" className="border-green text-green hover:bg-green/10 hover:text-green">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={() => handleActionClick('Generate Mail Pack')} className="bg-green text-deep-navy hover:bg-green/90">
              <Mail className="mr-2 h-4 w-4" /> Generate Mail Pack
            </Button>
          </div>
        </div>

        <div className="bg-light-navy p-6 rounded-lg mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input type="text" placeholder="Filter by location (e.g., Springfield)" />
            <Input type="text" placeholder="Filter by price (e.g., >200k)" />
            <Input type="date" placeholder="Filter by sold date" />
            <Button className="w-full bg-lightest-navy text-lightest-slate hover:bg-lightest-navy/80">Apply Filters</Button>
          </div>
        </div>

        <div className="bg-light-navy rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>Sold Date</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Property Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demoData.map((lead, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium text-lightest-slate">{lead.address}</TableCell>
                  <TableCell>{lead.soldDate}</TableCell>
                  <TableCell>{lead.price}</TableCell>
                  <TableCell>{lead.type}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageWrapper>
  );
};

export default DemoDashboardPage;