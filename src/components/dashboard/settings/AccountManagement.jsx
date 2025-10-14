import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Shield, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  User,
  Key
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const emailSchema = z.object({
  newEmail: z.string().email('Please enter a valid email address'),
  confirmEmail: z.string(),
}).refine((data) => data.newEmail === data.confirmEmail, {
  message: "Emails don't match",
  path: ["confirmEmail"],
});

const AccountManagement = () => {
  const { user, updatePassword, updateEmail, deleteAccount } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('password');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const emailForm = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      newEmail: '',
      confirmEmail: '',
    },
  });

  const handlePasswordUpdate = async (data) => {
    setIsLoading(true);
    const { error } = await updatePassword(data.newPassword);
    setIsLoading(false);
    
    if (!error) {
      passwordForm.reset();
      toast({
        title: "Password updated successfully",
        description: "Your password has been changed.",
      });
    }
  };

  const handleEmailUpdate = async (data) => {
    setIsLoading(true);
    const { error } = await updateEmail(data.newEmail);
    setIsLoading(false);
    
    if (!error) {
      emailForm.reset();
      toast({
        title: "Email update initiated",
        description: "Check your new email for a confirmation link.",
      });
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    const { error } = await deleteAccount();
    setIsLoading(false);
    
    if (!error) {
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-lightest-slate flex items-center gap-2">
          <User className="h-6 w-6" />
          Account Management
        </h2>
        <p className="text-slate mt-1">
          Manage your account settings, password, and email address.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-slate">Email Address</label>
              <p className="text-lightest-slate font-medium">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm text-slate">User ID</label>
              <p className="text-lightest-slate font-medium text-xs">{user?.id}</p>
            </div>
            <div>
              <label className="text-sm text-slate">Account Created</label>
              <p className="text-lightest-slate font-medium">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
            <div>
              <label className="text-sm text-slate">Email Verified</label>
              <div className="flex items-center gap-2">
                {user?.email_confirmed_at ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-lightest-slate font-medium">
                  {user?.email_confirmed_at ? 'Verified' : 'Not Verified'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordUpdate)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-slate">New Password</label>
                <div className="relative">
                  <Input
                    {...passwordForm.register('newPassword')}
                    type={showPasswords.new ? 'text' : 'password'}
                    placeholder="Enter new password"
                    className="pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate hover:text-lightest-slate"
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-red-500">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate">Confirm New Password</label>
                <div className="relative">
                  <Input
                    {...passwordForm.register('confirmPassword')}
                    type={showPasswords.confirm ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    className="pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate hover:text-lightest-slate"
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Email Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Change Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={emailForm.handleSubmit(handleEmailUpdate)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-slate">New Email Address</label>
                <Input
                  {...emailForm.register('newEmail')}
                  type="email"
                  placeholder="Enter new email"
                  disabled={isLoading}
                />
                {emailForm.formState.errors.newEmail && (
                  <p className="text-sm text-red-500">
                    {emailForm.formState.errors.newEmail.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate">Confirm New Email</label>
                <Input
                  {...emailForm.register('confirmEmail')}
                  type="email"
                  placeholder="Confirm new email"
                  disabled={isLoading}
                />
                {emailForm.formState.errors.confirmEmail && (
                  <p className="text-sm text-red-500">
                    {emailForm.formState.errors.confirmEmail.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Email'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-lightest-slate mb-2">
                Delete Account
              </h3>
              <p className="text-slate mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              
              {!showDeleteConfirm ? (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </Button>
              ) : (
                <div className="space-y-4">
                  <Alert className="border-red-500/20 bg-red-500/5">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-red-500">
                      Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      {isLoading ? 'Deleting...' : 'Yes, Delete Account'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountManagement;
