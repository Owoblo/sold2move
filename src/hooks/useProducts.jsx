import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('design_products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
  };
};

export const useCouponValidation = () => {
  const [validating, setValidating] = useState(false);
  const [couponResult, setCouponResult] = useState(null);

  const validateCoupon = async (code, productPriceCents) => {
    if (!code || code.trim().length < 3) {
      setCouponResult(null);
      return null;
    }

    setValidating(true);

    try {
      const { data, error } = await supabase.functions.invoke('validate-coupon', {
        body: JSON.stringify({
          code: code.trim(),
          productPriceCents
        }),
      });

      if (error) {
        throw error;
      }

      setCouponResult(data);
      return data;
    } catch (err) {
      console.error('Error validating coupon:', err);
      setCouponResult({ valid: false, error: 'Failed to validate coupon' });
      return { valid: false, error: 'Failed to validate coupon' };
    } finally {
      setValidating(false);
    }
  };

  const clearCoupon = () => {
    setCouponResult(null);
  };

  return {
    validateCoupon,
    clearCoupon,
    validating,
    couponResult,
  };
};

export default useProducts;
