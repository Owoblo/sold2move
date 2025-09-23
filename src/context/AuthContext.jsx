import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('sold2move_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('sold2move_user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (email, password) => {
    try {
      const users = JSON.parse(localStorage.getItem('sold2move_users') || '[]');
      const foundUser = users.find(u => u.email === email && u.password === password);
      
      if (foundUser) {
        const userData = { email: foundUser.email, name: foundUser.name };
        setUser(userData);
        localStorage.setItem('sold2move_user', JSON.stringify(userData));
        toast({
          title: '✅ Login Successful!',
          description: `Welcome back, ${userData.name}!`,
          className: 'bg-green text-deep-navy',
        });
        return true;
      } else {
        toast({
          title: '❌ Login Failed',
          description: 'Invalid email or password. Please try again.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: '❌ Error',
        description: 'An unexpected error occurred during login.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const signup = (name, email, password) => {
    try {
      const users = JSON.parse(localStorage.getItem('sold2move_users') || '[]');
      const userExists = users.some(u => u.email === email);

      if (userExists) {
        toast({
          title: '❌ Sign Up Failed',
          description: 'An account with this email already exists.',
          variant: 'destructive',
        });
        return false;
      }

      const newUser = { name, email, password };
      const newUsers = [...users, newUser];
      localStorage.setItem('sold2move_users', JSON.stringify(newUsers));

      const userData = { email: newUser.email, name: newUser.name };
      setUser(userData);
      localStorage.setItem('sold2move_user', JSON.stringify(userData));

      toast({
        title: '✅ Sign Up Successful!',
        description: `Welcome, ${userData.name}! Your account has been created.`,
        className: 'bg-green text-deep-navy',
      });
      return true;

    } catch (error) {
      console.error("Signup error:", error);
       toast({
        title: '❌ Error',
        description: 'An unexpected error occurred during sign up.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sold2move_user');
    toast({
      title: '👋 Logged Out',
      description: 'You have been successfully logged out.',
    });
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};