import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export const Combobox = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  emptyText = 'No options found.',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);

  const selectedOption = useMemo(() => {
     return options.find((option) => option.value === value) || null;
  }, [options, value]);
  
  const handleSelect = (currentValue) => {
    onChange(currentValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between transition-all duration-200",
            "hover:border-green/50 hover:bg-green/5",
            "focus:border-green focus:ring-2 focus:ring-green/20",
            open && "border-green ring-2 ring-green/20",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => handleSelect(option.value)}
                  className={cn(
                    "cursor-pointer transition-all duration-200",
                    "hover:bg-green/10 hover:text-green",
                    "active:bg-green/20 active:scale-[0.98]",
                    "focus:bg-green/10 focus:text-green",
                    value === option.value && "bg-green/20 text-green font-medium"
                  )}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 transition-opacity duration-200',
                      value === option.value ? 'opacity-100 text-green' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};