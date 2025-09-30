import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const DateFilter = ({ value, onChange, className = '' }) => {
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customDate, setCustomDate] = useState('');

  const dateOptions = [
    { value: 'all', label: 'All Time', icon: Calendar },
    { value: '1', label: 'Last 24 Hours', icon: Clock },
    { value: '7', label: 'Last 7 Days', icon: Clock },
    { value: '14', label: 'Last 14 Days', icon: Clock },
    { value: '30', label: 'Last 30 Days', icon: Clock },
    { value: '90', label: 'Last 90 Days', icon: Clock },
    { value: '180', label: 'Last 6 Months', icon: Clock },
    { value: '365', label: 'Last Year', icon: Clock },
    { value: 'custom', label: 'Specific Date', icon: CalendarDays },
  ];

  const handleCustomDateChange = (dateString) => {
    setCustomDate(dateString);
    if (dateString) {
      // Convert to ISO string for backend processing
      const selectedDate = new Date(dateString);
      const startDate = startOfDay(selectedDate).toISOString();
      const endDate = endOfDay(selectedDate).toISOString();
      onChange({ type: 'custom', startDate, endDate, label: `On ${format(selectedDate, 'MMM dd, yyyy')}` });
    }
  };

  const handlePresetChange = (selectedValue) => {
    if (selectedValue === 'custom') {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
      onChange(selectedValue);
    }
  };

  const getSelectedOption = () => {
    if (typeof value === 'object' && value?.type === 'custom') {
      return { value: 'custom', label: value.label, icon: CalendarDays };
    }
    return dateOptions.find(option => option.value === value) || dateOptions[0];
  };

  const selectedOption = getSelectedOption();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Calendar className="h-4 w-4 text-slate-400" />
      <Select value={typeof value === 'object' ? 'custom' : value} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select time period">
            <div className="flex items-center space-x-2">
              <selectedOption.icon className="h-4 w-4" />
              <span>{selectedOption.label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {dateOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center space-x-2">
                <option.icon className="h-4 w-4" />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {showCustomDate && (
        <div className="flex items-center space-x-2">
          <Input
            type="date"
            value={customDate}
            onChange={(e) => handleCustomDateChange(e.target.value)}
            className="w-[150px]"
            placeholder="Select date"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowCustomDate(false);
              setCustomDate('');
              onChange('all');
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default DateFilter;
