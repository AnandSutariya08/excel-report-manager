import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData, Platform, HeaderMapping } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Store, Trash2, Edit, ArrowLeft, FileSpreadsheet, Settings2, Check, RefreshCcw, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

// Field definitions for each file type
const fieldDefinitions = {
  sales: [
    { key: 'orderId', label: 'Order ID', required: true },
    { key: 'subOrderId', label: 'Sub Order ID', required: true },
    { key: 'productName', label: 'Product Name', required: true },
    { key: 'sku', label: 'SKU', required: false },
    { key: 'quantity', label: 'Quantity', required: true },
    { key: 'status', label: 'Order Status', required: true },
    { key: 'orderDate', label: 'Order Date', required: true },
    { key: 'customerName', label: 'Customer Name', required: false },
    { key: 'customerState', label: 'Customer State', required: false },
    { key: 'customerCity', label: 'Customer City', required: false },
    { key: 'customerPincode', label: 'Customer Pincode', required: false },
    { key: 'wholesalePrice', label: 'Wholesale Price', required: false },
    { key: 'sellingPrice', label: 'Selling Price', required: false },
    { key: 'shippingCharge', label: 'Shipping Charge', required: false },
  ],
  payment: [
    { key: 'orderId', label: 'Order ID', required: true },
    { key: 'subOrderId', label: 'Sub Order ID', required: true },
    { key: 'productName', label: 'Product Name', required: false },
    { key: 'orderDate', label: 'Order Date', required: false },
    { key: 'paymentMode', label: 'Payment Mode', required: false },
    { key: 'hsn', label: 'HSN Number', required: false },
    { key: 'wholesalePrice', label: 'Wholesale Price', required: false },
    { key: 'shippingCharge', label: 'Shipping Charge', required: false },
    { key: 'status', label: 'Order Status', required: false },
    { key: 'tcs', label: 'TCS (Tax Collected at Source)', required: false },
    { key: 'tds', label: 'TDS (Tax Deducted at Source)', required: false },
    { key: 'commission', label: 'Platform Commission', required: false },
    { key: 'shipperCharge', label: 'Shipper Charge', required: false },
    { key: 'netAmount', label: 'Net Amount', required: false },
    { key: 'customerCity', label: 'Customer City', required: false },
    { key: 'customerPincode', label: 'Customer Pincode', required: false },
    { key: 'customerState', label: 'Customer State', required: false },
  ],
  gst: [
    { key: 'orderId', label: 'Order ID', required: true },
    { key: 'subOrderId', label: 'Sub Order ID', required: true },
    { key: 'status', label: 'Order Status', required: false },
    { key: 'orderDate', label: 'Order Date', required: false },
    { key: 'invoiceNumber', label: 'Invoice Number', required: false },
    { key: 'invoiceDate', label: 'Invoice Date', required: false },
    { key: 'hsn', label: 'HSN Code', required: false },
    { key: 'gstRate', label: 'GST Rate (%)', required: false },
    { key: 'sku', label: 'SKU', required: false },
    { key: 'productName', label: 'Product Name', required: false },
    { key: 'quantity', label: 'Quantity', required: false },
    { key: 'customerState', label: 'Place of Supply', required: false },
    { key: 'taxableValue', label: 'Taxable Value', required: false },
    { key: 'cgst', label: 'CGST', required: false },
    { key: 'igst', label: 'IGST', required: false },
    { key: 'sgst', label: 'SGST', required: false },
    { key: 'invoiceAmount', label: 'Invoice Amount', required: false },
  ],
  refund: [
    { key: 'orderId', label: 'Order ID', required: true },
    { key: 'subOrderId', label: 'Sub Order ID', required: true },
    { key: 'refundAmount', label: 'Refund Amount', required: false },
    { key: 'deductionAmount', label: 'Deduction Amount', required: false },
    { key: 'refundReason', label: 'Reason', required: false },
    { key: 'refundDate', label: 'Refund Date', required: false },
  ],
};

// Default header examples (can be customized per platform)
const getDefaultHeaders = (): { sales: HeaderMapping; payment: HeaderMapping; gst: HeaderMapping; refund: HeaderMapping } => ({
  sales: {
    orderId: '',
    subOrderId: '',
    productName: '',
    sku: '',
    quantity: '',
    status: '',
    orderDate: '',
    customerName: '',
    customerState: '',
    customerCity: '',
    customerPincode: '',
    wholesalePrice: '',
    sellingPrice: '',
    shippingCharge: '',
  },
  payment: {
    orderId: '',
    subOrderId: '',
    productName: '',
    orderDate: '',
    paymentMode: '',
    hsn: '',
    wholesalePrice: '',
    shippingCharge: '',
    status: '',
    tcs: '',
    tds: '',
    commission: '',
    shipperCharge: '',
    netAmount: '',
    customerCity: '',
    customerPincode: '',
    customerState: '',
  },
  gst: {
    orderId: '',
    subOrderId: '',
    status: '',
    orderDate: '',
    invoiceNumber: '',
    invoiceDate: '',
    hsn: '',
    gstRate: '',
    sku: '',
    productName: '',
    quantity: '',
    customerState: '',
    taxableValue: '',
    cgst: '',
    igst: '',
    sgst: '',
    invoiceAmount: '',
  },
  refund: {
    orderId: '',
    subOrderId: '',
    refundAmount: '',
    deductionAmount: '',
    refundReason: '',
    refundDate: '',
  },
});

const CompanyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCompanyById, addPlatform, updatePlatform, deletePlatform, getOrdersByCompany } = useData();
  const { toast } = useToast();

  const company = getCompanyById(id || '');
  const companyOrders = getOrdersByCompany(id || '');

  const [isOpen, setIsOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [platformName, setPlatformName] = useState('');
  const [activeTab, setActiveTab] = useState<'sales' | 'payment' | 'gst' | 'refund'>('sales');
  const [headerMappings, setHeaderMappings] = useState(getDefaultHeaders());
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold mb-2">Company not found</h2>
        <Button onClick={() => navigate('/companies')}>Back to Companies</Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformName.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingPlatform) {
        await updatePlatform(editingPlatform.id, {
          name: platformName,
          salesHeaders: headerMappings.sales,
          paymentHeaders: headerMappings.payment,
          gstHeaders: headerMappings.gst,
          refundHeaders: headerMappings.refund,
        });
        toast({ title: 'Platform updated', description: `${platformName} has been updated` });
      } else {
        await addPlatform(company.id, {
          name: platformName,
          salesHeaders: headerMappings.sales,
          paymentHeaders: headerMappings.payment,
          gstHeaders: headerMappings.gst,
          refundHeaders: headerMappings.refund,
        });
        toast({ title: 'Platform created', description: `${platformName} has been added` });
      }

      handleDialogClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save platform. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (platform: Platform) => {
    setEditingPlatform(platform);
    setPlatformName(platform.name);
    setHeaderMappings({
      sales: { ...getDefaultHeaders().sales, ...platform.salesHeaders },
      payment: { ...getDefaultHeaders().payment, ...platform.paymentHeaders },
      gst: { ...getDefaultHeaders().gst, ...platform.gstHeaders },
      refund: { ...getDefaultHeaders().refund, ...platform.refundHeaders },
    });
    setIsOpen(true);
  };

  const handleDelete = (platform: Platform) => {
    deletePlatform(platform.id);
    toast({ title: 'Platform deleted', description: `${platform.name} has been removed`, variant: 'destructive' });
  };

  const handleDialogClose = () => {
    setIsOpen(false);
    setEditingPlatform(null);
    setPlatformName('');
    setHeaderMappings(getDefaultHeaders());
    setActiveTab('sales');
  };

  const updateHeaderMapping = (type: 'sales' | 'payment' | 'gst' | 'refund', key: string, value: string) => {
    setHeaderMappings(prev => ({
      ...prev,
      [type]: { ...prev[type], [key]: value }
    }));
  };

  const getConfiguredCount = (type: 'sales' | 'payment' | 'gst' | 'refund') => {
    const headers = headerMappings[type];
    return Object.values(headers).filter(v => v && v.trim() !== '').length;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/companies')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{company.name}</h1>
          <p className="text-muted-foreground">{company.description || 'Manage platforms and configure Excel headers'}</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleDialogClose()}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Platform
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>{editingPlatform ? 'Edit Platform' : 'Create New Platform'}</DialogTitle>
              <DialogDescription>
                Configure the platform and map your Excel column headers. Enter the EXACT column names from your Excel files.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="space-y-4 flex-shrink-0">
                <div className="space-y-2">
                  <Label htmlFor="platformName">Platform Name *</Label>
                  <Input
                    id="platformName"
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    placeholder="e.g., Flipkart, Amazon, Meesho, Shop101"
                    className="bg-secondary/50"
                    required
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">Excel Column Mapping</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter the exact column header names as they appear in your Excel files. Leave empty if not available.
                </p>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex flex-col">
                  <TabsList className="grid grid-cols-4 mb-4 flex-shrink-0">
                    <TabsTrigger value="sales" className="flex items-center gap-1 text-xs sm:text-sm">
                      <FileSpreadsheet className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Sales</span>
                      <span className="text-muted-foreground text-xs">({getConfiguredCount('sales')})</span>
                    </TabsTrigger>
                    <TabsTrigger value="payment" className="flex items-center gap-1 text-xs sm:text-sm">
                      <FileSpreadsheet className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Payment</span>
                      <span className="text-muted-foreground text-xs">({getConfiguredCount('payment')})</span>
                    </TabsTrigger>
                    <TabsTrigger value="gst" className="flex items-center gap-1 text-xs sm:text-sm">
                      <FileSpreadsheet className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">GST</span>
                      <span className="text-muted-foreground text-xs">({getConfiguredCount('gst')})</span>
                    </TabsTrigger>
                    <TabsTrigger value="refund" className="flex items-center gap-1 text-xs sm:text-sm">
                      <RefreshCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Refund</span>
                      <span className="text-muted-foreground text-xs">({getConfiguredCount('refund')})</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex-1 min-h-0 border rounded-lg bg-secondary/20 overflow-hidden">
                <div className="h-[280px] overflow-y-auto">
                  <div className="p-4">
                    {(['sales', 'payment', 'gst', 'refund'] as const).map((type) => (
                      <div key={type} className={activeTab === type ? 'block' : 'hidden'}>
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mb-4">
                          <p className="text-xs text-muted-foreground">
                            {type === 'sales' && 'Map columns from your Sales Report Excel file. This creates new orders.'}
                            {type === 'payment' && 'Map columns from your Payment Sheet Excel file. This updates order payment data.'}
                            {type === 'gst' && 'Map columns from your GST Report Excel file. This updates order tax data.'}
                            {type === 'refund' && 'Map columns for refund/deduction data. This tracks refunds and deductions.'}
                          </p>
                        </div>
                        <div className="grid gap-3 pb-2">
                          {fieldDefinitions[type].map((field) => (
                            <div key={field.key} className="grid grid-cols-2 gap-3 items-center">
                              <Label className="text-sm font-medium">
                                {field.label}
                                {field.required && <span className="text-destructive ml-1">*</span>}
                              </Label>
                              <Input
                                value={headerMappings[type][field.key] || ''}
                                onChange={(e) => updateHeaderMapping(type, field.key, e.target.value)}
                                placeholder={`Excel column name`}
                                className="bg-background text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleDialogClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingPlatform ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {editingPlatform ? 'Update Platform' : 'Create Platform'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{company.platforms.length}</p>
                <p className="text-sm text-muted-foreground">Platforms</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{companyOrders.length}</p>
                <p className="text-sm text-muted-foreground">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {companyOrders.filter(o => o.status?.toLowerCase() === 'delivered').length}
                </p>
                <p className="text-sm text-muted-foreground">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platforms Grid */}
      {company.platforms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {company.platforms.map((platform, idx) => {
            const platformOrders = companyOrders.filter(o => o.platformId === platform.id);
            const configuredSales = Object.values(platform.salesHeaders || {}).filter(v => v).length;
            const configuredPayment = Object.values(platform.paymentHeaders || {}).filter(v => v).length;
            const configuredGst = Object.values(platform.gstHeaders || {}).filter(v => v).length;
            const configuredRefund = Object.values(platform.refundHeaders || {}).filter(v => v).length;

            return (
              <Card
                key={platform.id}
                className="bg-card/80 backdrop-blur-xl border-border/50 hover:border-primary/30 transition-all duration-300 animate-slide-up group"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                        <Store className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{platform.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {platformOrders.length} orders
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(platform)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Platform?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete {platform.name} and all associated orders.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => handleDelete(platform)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium text-foreground text-xs">Header Mappings:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span>Sales:</span>
                        <span className={configuredSales > 0 ? 'text-success' : 'text-muted-foreground'}>
                          {configuredSales} fields
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payment:</span>
                        <span className={configuredPayment > 0 ? 'text-success' : 'text-muted-foreground'}>
                          {configuredPayment} fields
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST:</span>
                        <span className={configuredGst > 0 ? 'text-success' : 'text-muted-foreground'}>
                          {configuredGst} fields
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Refund:</span>
                        <span className={configuredRefund > 0 ? 'text-success' : 'text-muted-foreground'}>
                          {configuredRefund} fields
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-card/80 backdrop-blur-xl border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Platforms Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Add your first platform (like Flipkart, Amazon, Meesho) and configure the Excel column headers for data import.
            </p>
            <Button onClick={() => setIsOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add First Platform
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CompanyDetail;
