import React from 'react';
import { Order } from '@/contexts/DataContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ShoppingCart,
  User,
  MapPin,
  IndianRupee,
  FileText,
  Package,
  Calendar,
  CreditCard,
  Receipt,
  AlertCircle,
} from 'lucide-react';

interface OrderDetailDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platformName?: string;
  companyName?: string;
}

const OrderDetailDialog: React.FC<OrderDetailDialogProps> = ({
  order,
  open,
  onOpenChange,
  platformName,
  companyName,
}) => {
  if (!order) return null;

  const getStatusColor = (status: string) => {
    if (status === 'delivered') return 'bg-success/20 text-success border-success/30';
    if (status.includes('return')) return 'bg-warning/20 text-warning border-warning/30';
    if (status === 'canceled') return 'bg-destructive/20 text-destructive border-destructive/30';
    return 'bg-primary/20 text-primary border-primary/30';
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return '-';
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate profit
  const totalGST = (order.cgst || 0) + (order.sgst || 0) + (order.igst || 0);
  const totalDeductions = (order.commission || 0) + (order.tcs || 0) + (order.tds || 0) + (order.shipperCharge || 0);
  const profit = (order.netAmount || 0) - (order.refundAmount || 0) - (order.deductionAmount || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] bg-card border-border p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Order Details
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={getStatusColor(order.status)}>
                  {order.status}
                </Badge>
                {platformName && (
                  <Badge variant="secondary">{platformName}</Badge>
                )}
                {companyName && (
                  <Badge variant="outline">{companyName}</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-6 space-y-6">
            {/* Order IDs */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Order ID</p>
                <p className="font-mono font-medium">{order.orderId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sub Order ID</p>
                <p className="font-mono font-medium">{order.subOrderId || '-'}</p>
              </div>
            </div>

            {/* Product Details */}
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-primary" />
                Product Details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-secondary/20 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Product Name</p>
                  <p className="text-sm font-medium">{order.productName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">SKU</p>
                  <p className="text-sm font-mono">{order.sku || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">HSN</p>
                  <p className="text-sm font-mono">{order.hsn || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Quantity</p>
                  <p className="text-sm font-bold">{order.quantity}</p>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-primary" />
                Customer Details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-secondary/20 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm font-medium">{order.customerName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">State</p>
                  <p className="text-sm">{order.customerState || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">City</p>
                  <p className="text-sm">{order.customerCity || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pincode</p>
                  <p className="text-sm font-mono">{order.customerPincode || '-'}</p>
                </div>
              </div>
            </div>

            {/* Pricing Details */}
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <IndianRupee className="w-4 h-4 text-primary" />
                Pricing Details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-secondary/20 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Wholesale Price</p>
                  <p className="text-sm font-mono">{formatCurrency(order.wholesalePrice)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Selling Price</p>
                  <p className="text-sm font-mono">{formatCurrency(order.sellingPrice)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Shipping Charge</p>
                  <p className="text-sm font-mono">{formatCurrency(order.shippingCharge)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Net Amount</p>
                  <p className="text-sm font-mono font-bold text-primary">{formatCurrency(order.netAmount)}</p>
                </div>
              </div>
            </div>

            {/* Payment & Deductions */}
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-primary" />
                Payment & Deductions
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-secondary/20 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Payment Mode</p>
                  <p className="text-sm">{order.paymentMode || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Commission</p>
                  <p className="text-sm font-mono text-destructive">{formatCurrency(order.commission)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">TCS</p>
                  <p className="text-sm font-mono">{formatCurrency(order.tcs)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">TDS</p>
                  <p className="text-sm font-mono">{formatCurrency(order.tds)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Shipper Charge</p>
                  <p className="text-sm font-mono">{formatCurrency(order.shipperCharge)}</p>
                </div>
              </div>
            </div>

            {/* GST Details */}
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Receipt className="w-4 h-4 text-primary" />
                GST Details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-secondary/20 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">GST Rate</p>
                  <p className="text-sm">{order.gstRate ? `${order.gstRate}%` : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CGST</p>
                  <p className="text-sm font-mono">{formatCurrency(order.cgst)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">SGST</p>
                  <p className="text-sm font-mono">{formatCurrency(order.sgst)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">IGST</p>
                  <p className="text-sm font-mono">{formatCurrency(order.igst)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Taxable Value</p>
                  <p className="text-sm font-mono">{formatCurrency(order.taxableValue)}</p>
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-primary" />
                Invoice Details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-secondary/20 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Invoice Number</p>
                  <p className="text-sm font-mono">{order.invoiceNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Invoice Date</p>
                  <p className="text-sm">{formatDate(order.invoiceDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Invoice Amount</p>
                  <p className="text-sm font-mono font-bold">{formatCurrency(order.invoiceAmount)}</p>
                </div>
              </div>
            </div>

            {/* Refund/Deduction */}
            {(order.refundAmount > 0 || order.deductionAmount > 0) && (
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  Refund & Deductions
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div>
                    <p className="text-xs text-muted-foreground">Refund Amount</p>
                    <p className="text-sm font-mono font-bold text-destructive">{formatCurrency(order.refundAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Deduction Amount</p>
                    <p className="text-sm font-mono font-bold text-warning">{formatCurrency(order.deductionAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Refund Reason</p>
                    <p className="text-sm">{order.refundReason || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Refund Date</p>
                    <p className="text-sm">{formatDate(order.refundDate)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            <Separator />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-primary/10 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Order Date</p>
                <p className="text-sm font-medium">{formatDate(order.orderDate)}</p>
              </div>
              <div className="p-4 bg-success/10 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Net Amount</p>
                <p className="text-lg font-bold text-success">{formatCurrency(order.netAmount)}</p>
              </div>
              <div className="p-4 bg-destructive/10 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Total Deductions</p>
                <p className="text-lg font-bold text-destructive">{formatCurrency((order.refundAmount || 0) + (order.deductionAmount || 0))}</p>
              </div>
              <div className="p-4 bg-primary/10 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Final Profit</p>
                <p className={`text-lg font-bold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(profit)}
                </p>
              </div>
            </div>

            {/* Raw Data Preview */}
            {order.rawData && Object.keys(order.rawData).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">All Data (Raw)</h3>
                <div className="max-h-[200px] overflow-auto p-4 bg-secondary/20 rounded-lg font-mono text-xs">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(order.rawData, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailDialog;
