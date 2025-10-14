import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Phone, 
  Mail, 
  MapPin,
  Calendar,
  User,
  Tag,
  MessageCircle,
  HelpCircle,
  Bug,
  CreditCard,
  Settings,
  Star,
  ThumbsUp,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const supportTicketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(20, 'Message must be at least 20 characters'),
  category: z.string().min(1, 'Please select a category'),
  priority: z.string().min(1, 'Please select a priority'),
});

const SupportTickets = () => {
  const { user } = useAuth();
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('new');

  const form = useForm({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: {
      subject: '',
      message: '',
      category: '',
      priority: 'medium',
    },
  });

  // Fetch user's tickets
  const fetchTickets = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load support tickets.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const onSubmit = async (data) => {
    if (!user) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: data.subject,
          message: data.message,
          category: data.category,
          priority: data.priority,
          user_email: user.email,
          user_name: user.user_metadata?.full_name || user.email,
        });

      if (error) throw error;

      toast({
        title: 'Support ticket submitted',
        description: 'We\'ll get back to you within 24 hours.',
      });

      form.reset();
      fetchTickets();
      setActiveTab('tickets');
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit support ticket. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-slate" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'in_progress':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'resolved':
        return 'bg-green-500/20 text-green-500 border-green-500/30';
      default:
        return 'bg-slate/20 text-slate border-slate/30';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'bug':
        return <Bug className="h-4 w-4" />;
      case 'feature':
        return <Star className="h-4 w-4" />;
      case 'billing':
        return <CreditCard className="h-4 w-4" />;
      case 'account':
        return <User className="h-4 w-4" />;
      case 'technical':
        return <Settings className="h-4 w-4" />;
      default:
        return <HelpCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-lightest-slate flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Support & Help
        </h2>
        <p className="text-slate mt-1">
          Get help with your account, report issues, or request new features.
        </p>
      </div>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-teal" />
                <div>
                  <p className="text-lightest-slate font-medium">Email Support</p>
                  <p className="text-slate text-sm">johnowolabi80@gmail.com</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-teal" />
                <div>
                  <p className="text-lightest-slate font-medium">Phone Support</p>
                  <p className="text-slate text-sm">+1 (555) 123-4567</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-teal" />
                <div>
                  <p className="text-lightest-slate font-medium">Support Hours</p>
                  <p className="text-slate text-sm">Mon-Fri: 9AM-6PM EST</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-teal" />
                <div>
                  <p className="text-lightest-slate font-medium">Response Time</p>
                  <p className="text-slate text-sm">Within 24 hours</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <ThumbsUp className="h-5 w-5 text-teal" />
                <div>
                  <p className="text-lightest-slate font-medium">Satisfaction</p>
                  <p className="text-slate text-sm">99% customer satisfaction</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <ExternalLink className="h-5 w-5 text-teal" />
                <div>
                  <p className="text-lightest-slate font-medium">Documentation</p>
                  <a href="#" className="text-teal text-sm hover:underline">View Help Center</a>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support Tabs */}
      <div className="flex space-x-1 bg-light-navy/30 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('new')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'new'
              ? 'bg-teal text-deep-navy'
              : 'text-slate hover:text-lightest-slate'
          }`}
        >
          New Ticket
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'tickets'
              ? 'bg-teal text-deep-navy'
              : 'text-slate hover:text-lightest-slate'
          }`}
        >
          My Tickets ({tickets.length})
        </button>
      </div>

      {/* New Ticket Form */}
      {activeTab === 'new' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Submit Support Ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="general">
                              <div className="flex items-center gap-2">
                                <HelpCircle className="h-4 w-4" />
                                General Question
                              </div>
                            </SelectItem>
                            <SelectItem value="bug">
                              <div className="flex items-center gap-2">
                                <Bug className="h-4 w-4" />
                                Bug Report
                              </div>
                            </SelectItem>
                            <SelectItem value="feature">
                              <div className="flex items-center gap-2">
                                <Star className="h-4 w-4" />
                                Feature Request
                              </div>
                            </SelectItem>
                            <SelectItem value="billing">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                Billing Issue
                              </div>
                            </SelectItem>
                            <SelectItem value="account">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Account Issue
                              </div>
                            </SelectItem>
                            <SelectItem value="technical">
                              <div className="flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                Technical Support
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Brief description of your issue"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Please provide detailed information about your issue, including steps to reproduce if it's a bug..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please provide as much detail as possible. This helps us resolve your issue faster.
                  </AlertDescription>
                </Alert>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Ticket
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* My Tickets */}
      {activeTab === 'tickets' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              My Support Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal"></div>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-slate/50 mx-auto mb-4" />
                <p className="text-slate">No support tickets yet.</p>
                <p className="text-slate text-sm">Submit your first ticket using the form above.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-lightest-navy/20 rounded-lg p-4 hover:bg-light-navy/20 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getCategoryIcon(ticket.category)}
                          <h3 className="text-lightest-slate font-medium">{ticket.subject}</h3>
                          <Badge className={getStatusColor(ticket.status)}>
                            {getStatusIcon(ticket.status)}
                            <span className="ml-1 capitalize">{ticket.status.replace('_', ' ')}</span>
                          </Badge>
                        </div>
                        
                        <p className="text-slate text-sm mb-3 line-clamp-2">
                          {ticket.message}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-slate">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {ticket.category}
                          </div>
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {ticket.priority}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SupportTickets;
