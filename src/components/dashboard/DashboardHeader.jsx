import React from 'react';
import { useProfile } from '@/hooks/useProfile';
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
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';

const DashboardHeader = ({ isSidebarOpen, toggleSidebar }) => {
  const { profile, loading } = useProfile();
  const supabase = useSupabaseClient();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <header className={`p-4 flex justify-between items-center transition-all ${
      isLight
        ? 'bg-white/88 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
        : 'bg-charcoal-800 border-b border-white/[0.06]'
    }`}>
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={isLight
            ? 'text-slate-700 hover:bg-slate-100'
            : 'text-lightest-slate hover:bg-charcoal-700/50'
          }
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
        <DashboardNotification />
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className={`flex items-center gap-2 ${
              isLight
                ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                : 'text-lightest-slate hover:bg-charcoal-700/50 hover:text-white'
            }`}>
              {loading ? (
                <SkeletonLoader className="h-5 w-24" />
              ) : (
                <>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border ${
                    isLight
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-primary/20 text-primary border-primary/30'
                  }`}>
                    {profile?.company_name?.charAt(0) || <User size={16} />}
                  </div>
                  <span className="hidden md:inline">{profile?.company_name || 'My Account'}</span>
                  <ChevronDown size={16} />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={`w-56 ${
            isLight
              ? 'bg-white border-slate-200 text-slate-800 shadow-lg'
              : 'bg-charcoal-800 border-white/[0.08] text-lightest-slate shadow-xl'
          }`}>
            <DropdownMenuLabel>
              <p className={`font-bold ${isLight ? 'text-slate-900' : ''}`}>{profile?.company_name}</p>
              <p className={`text-xs font-normal ${isLight ? 'text-slate-500' : 'text-slate'}`}>{profile?.business_email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className={isLight ? 'bg-slate-200' : 'bg-white/[0.06]'} />
            <DropdownMenuItem asChild>
              <Link to="/dashboard/settings" className={`cursor-pointer ${
                isLight ? 'hover:bg-slate-50' : 'hover:bg-charcoal-700/50'
              }`}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/billing" className={`cursor-pointer ${
                isLight ? 'hover:bg-slate-50' : 'hover:bg-charcoal-700/50'
              }`}>
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Billing</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className={isLight ? 'bg-slate-200' : 'bg-white/[0.06]'} />
            <DropdownMenuItem onClick={handleLogout} className={`cursor-pointer ${
              isLight
                ? 'text-red-600 focus:bg-red-50 focus:text-red-600'
                : 'text-red-400 focus:bg-red-500/20 focus:text-red-400'
            }`}>
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