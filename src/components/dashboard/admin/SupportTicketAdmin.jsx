import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Mail, 
  Calendar,
  Tag,
  MessageCircle,
  Bug,
  Star,
  CreditCard,
  Settings,
  HelpCircle,
  Eye,
  Edit,
  Reply
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';

const SupportTicketAdmin = () => {
  const { user } = useAuth();
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Check if user is admin
  const isAdmin = user?.email === 'johnowolabi80@gmail.com';

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-lightest-slate mb-2">Access Denied</h3>
          <p className="text-slate">This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  // Fetch all tickets
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
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
  }, []);

  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      const updateData = { status: newStatus };
      
      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        updateData.admin_user_id = user.id;
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Ticket updated',
        description: `Ticket status changed to ${newStatus}.`,
      });

      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update ticket status.',
      });
    }
  };

  const addAdminNotes = async (ticketId) => {
    if (!adminNotes.trim()) return;

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          admin_notes: adminNotes,
          admin_user_id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Notes added',
        description: 'Admin notes have been saved.',
      });

      setAdminNotes('');
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, admin_notes: adminNotes });
      }
    } catch (error) {
      console.error('Error adding notes:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add admin notes.',
      });
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

  const filteredTickets = tickets.filter(ticket => {
    const statusMatch = statusFilter === 'all' || ticket.status === statusFilter;
    const categoryMatch = categoryFilter === 'all' || ticket.category === categoryFilter;
    return statusMatch && categoryMatch;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-lightest-slate flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Support Ticket Management
        </h2>
        <p className="text-slate mt-1">
          Manage and respond to customer support tickets.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate">Total Tickets</p>
                <p className="text-2xl font-bold text-lightest-slate">{stats.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-teal" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate">Open</p>
                <p className="text-2xl font-bold text-blue-500">{stats.open}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate">In Progress</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.inProgress}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate">Resolved</p>
                <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm text-slate mb-2 block">Status Filter</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm text-slate mb-2 block">Category Filter</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="account">Account</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets List */}
        <Card>
          <CardHeader>
            <CardTitle>Support Tickets ({filteredTickets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal"></div>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-slate/50 mx-auto mb-4" />
                <p className="text-slate">No tickets found.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredTickets.map((ticket) => (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedTicket?.id === ticket.id
                        ? 'border-teal bg-teal/10'
                        : 'border-lightest-navy/20 hover:bg-light-navy/20'
                    }`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getCategoryIcon(ticket.category)}
                          <h4 className="text-lightest-slate font-medium text-sm">
                            {ticket.subject}
                          </h4>
                          <Badge className={`${getStatusColor(ticket.status)} text-xs`}>
                            {getStatusIcon(ticket.status)}
                            <span className="ml-1 capitalize">{ticket.status.replace('_', ' ')}</span>
                          </Badge>
                        </div>
                        
                        <p className="text-slate text-xs mb-2 line-clamp-2">
                          {ticket.message}
                        </p>
                        
                        <div className="flex items-center gap-3 text-xs text-slate">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {ticket.user_name || ticket.user_email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(ticket.created_at).toLocaleDateString()}
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

        {/* Ticket Details */}
        <Card>
          <CardHeader>
            <CardTitle>Ticket Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTicket ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {getCategoryIcon(selectedTicket.category)}
                    <h3 className="text-lightest-slate font-medium">{selectedTicket.subject}</h3>
                    <Badge className={getStatusColor(selectedTicket.status)}>
                      {getStatusIcon(selectedTicket.status)}
                      <span className="ml-1 capitalize">{selectedTicket.status.replace('_', ' ')}</span>
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-slate">User</p>
                      <p className="text-lightest-slate">{selectedTicket.user_name || selectedTicket.user_email}</p>
                    </div>
                    <div>
                      <p className="text-slate">Email</p>
                      <p className="text-lightest-slate">{selectedTicket.user_email}</p>
                    </div>
                    <div>
                      <p className="text-slate">Category</p>
                      <p className="text-lightest-slate capitalize">{selectedTicket.category}</p>
                    </div>
                    <div>
                      <p className="text-slate">Priority</p>
                      <p className="text-lightest-slate capitalize">{selectedTicket.priority}</p>
                    </div>
                    <div>
                      <p className="text-slate">Created</p>
                      <p className="text-lightest-slate">{new Date(selectedTicket.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate">Updated</p>
                      <p className="text-lightest-slate">{new Date(selectedTicket.updated_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lightest-slate font-medium mb-2">Message</h4>
                  <div className="bg-light-navy/30 rounded-lg p-3 text-sm text-slate">
                    {selectedTicket.message}
                  </div>
                </div>

                {selectedTicket.admin_notes && (
                  <div>
                    <h4 className="text-lightest-slate font-medium mb-2">Admin Notes</h4>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm text-slate">
                      {selectedTicket.admin_notes}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-lightest-slate font-medium mb-2">Admin Notes</h4>
                  <Textarea
                    placeholder="Add internal notes about this ticket..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="mb-2"
                  />
                  <Button
                    onClick={() => addAdminNotes(selectedTicket.id)}
                    disabled={!adminNotes.trim()}
                    size="sm"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Add Notes
                  </Button>
                </div>

                <div>
                  <h4 className="text-lightest-slate font-medium mb-2">Update Status</h4>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateTicketStatus(selectedTicket.id, 'open')}
                      variant={selectedTicket.status === 'open' ? 'default' : 'outline'}
                      size="sm"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Open
                    </Button>
                    <Button
                      onClick={() => updateTicketStatus(selectedTicket.id, 'in_progress')}
                      variant={selectedTicket.status === 'in_progress' ? 'default' : 'outline'}
                      size="sm"
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      In Progress
                    </Button>
                    <Button
                      onClick={() => updateTicketStatus(selectedTicket.id, 'resolved')}
                      variant={selectedTicket.status === 'resolved' ? 'default' : 'outline'}
                      size="sm"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Resolve
                    </Button>
                  </div>
                </div>

                <div>
                  <Button
                    onClick={() => window.open(`mailto:${selectedTicket.user_email}?subject=Re: ${selectedTicket.subject}`, '_blank')}
                    className="w-full"
                  >
                    <Reply className="h-4 w-4 mr-2" />
                    Reply via Email
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Eye className="h-12 w-12 text-slate/50 mx-auto mb-4" />
                <p className="text-slate">Select a ticket to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupportTicketAdmin;
