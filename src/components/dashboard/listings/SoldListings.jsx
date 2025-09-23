import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { fetchSoldSincePrev } from '@/lib/queries';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { AlertCircle, Download } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useProfile } from '@/hooks/useProfile.jsx';
import { Pagination } from '@/components/ui/pagination';
import { exportToCSV } from '@/lib/csvExporter';
import toast from '@/lib/toast';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import LoadingButton from '@/components/ui/LoadingButton';

const PAGE_SIZE = 20;

const SoldListings = ({ filters }) => {
  const navigate = useNavigate();
  const [allListings, setAllListings] = useState([]);
  const [pagedListings, setPagedListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { profile, loading: profileLoading } = useProfile();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const fetchListingsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCurrentPage(1);
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
        .limit(2);

      if (runsError || runsData.length < 2) {
        throw new Error(runsError?.message || 'Could not fetch the latest two run IDs.');
      }

      const currentRunId = runsData[0].id;
      const previousRunId = runsData[1].id;

      const data = await fetchSoldSincePrev(currentRunId, previousRunId, profile.city_name, filters);
      setAllListings(data);
      setTotalPages(Math.ceil(data.length / PAGE_SIZE));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [profile, profileLoading, filters]);

  useEffect(() => {
    if (!profileLoading) {
      fetchListingsData();
    }
  }, [profileLoading, fetchListingsData]);

  useEffect(() => {
    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE;
    setPagedListings(allListings.slice(from, to));
  }, [currentPage, allListings]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  
  const handleExport = () => {
    if (pagedListings.length === 0) {
      toast.error("Export Failed", "No listings on this page to export.");
      return;
    }
    const dataToExport = pagedListings.map(({ addressStreet, addressCity, price, beds, baths, area, statusText }) => ({
      Address: addressStreet,
      City: addressCity,
      Price: price,
      Beds: beds,
      Baths: baths,
      'Sq. Ft.': area,
      'Property Type': statusText,
    }));
    exportToCSV(dataToExport, `sold-listings-page-${currentPage}-${profile?.city_name || 'export'}-${new Date().toLocaleDateString()}.csv`);
    toast.success("Export Successful", "Your CSV file has been downloaded.");
  };

  const handleRowClick = (listingId) => {
    navigate(`/dashboard/listings/property/${listingId}`);
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
        <title>Sold Properties | Sold2Move</title>
        <meta name="description" content="View recently sold properties to identify high-potential moving leads." />
      </Helmet>
      <Card className="bg-light-navy border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lightest-slate">
            Recently Sold Properties {profile?.city_name && `in ${profile.city_name}`}
          </CardTitle>
          <LoadingButton variant="outline" size="sm" onClick={handleExport} disabled={pagedListings.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export Page to CSV
          </LoadingButton>
        </CardHeader>
        <CardContent>
          {allListings.length === 0 ? (
            <p className="text-slate text-center py-8">No sold properties found matching your criteria. Make sure your service area is set in Settings.</p>
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
                      <TableHead className="text-slate">Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedListings.map((listing) => (
                      <TableRow 
                        key={listing.id} 
                        className="border-b-border hover:bg-lightest-navy/10 cursor-pointer"
                        onClick={() => handleRowClick(listing.id)}
                      >
                        <TableCell className="font-medium text-lightest-slate">{listing.addressStreet}</TableCell>
                        <TableCell className="text-slate">{listing.addressCity}</TableCell>
                        <TableCell className="text-slate">{listing.price}</TableCell>
                        <TableCell className="text-slate">{listing.beds}</TableCell>
                        <TableCell className="text-slate">{listing.baths}</TableCell>
                        <TableCell className="text-slate">{listing.area}</TableCell>
                        <TableCell className="text-slate">{listing.statusText}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SoldListings;