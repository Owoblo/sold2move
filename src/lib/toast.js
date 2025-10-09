import { toast as shadToast } from '@/components/ui/use-toast';

const toast = {
  success: (title, description) => {
    shadToast({
      title: title,
      description: description,
      className: 'bg-teal text-deep-navy border-teal',
    });
  },
  error: (title, description) => {
    shadToast({
      variant: 'destructive',
      title: title,
      description: description,
    });
  },
  info: (title, description) => {
    shadToast({
      title: title,
      description: description,
      className: 'bg-light-navy text-lightest-slate border-lightest-navy/20',
    });
  },
  warning: (title, description) => {
    shadToast({
      title: title,
      description: description,
      className: 'bg-amber-500 text-deep-navy border-amber-500',
    });
  },
  custom: (options) => {
    shadToast(options);
  }
};

export default toast;