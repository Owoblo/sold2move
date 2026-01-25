import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Loader2,
  FileText,
  Users,
  DollarSign,
  Calendar,
  ChevronRight,
  Inbox,
  TrendingUp,
  Package
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useWallet } from '@/hooks/useWallet';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20', icon: FileText },
  pending: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Loader2 },
  printing: { label: 'Printing', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: Package },
  mailed: { label: 'Mailed', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: Send },
  delivered: { label: 'Delivered', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', icon: AlertCircle },
};

const Mailing = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { user } = useAuth();
  const { formattedBalance } = useWallet();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    totalSpent: 0,
    totalRecipients: 0,
  });

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCampaigns(data || []);

      // Calculate stats
      const totalSpent = (data || []).reduce((sum, c) => sum + parseFloat(c.total_cost || 0), 0);
      const totalRecipients = (data || []).reduce((sum, c) => sum + (c.recipient_count || 0), 0);
      const active = (data || []).filter(c => ['pending', 'processing', 'printing'].includes(c.status)).length;
      const completed = (data || []).filter(c => ['mailed', 'delivered'].includes(c.status)).length;

      setStats({
        total: (data || []).length,
        active,
        completed,
        totalSpent,
        totalRecipients,
      });
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={config.color}>
        <Icon className={`h-3 w-3 mr-1 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>Mailing Campaigns</h1>
          <p style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
            Create and manage your direct mail campaigns
          </p>
        </div>
        <Link to="/dashboard/campaigns/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Total Campaigns</p>
              <p className="text-2xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>{stats.total}</p>
            </div>
            <div className="p-3 rounded-full" style={{ backgroundColor: isLight ? 'rgba(5, 150, 105, 0.1)' : 'rgba(0, 255, 136, 0.1)' }}>
              <Mail className="h-5 w-5" style={{ color: isLight ? '#059669' : '#00FF88' }} />
            </div>
          </div>
        </div>
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Active</p>
              <p className="text-2xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>{stats.active}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-500/10">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Total Recipients</p>
              <p className="text-2xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>{stats.totalRecipients.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-full bg-green-500/10">
              <Users className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </div>
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Total Spent</p>
              <p className="text-2xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>${stats.totalSpent.toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-full bg-purple-500/10">
              <DollarSign className="h-5 w-5 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Banner */}
      <div
        className="rounded-2xl py-4 px-6"
        style={{
          background: isLight
            ? 'linear-gradient(to right, rgba(5, 150, 105, 0.1), rgba(5, 150, 105, 0.05))'
            : 'linear-gradient(to right, rgba(0, 255, 136, 0.1), rgba(0, 255, 136, 0.05))',
          border: isLight ? '1px solid rgba(5, 150, 105, 0.2)' : '1px solid rgba(0, 255, 136, 0.2)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full" style={{ backgroundColor: isLight ? 'rgba(5, 150, 105, 0.1)' : 'rgba(0, 255, 136, 0.1)' }}>
              <DollarSign className="h-5 w-5" style={{ color: isLight ? '#059669' : '#00FF88' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Wallet Balance</p>
              <p className="text-xl font-bold" style={{ color: isLight ? '#059669' : '#00FF88' }}>{formattedBalance}</p>
            </div>
          </div>
          <Link to="/dashboard/wallet">
            <Button variant="outline" size="sm" className="gap-2">
              Add Funds
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="printing">Printing</SelectItem>
                <SelectItem value="mailed">Mailed</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Campaigns</CardTitle>
          <CardDescription>
            {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first direct mail campaign to reach homeowners
              </p>
              <Link to="/dashboard/campaigns/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {campaign.template_type || 'Postcard'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {campaign.recipient_count?.toLocaleString() || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          ${parseFloat(campaign.total_cost || 0).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDate(campaign.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Download Recipients</DropdownMenuItem>
                            {campaign.status === 'draft' && (
                              <DropdownMenuItem className="text-destructive">
                                Delete Campaign
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link to="/dashboard/campaigns/new">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Create Campaign</h3>
                  <p className="text-sm text-muted-foreground">
                    Start a new direct mail campaign
                  </p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link to="/dashboard/wallet">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <DollarSign className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Add Funds</h3>
                  <p className="text-sm text-muted-foreground">
                    Top up your wallet balance
                  </p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link to="/dashboard/sample-mailers">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-500/10">
                  <FileText className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold">View Templates</h3>
                  <p className="text-sm text-muted-foreground">
                    Browse mail templates
                  </p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
};

export default Mailing;
