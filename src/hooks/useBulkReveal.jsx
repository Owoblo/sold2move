import { useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';
import { useAnalytics } from '@/services/analytics.jsx';

export const useBulkReveal = () => {
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const { trackAction } = useAnalytics();
  const [isRevealing, setIsRevealing] = useState(false);

  const bulkRevealListings = async (listingIds, userId, creditCost = 1) => {
    if (!listingIds || listingIds.length === 0) {
      toast({
        variant: "destructive",
        title: "No Listings Selected",
        description: "Please select at least one listing to reveal.",
      });
      return { success: false };
    }

    setIsRevealing(true);
    
    try {
      // Calculate total cost
      const totalCost = listingIds.length * creditCost;
      
      // Check if user has enough credits
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits_remaining, unlimited')
        .eq('id', userId)
        .single();

      if (profileError) {
        throw new Error('Failed to check credits');
      }

      if (!profile.unlimited && profile.credits_remaining < totalCost) {
        toast({
          variant: "destructive",
          title: "Insufficient Credits",
          description: `You need ${totalCost} credits but only have ${profile.credits_remaining}. Please purchase more credits.`,
        });
        return { success: false, insufficientCredits: true };
      }

      // Create bulk reveal records
      const revealRecords = listingIds.map(listingId => ({
        user_id: userId,
        listing_id: listingId,
        credit_cost: creditCost,
        created_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('listing_reveals')
        .insert(revealRecords);

      if (insertError) {
        throw new Error(`Failed to reveal listings: ${insertError.message}`);
      }

      // Update user credits if not unlimited
      if (!profile.unlimited) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            credits_remaining: profile.credits_remaining - totalCost,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Failed to update credits:', updateError);
          // Don't fail the whole operation for this
        }
      }

      // Track analytics
      trackAction('bulk_reveal_success', {
        listingCount: listingIds.length,
        totalCost,
        creditCost,
        userId
      });

      toast({
        title: "Bulk Reveal Successful!",
        description: `Successfully revealed ${listingIds.length} listings for ${totalCost} credits.`,
      });

      return { success: true, revealedCount: listingIds.length, totalCost };

    } catch (error) {
      console.error('Bulk reveal error:', error);
      
      toast({
        variant: "destructive",
        title: "Bulk Reveal Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
      });

      trackAction('bulk_reveal_error', {
        error: error.message,
        listingCount: listingIds.length,
        userId
      });

      return { success: false, error: error.message };
    } finally {
      setIsRevealing(false);
    }
  };

  return {
    bulkRevealListings,
    isRevealing
  };
};
