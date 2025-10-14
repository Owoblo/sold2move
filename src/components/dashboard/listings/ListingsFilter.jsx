import React from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SlidersHorizontal, RotateCw } from 'lucide-react';

const propertyTypeOptions = [
  { value: 'Condo for sale', label: 'Condo' },
  { value: 'Townhouse for sale', label: 'Townhouse' },
  { value: 'House for sale', label: 'House/Single Family' },
  { value: 'Land for sale', label: 'Land' },
  { value: 'For sale', label: 'Other For Sale' },
];

const ListingsFilter = ({ filters, onFilterChange, onApply, onReset }) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onFilterChange({ ...filters, [name]: value });
  };

  const handleComboboxChange = (value) => {
    onFilterChange({ ...filters, propertyType: value });
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-light-navy p-4 rounded-lg border border-lightest-navy/20 mb-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 items-end">
        
        <div className="space-y-2">
          <Label htmlFor="minPrice" className="text-sm font-medium text-slate">Min Price</Label>
          <Input id="minPrice" name="minPrice" type="number" placeholder="e.g., 200000" value={filters.minPrice || ''} onChange={handleInputChange} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxPrice" className="text-sm font-medium text-slate">Max Price</Label>
          <Input id="maxPrice" name="maxPrice" type="number" placeholder="e.g., 500000" value={filters.maxPrice || ''} onChange={handleInputChange} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="beds" className="text-sm font-medium text-slate">Min Beds</Label>
          <Input id="beds" name="beds" type="number" placeholder="Any" value={filters.beds || ''} onChange={handleInputChange} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="baths" className="text-sm font-medium text-slate">Min Baths</Label>
          <Input id="baths" name="baths" type="number" placeholder="Any" value={filters.baths || ''} onChange={handleInputChange} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="propertyType" className="text-sm font-medium text-slate">Property Type</Label>
          <Select value={filters.propertyType} onValueChange={handleComboboxChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {propertyTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button onClick={onApply} className="w-full bg-teal text-deep-navy hover:bg-teal/90">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Apply
          </Button>
          <Button onClick={onReset} variant="outline" className="w-full">
            <RotateCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default ListingsFilter;