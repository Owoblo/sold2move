import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useProfile } from '@/hooks/useProfile';

/**
 * Custom hook to fetch and manage user orders
 */
export const useOrders = () => {
  const { profile } = useProfile();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('design_orders')
        .select(`
          *,
          design_products (
            id,
            name,
            description,
            category,
            price_cents,
            features
          )
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Get order counts by status
  const orderCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    acc.total = (acc.total || 0) + 1;
    return acc;
  }, {});

  // Get orders by status
  const getOrdersByStatus = (status) => {
    return orders.filter(order => order.status === status);
  };

  // Get recent orders (last 5)
  const recentOrders = orders.slice(0, 5);

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
    orderCounts,
    getOrdersByStatus,
    recentOrders,
  };
};

/**
 * Custom hook to fetch a single order by ID
 */
export const useOrder = (orderId) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('design_orders')
        .select(`
          *,
          design_products (
            id,
            name,
            description,
            category,
            price_cents,
            features
          )
        `)
        .eq('id', orderId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      setOrder(data);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  return {
    order,
    loading,
    error,
    refetch: fetchOrder,
  };
};

export default useOrders;
