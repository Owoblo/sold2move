import React, { Suspense, lazy } from 'react';
import { useProfile } from '@/hooks/useProfile.jsx';
import { Link, useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { ChevronDown, User, LogOut, Settings, CreditCard, Menu, X } from 'lucide-react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import DashboardNotification from '@/components/dashboard/DashboardNotification';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

const CreditMeter = lazy(() => import('@/components/dashboard/CreditMeter'));

const DashboardHeader = ({ isSidebarOpen, toggleSidebar }) => {
  const { profile, loading } = useProfile();
  const supabase = useSupabaseClient();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <header className="bg-light-navy border-b border-lightest-navy/20 p-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="text-lightest-slate hover:bg-lightest-navy/10"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
        <DashboardNotification />
      </div>
      <div className="flex items-center gap-4">
        <Suspense fallback={<SkeletonLoader className="h-8 w-28 rounded-full" />}>
          <CreditMeter />
        </Suspense>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 text-lightest-slate hover:bg-lightest-navy/10 hover:text-white">
              {loading ? (
                <SkeletonLoader className="h-5 w-24" />
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-teal/20 text-teal flex items-center justify-center font-bold">
                    {profile?.company_name?.charAt(0) || <User size={16} />}
                  </div>
                  <span className="hidden md:inline">{profile?.company_name || 'My Account'}</span>
                  <ChevronDown size={16} />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-light-navy border-lightest-navy/20 text-lightest-slate w-56">
            <DropdownMenuLabel>
              <p className="font-bold">{profile?.company_name}</p>
              <p className="text-xs text-slate font-normal">{profile?.business_email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-lightest-navy/20" />
            <DropdownMenuItem asChild>
              <Link to="/dashboard/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/billing" className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Billing</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-lightest-navy/20" />
            <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:bg-red-500/20 focus:text-red-400 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default DashboardHeader;