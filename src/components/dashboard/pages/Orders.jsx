import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet-async';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { useOrders } from '@/hooks/useOrders';
import {
  ShoppingCart,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Palette,
  FileText,
  PenTool,
  ChevronRight,
  PartyPopper,
  Calendar,
  Mail,
  Phone,
  User,
  CreditCard,
  FileDown,
  MessageSquare,
  ExternalLink
} from 'lucide-react';

// Status configuration
const statusConfig = {
  pending: {
    label: 'Pending Payment',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    icon: Clock,
  },
  paid: {
    label: 'Paid',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: CreditCard,
  },
  processing: {
    label: 'In Progress',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: RefreshCw,
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: XCircle,
  },
  refunded: {
    label: 'Refunded',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    icon: RefreshCw,
  },
};

// Category icons
const categoryIcons = {
  postcard_design: Palette,
  letter_design: FileText,
  handwritten_card: PenTool,
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} border flex items-center gap-1.5`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

// Order Card Component
const OrderCard = ({ order, onClick }) => {
  const CategoryIcon = categoryIcons[order.design_products?.category] || Package;
  const createdDate = new Date(order.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const amount = (order.amount_cents / 100).toFixed(2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="bg-light-navy border-lightest-navy/20 hover:border-teal/30 transition-colors cursor-pointer"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-teal/10 hidden sm:flex">
                <CategoryIcon className="h-6 w-6 text-teal" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lightest-slate">
                  {order.design_products?.name || 'Design Service'}
                </h3>
                <p className="text-sm text-slate">
                  Order #{order.id.slice(0, 8).toUpperCase()}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate">
                  <Calendar className="h-3 w-3" />
                  {createdDate}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={order.status} />
              <span className="text-lg font-semibold text-teal">${amount}</span>
            </div>
          </div>

          {order.design_notes && (
            <div className="mt-4 pt-4 border-t border-lightest-navy/20">
              <p className="text-xs text-slate line-clamp-2">
                <MessageSquare className="h-3 w-3 inline mr-1" />
                {order.design_notes}
              </p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-end">
            <Button variant="ghost" size="sm" className="text-teal hover:text-teal/80 p-0">
              View Details
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Order Detail Modal
const OrderDetailModal = ({ order, isOpen, onClose }) => {
  if (!order) return null;

  const CategoryIcon = categoryIcons[order.design_products?.category] || Package;
  const createdDate = new Date(order.created_at).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const amount = (order.amount_cents / 100).toFixed(2);
  const discount = order.discount_cents ? (order.discount_cents / 100).toFixed(2) : null;
  const originalAmount = order.discount_cents
    ? ((order.amount_cents + order.discount_cents) / 100).toFixed(2)
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-light-navy border-lightest-navy/20">
        <DialogHeader>
          <DialogTitle className="text-lightest-slate flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal/10">
              <CategoryIcon className="h-5 w-5 text-teal" />
            </div>
            Order Details
          </DialogTitle>
          <DialogDescription className="text-slate">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-slate">Status</span>
            <StatusBadge status={order.status} />
          </div>

          {/* Product Info */}
          <div className="bg-deep-navy/50 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-lightest-slate">
              {order.design_products?.name || 'Design Service'}
            </h4>
            <p className="text-sm text-slate">
              {order.design_products?.description}
            </p>
            {order.design_products?.features && (
              <div className="space-y-1 pt-2">
                {order.design_products.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate">
                    <CheckCircle className="h-3 w-3 text-teal flex-shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate">Customer Details</h4>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2 text-slate">
                <User className="h-4 w-4 text-teal" />
                {order.customer_name}
              </div>
              <div className="flex items-center gap-2 text-slate">
                <Mail className="h-4 w-4 text-teal" />
                {order.customer_email}
              </div>
              {order.customer_phone && (
                <div className="flex items-center gap-2 text-slate">
                  <Phone className="h-4 w-4 text-teal" />
                  {order.customer_phone}
                </div>
              )}
            </div>
          </div>

          {/* Design Notes */}
          {order.design_notes && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate">Design Notes</h4>
              <p className="text-sm text-lightest-slate bg-deep-navy/50 rounded-lg p-3">
                {order.design_notes}
              </p>
            </div>
          )}

          {/* Pricing */}
          <div className="space-y-2 pt-4 border-t border-lightest-navy/20">
            {discount && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-slate">Original Price</span>
                  <span className="text-slate line-through">${originalAmount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate">
                    Discount {order.coupon_code && `(${order.coupon_code})`}
                  </span>
                  <span className="text-green-400">-${discount}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-lightest-slate font-medium">Total Paid</span>
              <span className="text-xl font-bold text-teal">${amount}</span>
            </div>
          </div>

          {/* Order Timeline */}
          <div className="space-y-2 pt-4 border-t border-lightest-navy/20">
            <h4 className="text-sm font-medium text-slate">Timeline</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate">
                <Calendar className="h-4 w-4 text-teal" />
                Ordered: {createdDate}
              </div>
              {order.paid_at && (
                <div className="flex items-center gap-2 text-slate">
                  <CreditCard className="h-4 w-4 text-teal" />
                  Paid: {new Date(order.paid_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </div>
              )}
              {order.completed_at && (
                <div className="flex items-center gap-2 text-slate">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Completed: {new Date(order.completed_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Delivery Files */}
          {order.delivery_files && order.delivery_files.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-lightest-navy/20">
              <h4 className="text-sm font-medium text-slate">Delivery Files</h4>
              <div className="space-y-2">
                {order.delivery_files.map((file, idx) => (
                  <a
                    key={idx}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-teal hover:text-teal/80 text-sm"
                  >
                    <FileDown className="h-4 w-4" />
                    {file.name || `File ${idx + 1}`}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {order.status === 'completed' && order.delivery_files?.length > 0 && (
            <Button className="bg-teal text-deep-navy hover:bg-teal/90">
              <FileDown className="h-4 w-4 mr-2" />
              Download All
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Success Dialog Component
const PaymentSuccessDialog = ({ isOpen, onClose, orderId }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-light-navy border-lightest-navy/20 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="mx-auto w-20 h-20 bg-teal/20 rounded-full flex items-center justify-center mb-4"
        >
          <PartyPopper className="h-10 w-10 text-teal" />
        </motion.div>

        <DialogHeader>
          <DialogTitle className="text-2xl text-lightest-slate text-center">
            Payment Successful!
          </DialogTitle>
          <DialogDescription className="text-slate text-center">
            Your order has been confirmed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="bg-deep-navy/50 rounded-lg p-4">
            <p className="text-sm text-slate mb-1">Order ID</p>
            <p className="text-lg font-semibold text-teal">
              #{orderId?.slice(0, 8).toUpperCase()}
            </p>
          </div>

          <div className="text-sm text-slate space-y-2">
            <p>Our design team has been notified and will begin working on your custom design.</p>
            <p>You'll receive an email confirmation shortly with all the details.</p>
          </div>

          <div className="bg-teal/10 border border-teal/20 rounded-lg p-4 text-left">
            <h4 className="font-semibold text-teal mb-2">What's Next?</h4>
            <ul className="text-sm text-slate space-y-1">
              <li>1. Design team reviews your order (1-2 business days)</li>
              <li>2. First draft delivered (3-5 business days)</li>
              <li>3. You request revisions if needed (2 rounds included)</li>
              <li>4. Final files delivered in PDF and PNG formats</li>
            </ul>
          </div>
        </div>

        <Button
          onClick={onClose}
          className="w-full mt-6 bg-teal text-deep-navy hover:bg-teal/90"
        >
          View My Orders
        </Button>
      </DialogContent>
    </Dialog>
  );
};

// Empty State Component
const EmptyState = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-light-navy border-lightest-navy/20">
        <CardContent className="py-16 text-center">
          <div className="mx-auto w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mb-6">
            <ShoppingCart className="h-8 w-8 text-teal" />
          </div>
          <h3 className="text-xl font-semibold text-lightest-slate mb-2">No Orders Yet</h3>
          <p className="text-slate mb-6 max-w-md mx-auto">
            You haven't placed any orders yet. Browse our design services to get custom
            postcards, letters, and handwritten cards for your direct mail campaigns.
          </p>
          <Button
            onClick={() => navigate('/dashboard/products')}
            className="bg-teal text-deep-navy hover:bg-teal/90"
          >
            <Palette className="h-4 w-4 mr-2" />
            Browse Design Services
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Main Orders Page Component
const Orders = () => {
  const { orders, loading, error, refetch, orderCounts } = useOrders();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { toast } = useToast();

  // Handle payment success redirect
  useEffect(() => {
    const payment = searchParams.get('payment');
    const orderId = searchParams.get('order_id');

    if (payment === 'success' && orderId) {
      setSuccessOrderId(orderId);
      setShowSuccessDialog(true);
      // Clean up URL params
      setSearchParams({});
      // Refetch orders to include the new order
      refetch();
    } else if (payment === 'cancelled') {
      toast({
        title: 'Payment Cancelled',
        description: 'Your payment was cancelled. Your order is still pending.',
        variant: 'default',
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, refetch, toast]);

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const handleCloseSuccessDialog = () => {
    setShowSuccessDialog(false);
    setSuccessOrderId(null);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedOrder(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader className="h-12 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonLoader key={i} className="h-24" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SkeletonLoader key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-light-navy border-red-500/20">
        <CardContent className="p-6 text-center">
          <p className="text-red-400 mb-4">Failed to load orders: {error}</p>
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Helmet>
        <title>Orders | Sold2Move Dashboard</title>
        <meta name="description" content="View and manage your design service orders." />
      </Helmet>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-lightest-slate font-heading">Orders</h1>
        <p className="mt-2 text-slate">
          Track your design service orders and download completed files.
        </p>
      </div>

      {orders.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-light-navy border-lightest-navy/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal/10">
                    <Package className="h-5 w-5 text-teal" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-lightest-slate">
                      {orderCounts.total || 0}
                    </p>
                    <p className="text-xs text-slate">Total Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-light-navy border-lightest-navy/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <RefreshCw className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-lightest-slate">
                      {(orderCounts.paid || 0) + (orderCounts.processing || 0)}
                    </p>
                    <p className="text-xs text-slate">In Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-light-navy border-lightest-navy/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-lightest-slate">
                      {orderCounts.completed || 0}
                    </p>
                    <p className="text-xs text-slate">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-light-navy border-lightest-navy/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <Clock className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-lightest-slate">
                      {orderCounts.pending || 0}
                    </p>
                    <p className="text-xs text-slate">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Orders List */}
          <Card className="bg-light-navy border-lightest-navy/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lightest-slate">Your Orders</CardTitle>
                  <CardDescription className="text-slate">
                    Click on an order to view details
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refetch}
                  className="text-teal hover:text-teal/80"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <AnimatePresence>
                  {orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onClick={() => handleOrderClick(order)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Payment Success Dialog */}
      <PaymentSuccessDialog
        isOpen={showSuccessDialog}
        onClose={handleCloseSuccessDialog}
        orderId={successOrderId}
      />

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={showDetailModal}
        onClose={handleCloseDetailModal}
      />
    </motion.div>
  );
};

export default Orders;
