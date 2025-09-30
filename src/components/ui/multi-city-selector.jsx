import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

export const MultiCitySelector = ({
  options = [],
  value = [],
  onChange,
  placeholder = 'Select cities...',
  searchPlaceholder = 'Search cities...',
  emptyText = 'No cities found.',
  disabled = false,
  maxSelections = 5,
}) => {
  const [open, setOpen] = useState(false);

  const selectedOptions = useMemo(() => {
    return options.filter(option => value.includes(option.value));
  }, [options, value]);
  
  const handleSelect = (currentValue) => {
    const option = options.find(opt => opt.value === currentValue);
    if (option) {
      if (value.includes(option.value)) {
        // Remove if already selected
        onChange(value.filter(v => v !== option.value));
      } else if (value.length < maxSelections) {
        // Add if not at max selections
        onChange([...value, option.value]);
      }
    }
  };

  const handleRemove = (valueToRemove) => {
    onChange(value.filter(v => v !== valueToRemove));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedOptions.length > 0 
              ? `${selectedOptions.length} cities selected`
              : placeholder
            }
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
                    value={option.value}
                    onSelect={handleSelect}
                    disabled={!value.includes(option.value) && value.length >= maxSelections}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value.includes(option.value) ? 'opacity-100' : 'opacity-0'
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
      
      {/* Selected Cities Display */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <Badge
              key={option.value}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {option.label}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleRemove(option.value)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
      
      {value.length >= maxSelections && (
        <p className="text-sm text-muted-foreground">
          Maximum {maxSelections} cities allowed
        </p>
      )}
    </div>
  );
};
