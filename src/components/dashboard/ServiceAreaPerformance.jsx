import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  MapPin, 
  Building, 
  Users, 
  DollarSign,
  Calendar,
  Eye,
  Download,
  RefreshCw,
  Target,
  Activity
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { motion } from 'framer-motion';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';

const ServiceAreaPerformance = () => {
  const { profile } = useProfile();
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('listings');

  useEffect(() => {
    fetchPerformanceData();
  }, [profile, timeRange, selectedMetric]);

  const fetchPerformanceData = async () => {
    if (!profile?.service_cities || profile.service_cities.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const performancePromises = profile.service_cities.map(async (city) => {
        try {
          // Fetch just listed data for this city
          const { data: justListedData, count: justListedCount } = await supabase
            .from('just_listed')
            .select('*', { count: 'exact' })
            .or(`lastcity.eq.${city},addresscity.eq.${city}`)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

          // Fetch sold listings data for this city
          const { data: soldData, count: soldCount } = await supabase
            .from('sold_listings')
            .select('*', { count: 'exact' })
            .or(`lastcity.eq.${city},addresscity.eq.${city}`)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

          // Calculate average price for just listed
          const avgJustListedPrice = justListedData?.length > 0 
            ? justListedData.reduce((sum, listing) => sum + (listing.unformattedprice || 0), 0) / justListedData.length
            : 0;

          // Calculate average price for sold
          const avgSoldPrice = soldData?.length > 0 
            ? soldData.reduce((sum, listing) => sum + (listing.unformattedprice || 0), 0) / soldData.length
            : 0;

          // Calculate price change percentage
          const priceChange = avgSoldPrice > 0 && avgJustListedPrice > 0 
            ? ((avgJustListedPrice - avgSoldPrice) / avgSoldPrice) * 100
            : 0;

          return {
            city,
            justListedCount: justListedCount || 0,
            soldCount: soldCount || 0,
            avgJustListedPrice,
            avgSoldPrice,
            priceChange,
            totalListings: (justListedCount || 0) + (soldCount || 0),
            marketActivity: (justListedCount || 0) + (soldCount || 0)
          };
        } catch (error) {
          console.error(`Error fetching data for ${city}:`, error);
          return {
            city,
            justListedCount: 0,
            soldCount: 0,
            avgJustListedPrice: 0,
            avgSoldPrice: 0,
            priceChange: 0,
            totalListings: 0,
            marketActivity: 0
          };
        }
      });

      const results = await Promise.all(performancePromises);
      
      // Sort by selected metric
      const sortedResults = results.sort((a, b) => {
        switch (selectedMetric) {
          case 'listings':
            return b.totalListings - a.totalListings;
          case 'price':
            return b.avgJustListedPrice - a.avgJustListedPrice;
          case 'activity':
            return b.marketActivity - a.marketActivity;
          default:
            return b.totalListings - a.totalListings;
        }
      });

      setPerformanceData(sortedResults);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      toast({
        variant: "destructive",
        title: "Error Loading Data",
        description: "Failed to load service area performance data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMetricValue = (data) => {
    switch (selectedMetric) {
      case 'listings':
        return data.totalListings;
      case 'price':
        return data.avgJustListedPrice;
      case 'activity':
        return data.marketActivity;
      default:
        return data.totalListings;
    }
  };

  const getMetricLabel = () => {
    switch (selectedMetric) {
      case 'listings':
        return 'Total Listings';
      case 'price':
        return 'Avg Price';
      case 'activity':
        return 'Market Activity';
      default:
        return 'Total Listings';
    }
  };

  const formatMetricValue = (value) => {
    switch (selectedMetric) {
      case 'price':
        return `$${Math.round(value).toLocaleString()}`;
      case 'listings':
      case 'activity':
        return value.toLocaleString();
      default:
        return value.toLocaleString();
    }
  };

  const getPerformanceColor = (data) => {
    const value = getMetricValue(data);
    const maxValue = Math.max(...performanceData.map(d => getMetricValue(d)));
    const percentage = (value / maxValue) * 100;
    
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <Card className="bg-light-navy border-border">
        <CardHeader>
          <CardTitle className="text-xl text-lightest-slate flex items-center gap-2">
            <BarChart3 className="text-teal" />
            Service Area Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile?.service_cities || profile.service_cities.length === 0) {
    return (
      <Card className="bg-light-navy border-border">
        <CardHeader>
          <CardTitle className="text-xl text-lightest-slate flex items-center gap-2">
            <BarChart3 className="text-teal" />
            Service Area Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-slate/50" />
            <p className="text-lg font-medium mb-2">No Service Areas Configured</p>
            <p className="text-sm mb-4">
              Configure your service areas in settings to see performance analytics.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard/settings">
                <Settings className="h-4 w-4 mr-2" />
                Configure Service Areas
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-light-navy border-border">
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <CardTitle className="text-xl text-lightest-slate flex items-center gap-2">
            <BarChart3 className="text-teal" />
            Service Area Performance
          </CardTitle>
          
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="listings">Total Listings</SelectItem>
                <SelectItem value="price">Average Price</SelectItem>
                <SelectItem value="activity">Market Activity</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPerformanceData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {performanceData.length === 0 ? (
          <div className="text-center py-8 text-slate">
            <Activity className="h-12 w-12 mx-auto mb-4 text-slate/50" />
            <p className="text-lg font-medium mb-2">No Data Available</p>
            <p className="text-sm">
              No listings found for your service areas in the selected time range.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Performance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-lightest-navy/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="h-4 w-4 text-teal" />
                  <span className="text-sm text-slate">Total Cities</span>
                </div>
                <div className="text-2xl font-bold text-lightest-slate">
                  {performanceData.length}
                </div>
              </div>
              
              <div className="bg-lightest-navy/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-teal" />
                  <span className="text-sm text-slate">Total Listings</span>
                </div>
                <div className="text-2xl font-bold text-lightest-slate">
                  {performanceData.reduce((sum, data) => sum + data.totalListings, 0).toLocaleString()}
                </div>
              </div>
              
              <div className="bg-lightest-navy/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-teal" />
                  <span className="text-sm text-slate">Avg Price</span>
                </div>
                <div className="text-2xl font-bold text-lightest-slate">
                  ${Math.round(
                    performanceData.reduce((sum, data) => sum + data.avgJustListedPrice, 0) / performanceData.length
                  ).toLocaleString()}
                </div>
              </div>
            </div>

            {/* City Performance Chart */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-lightest-slate flex items-center gap-2">
                <MapPin className="h-5 w-5 text-teal" />
                Performance by City
              </h3>
              
              {performanceData.map((data, index) => (
                <motion.div
                  key={data.city}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-lightest-navy/20 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-teal border-teal">
                        #{index + 1}
                      </Badge>
                      <h4 className="font-semibold text-lightest-slate">{data.city}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-lightest-slate">
                        {formatMetricValue(getMetricValue(data))}
                      </div>
                      <div className="text-xs text-slate">{getMetricLabel()}</div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-lightest-navy/30 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${getPerformanceColor(data)}`}
                      style={{
                        width: `${(getMetricValue(data) / Math.max(...performanceData.map(d => getMetricValue(d)))) * 100}%`
                      }}
                    />
                  </div>
                  
                  {/* Detailed Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-blue-400" />
                      <div>
                        <div className="text-lightest-slate font-medium">{data.justListedCount}</div>
                        <div className="text-slate text-xs">Just Listed</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-400" />
                      <div>
                        <div className="text-lightest-slate font-medium">{data.soldCount}</div>
                        <div className="text-slate text-xs">Sold</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-yellow-400" />
                      <div>
                        <div className="text-lightest-slate font-medium">
                          ${Math.round(data.avgJustListedPrice).toLocaleString()}
                        </div>
                        <div className="text-slate text-xs">Avg Price</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {data.priceChange >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                      <div>
                        <div className={`font-medium ${data.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {data.priceChange >= 0 ? '+' : ''}{data.priceChange.toFixed(1)}%
                        </div>
                        <div className="text-slate text-xs">Price Change</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceAreaPerformance;
