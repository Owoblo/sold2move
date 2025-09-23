import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Sparkles, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const DashboardNotification = ({ notification, onDismiss }) => {
  if (!notification || notification.is_read) {
    return null;
  }

  const { just_listed_count, sold_count, city_name, created_at, id } = notification;
  const hasJustListed = just_listed_count > 0;
  const hasSold = sold_count > 0;

  const timeAgo = formatDistanceToNow(new Date(created_at), { addSuffix: true });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-r from-teal-500/20 to-green/20 border border-green/30 rounded-lg p-4 mb-6 shadow-lg overflow-hidden"
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Sparkles className="h-6 w-6 text-green animate-pulse" />
          </div>
          <div className="ml-4 flex-1">
            <div className="flex justify-between items-center">
                <p className="text-sm font-bold text-lightest-slate">New Leads Alert!</p>
                <p className="text-xs text-slate">{timeAgo}</p>
            </div>
            <p className="mt-1 text-lightest-slate">
              {hasJustListed && (
                <>
                  <span className="font-bold text-green">{just_listed_count}</span> new properties just listed
                  {hasSold ? ' and ' : ' '}
                </>
              )}
              {hasSold && (
                <>
                  <span className="font-bold text-green">{sold_count}</span> properties recently sold
                </>
              )}
              in <span className="font-semibold">{city_name}</span>.
            </p>
            <div className="mt-3 flex gap-4">
              <Button asChild size="sm" className="bg-green text-deep-navy hover:bg-green/90">
                <Link to="/dashboard/listings">View Listings</Link>
              </Button>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => onDismiss(id)}
              className="inline-flex text-slate rounded-md p-1 hover:bg-lightest-navy/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-deep-navy focus:ring-green"
            >
              <span className="sr-only">Dismiss</span>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DashboardNotification;