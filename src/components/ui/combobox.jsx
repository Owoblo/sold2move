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
            "hover:border-teal/50 hover:bg-teal/5",
            "focus:border-teal focus:ring-2 focus:ring-teal/20",
            open && "border-teal ring-2 ring-teal/20",
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
                    "hover:bg-teal/10 hover:text-teal",
                    "active:bg-teal/20 active:scale-[0.98]",
                    "focus:bg-teal/10 focus:text-teal",
                    value === option.value && "bg-teal/20 text-teal font-medium"
                  )}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 transition-opacity duration-200',
                      value === option.value ? 'opacity-100 text-teal' : 'opacity-0'
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