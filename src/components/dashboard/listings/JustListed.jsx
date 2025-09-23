import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { fetchJustListed, fetchRevealedListings } from '@/lib/queries';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { AlertCircle, Download, Eye, Zap } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useProfile } from '@/hooks/useProfile.jsx';
import { Pagination } from '@/components/ui/pagination';
import { exportToCSV } from '@/lib/csvExporter';
import toast from '@/lib/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import LoadingButton from '@/components/ui/LoadingButton';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

const PAGE_SIZE = 20;

const JustListed = ({ filters }) => {
  const navigate = useNavigate();
  const [pagedListings, setPagedListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [revealedIds, setRevealedIds] = useState(new Set());
  const [isRevealing, setIsRevealing] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const fetchRevealedStatus = useCallback(async (listingIds) => {
    if (!profile || listingIds.length === 0) return;
    try {
      const revealed = await fetchRevealedListings(profile.id, listingIds);
      setRevealedIds(new Set(revealed.map(r => r.listing_id)));
    } catch (err) {
      console.error("Error fetching revealed status:", err);
    }
  }, [profile]);

  const fetchListingsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!profile) {
        if (!profileLoading) {
            setError("Profile not loaded. Please set your service area in Settings.");
        }
        setLoading(false);
        return;
      }

      const { data: runsData, error: runsError } = await supabase
        .from('runs')
        .select('id')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (runsError || !runsData) {
        throw new Error(runsError?.message || 'Could not fetch the latest run ID.');
      }

      const currentRunId = runsData.id;
      const { data, count } = await fetchJustListed(currentRunId, profile.city_name, currentPage, PAGE_SIZE, filters);
      
      setPagedListings(data);
      setTotalPages(Math.ceil(count / PAGE_SIZE));
      if (data.length > 0) {
        await fetchRevealedStatus(data.map(l => l.id));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [profile, profileLoading, filters, currentPage, fetchRevealedStatus]);

  useEffect(() => {
    if (!profileLoading) {
      fetchListingsData();
    }
  }, [profileLoading, fetchListingsData]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  
  const handleExport = () => {
    if (pagedListings.length === 0) {
      toast.error("Export Failed", "No listings on this page to export.");
      return;
    }
    const dataToExport = pagedListings.map(({ id, addressStreet, addressCity, price, beds, baths, area, statusText }) => ({
      Address: revealedIds.has(id) ? addressStreet : '*****',
      City: addressCity,
      Price: price,
      Beds: beds,
      Baths: baths,
      'Sq. Ft.': area,
      'Property Type': statusText,
    }));
    exportToCSV(dataToExport, `just-listed-page-${currentPage}-${profile?.city_name || 'export'}-${new Date().toLocaleDateString()}.csv`);
    toast.success("Export Successful", "Your CSV file has been downloaded.");
  };

  const handleRowClick = (listingId) => {
    navigate(`/dashboard/listings/property/${listingId}`);
  };

  const handleReveal = async (listingId, e) => {
    e.stopPropagation();
    if (profile?.unlimited || revealedIds.has(listingId)) {
        handleRowClick(listingId);
        return;
    }

    setIsRevealing(listingId);
    try {
      const { data, error } = await supabase.rpc('reveal_listing', { p_listing_id: listingId });
      
      if (error) throw error;
      
      if (data.ok) {
        setRevealedIds(prev => new Set(prev).add(listingId));
        await refreshProfile();
        toast.success("Address Revealed!", "1 credit has been deducted.");
        handleRowClick(listingId);
      } else if (data.error === 'insufficient_credits') {
        setShowUpgradeModal(true);
      } else {
        toast.error('Reveal Failed', 'Could not reveal address. Please try again.');
      }
    } catch (err) {
      toast.error('Reveal Failed', err.message || 'An error occurred during reveal.');
    } finally {
      setIsRevealing(null);
    }
  };


  if (loading || profileLoading) {
    return (
      <Card className="bg-light-navy border-border">
        <CardHeader className="flex flex-row items-center justify-between">
            <SkeletonLoader className="h-8 w-1/3" />
            <SkeletonLoader className="h-9 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(PAGE_SIZE)].map((_, i) => <SkeletonLoader key={i} className="h-12 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-light-navy/30 rounded-lg">
        <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
        <p className="text-lightest-slate font-semibold">Failed to load listings</p>
        <p className="text-slate text-sm">{error}</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Helmet>
        <title>Just Listed Properties | Sold2Move</title>
        <meta name="description" content="View the most recently listed properties to find new moving leads." />
      </Helmet>
      <Card className="bg-light-navy border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lightest-slate">
            Just Listed Properties {profile?.city_name && `in ${profile.city_name}`}
          </CardTitle>
          <LoadingButton variant="outline" size="sm" onClick={handleExport} disabled={pagedListings.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export Page to CSV
          </LoadingButton>
        </CardHeader>
        <CardContent>
          {pagedListings.length === 0 ? (
            <p className="text-slate text-center py-8">No just-listed properties found matching your criteria. Make sure your service area is set in Settings.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-border hover:bg-transparent">
                      <TableHead className="text-slate">Address</TableHead>
                      <TableHead className="text-slate">City</TableHead>
                      <TableHead className="text-slate">Price</TableHead>
                      <TableHead className="text-slate">Beds</TableHead>
                      <TableHead className="text-slate">Baths</TableHead>
                      <TableHead className="text-slate">Sq. Ft.</TableHead>
                      <TableHead className="text-slate text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedListings.map((listing) => {
                      const isRevealed = revealedIds.has(listing.id) || profile?.unlimited;
                      return (
                        <TableRow 
                          key={listing.id} 
                          className="border-b-border hover:bg-lightest-navy/10"
                        >
                          <TableCell 
                            className="font-medium text-lightest-slate"
                            onClick={() => isRevealed && handleRowClick(listing.id)}
                          >
                            {isRevealed ? listing.addressStreet : '*****'}
                          </TableCell>
                          <TableCell className="text-slate">{listing.addressCity}</TableCell>
                          <TableCell className="text-slate">{listing.price}</TableCell>
                          <TableCell className="text-slate">{listing.beds}</TableCell>
                          <TableCell className="text-slate">{listing.baths}</TableCell>
                          <TableCell className="text-slate">{listing.area}</TableCell>
                          <TableCell className="text-center">
                            <LoadingButton
                              variant={isRevealed ? 'ghost' : 'default'}
                              size="sm"
                              onClick={(e) => handleReveal(listing.id, e)}
                              isLoading={isRevealing === listing.id}
                              className={isRevealed ? 'text-slate hover:text-lightest-slate' : 'bg-green text-deep-navy hover:bg-green/90'}
                            >
                              {isRevealed ? (
                                  <>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                  </>
                              ) : (
                                  <>
                                      <Zap className="h-4 w-4 mr-2" />
                                      Reveal (1)
                                  </>
                              )}
                            </LoadingButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </>
          )}
        </CardContent>
      </Card>
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="bg-light-navy border-lightest-navy/20 text-lightest-slate">
          <DialogHeader>
            <DialogTitle>Out of Credits</DialogTitle>
            <DialogDescription>
              You don't have enough credits to reveal this address. Please purchase more credits or upgrade your plan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start gap-2">
            <LoadingButton asChild onClick={() => setShowUpgradeModal(false)} className="bg-green text-deep-navy hover:bg-green/90">
              <Link to="/pricing#top-up">Buy Credits</Link>
            </LoadingButton>
            <LoadingButton asChild variant="outline" onClick={() => setShowUpgradeModal(false)}>
              <Link to="/pricing">Upgrade Plan</Link>
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default JustListed;