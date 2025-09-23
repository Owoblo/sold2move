import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Mail, AlertTriangle, Filter, MapPin, Building, Globe, Eye, Lock, ZapOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useProfile } from '@/hooks/useProfile.jsx';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Pagination } from '@/components/ui/pagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Country, State } from 'country-state-city';
import { Link } from 'react-router-dom';
import LoadingButton from '@/components/ui/LoadingButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

const LISTINGS_PER_PAGE = 15;

const DashboardPage = () => {
  const { toast } = useToast();
  const supabase = useSupabaseClient();
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const [listings, setListings] = useState([]);
  const [revealedListings, setRevealedListings] = useState(new Set());
  const [listingsLoading, setListingsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [revealingId, setRevealingId] = useState(null);

  const fetchRevealedListings = useCallback(async () => {
    if (!profile) return;
    const { data, error } = await supabase.from('listing_reveals').select('listing_id').eq('user_id', profile.id);
    if (!error) {
      setRevealedListings(new Set(data.map(r => r.listing_id)));
    }
  }, [supabase, profile]);

  const fetchListings = useCallback(async (page, userProfile) => {
    if (!userProfile || !userProfile.onboarding_complete) {
      setListingsLoading(false);
      return;
    }
    setListingsLoading(true);
    setError(null);
    try {
      const from = (page - 1) * LISTINGS_PER_PAGE;
      const to = from + LISTINGS_PER_PAGE - 1;
      let query = supabase.from('listings1').select('id, address, createDat, price, pgapt', { count: 'exact' });
      if (userProfile.state_code) query = query.eq('addressState', userProfile.state_code);
      if (userProfile.city_name) query = query.eq('addressCity', userProfile.city_name);
      const { data, error, count } = await query.order('createDat', { ascending: false }).range(from, to);
      if (error) throw error;
      setListings(data);
      setTotalPages(Math.ceil(count / LISTINGS_PER_PAGE));
    } catch (err) {
      setError(err.message);
      toast({ variant: "destructive", title: "Error fetching listings", description: err.message });
    } finally {
      setListingsLoading(false);
    }
  }, [toast, supabase]);

  useEffect(() => {
    if (profile) {
      fetchListings(currentPage, profile);
      fetchRevealedListings();
    } else if (!profileLoading) {
      setListingsLoading(false);
    }
  }, [fetchListings, currentPage, profile, profileLoading, fetchRevealedListings]);
  
  const handleReveal = async (listingId) => {
    setRevealingId(listingId);
    try {
      const { data, error } = await supabase.rpc('reveal_listing', { p_listing_id: listingId });
      if (error) throw error;
      if (data.ok) {
        toast({ title: "Address Revealed!", description: data.already_revealed ? "You've already revealed this address." : "1 credit has been deducted." });
        setRevealedListings(prev => new Set(prev).add(listingId));
        if (!data.already_revealed && !data.unlimited) {
          refreshProfile();
        }
      } else if (data.error === 'insufficient_credits') {
        toast({ variant: 'destructive', title: "Insufficient Credits", description: "Please purchase more credits to reveal this address." });
      } else {
        throw new Error(data.error || 'An unknown error occurred.');
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Reveal Failed", description: err.message });
    } finally {
      setRevealingId(null);
    }
  };


  const handlePageChange = (newPage) => setCurrentPage(newPage);
  const handleActionClick = (action) => toast({ title: `🚧 ${action}`, description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀" });
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
  const formatPrice = (price) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(price) || 0);

  const LocationDisplay = () => {
    if (profileLoading) return <SkeletonLoader className="h-6 w-3/4" />;
    if (!profile) return null;
    const { city_name, state_code, country_code } = profile;
    if (!city_name || !state_code || !country_code) return <p className="text-amber-400">Please complete your profile to see filtered listings.</p>;
    const countryName = Country.getCountryByCode(country_code)?.name;
    const stateName = State.getStateByCodeAndCountry(state_code, country_code)?.name;
    return (
      <div className="flex items-center gap-4 text-slate">
        <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-green" /><span>{countryName}</span></div>
        <div className="flex items-center gap-2"><Building className="h-4 w-4 text-green" /><span>{stateName}</span></div>
        <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-green" /><span>{city_name}</span></div>
      </div>
    );
  };
  
  const OutOfCredits = () => (
    <TableRow>
      <TableCell colSpan={5} className="h-[400px]">
        <div className="flex flex-col items-center justify-center gap-4 text-slate h-full">
          <ZapOff className="h-12 w-12 text-red-500" />
          <h3 className="text-xl font-bold text-lightest-slate">You've run out of credits!</h3>
          <p>To continue revealing new leads, please top up your credits or upgrade your plan.</p>
          <div className="flex gap-4 mt-2">
            <Button asChild className="bg-green text-deep-navy hover:bg-green/90"><Link to="/pricing#top-up">Buy Credits</Link></Button>
            <Button asChild variant="outline"><Link to="/pricing">Upgrade Plan</Link></Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
  
  const TableSkeleton = () => (
    [...Array(10)].map((_, index) => (
      <TableRow key={index}>
        <TableCell><SkeletonLoader className="h-5 w-48" /></TableCell>
        <TableCell><SkeletonLoader className="h-5 w-24" /></TableCell>
        <TableCell><SkeletonLoader className="h-5 w-20" /></TableCell>
        <TableCell><SkeletonLoader className="h-5 w-28" /></TableCell>
        <TableCell className="text-right"><SkeletonLoader className="h-8 w-32 ml-auto" /></TableCell>
      </TableRow>
    ))
  );

  const creditsRemaining = profile?.credits_remaining ?? 0;
  const isUnlimited = profile?.unlimited ?? false;
  const outOfCredits = !isUnlimited && creditsRemaining <= 0;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-lightest-slate font-heading">Welcome, {profile?.company_name || 'Mover'}!</h1>
          <p className="text-lg text-slate mt-2">Here are your latest real-time leads.</p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button onClick={() => handleActionClick('Export CSV')} variant="outline" className="border-green text-green hover:bg-green/10 hover:text-green"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
          <Button onClick={() => handleActionClick('Generate Mail Pack')} className="bg-green text-deep-navy hover:bg-green/90"><Mail className="mr-2 h-4 w-4" /> Generate Mail Pack</Button>
        </div>
      </div>
      
      <Card className="mb-8 bg-light-navy border-lightest-navy/20">
        <CardHeader><CardTitle className="flex items-center gap-2 text-xl text-lightest-slate"><Filter className="h-5 w-5 text-green" />Your Active Service Area</CardTitle></CardHeader>
        <CardContent><LocationDisplay /></CardContent>
      </Card>

      <div className="bg-light-navy rounded-lg overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Address</TableHead><TableHead>Sold Date</TableHead><TableHead>Price</TableHead><TableHead>Property Type</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {profileLoading || listingsLoading ? (
              <TableSkeleton />
            ) : error ? (
              <TableRow><TableCell colSpan={5} className="text-center h-64"><div className="flex justify-center items-center gap-2 text-red-500"><AlertTriangle className="h-5 w-5" /><span>Error: {error}</span></div></TableCell></TableRow>
            ) : listings.length > 0 && outOfCredits ? (
                <OutOfCredits />
            ) : listings.length > 0 ? (
              listings.map((lead) => {
                const isRevealed = revealedListings.has(lead.id);
                return (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium text-lightest-slate">{isRevealed ? lead.address : '***** ******* **'}</TableCell>
                    <TableCell>{formatDate(lead.createDat)}</TableCell>
                    <TableCell>{formatPrice(lead.price)}</TableCell>
                    <TableCell>{lead.pgapt || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      {isRevealed ? (
                        <Button variant="ghost" size="sm" className="text-green cursor-default"><Eye className="mr-2 h-4 w-4" />Revealed</Button>
                      ) : (
                        <LoadingButton variant="outline" size="sm" isLoading={revealingId === lead.id} onClick={() => handleReveal(lead.id)}>
                           <Lock className="mr-2 h-4 w-4" />
                          Reveal (1 credit)
                        </LoadingButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow><TableCell colSpan={5} className="text-center h-64 text-slate">{profile?.onboarding_complete ? "No listings found for your service area." : <Link to="/onboarding" className="underline">Please complete your profile to view listings.</Link>}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        {!(listings.length > 0 && outOfCredits) && totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />}
      </div>
    </div>
  );
};

export default DashboardPage;