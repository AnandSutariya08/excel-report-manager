import React, { useState, useMemo } from 'react';
import { useData, Order } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { RotateCcw, Search, Plus, CheckCircle, XCircle, Package, Trash2, Download, Eye, Calendar } from 'lucide-react';
import OrderDetailDialog from '@/components/orders/OrderDetailDialog';

const Returns: React.FC = () => {
  const { returns, addReturn, updateReturn, addInventoryItem, addDeadStock, companies, orders, searchOrders, getOrderByIds, getPlatformById, getCompanyById, loading } = useData();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [selectedOrderForView, setSelectedOrderForView] = useState<Order | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    orderId: '',
    subOrderId: '',
    platformId: '',
    companyId: '',
    productName: '',
    sku: '',
    returnDate: new Date().toISOString().split('T')[0],
    condition: 'good' as 'good' | 'bad',
    notes: '',
  });

  const filteredReturns = useMemo(() => {
    return returns.filter(r => {
      const matchesSearch = 
        r.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.subOrderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.sku.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && new Date(r.returnDate) >= new Date(startDate);
      }
      if (endDate) {
        matchesDate = matchesDate && new Date(r.returnDate) <= new Date(endDate + 'T23:59:59');
      }

      return matchesSearch && matchesDate;
    });
  }, [returns, searchQuery, startDate, endDate]);

  // Search order by ID across all companies
  const handleSearchOrder = () => {
    if (!orderSearchQuery.trim()) return;
    
    // Search in all orders
    const order = getOrderByIds(orderSearchQuery.trim());
    
    if (order) {
      setFoundOrder(order);
      setFormData(prev => ({
        ...prev,
        orderId: order.orderId,
        subOrderId: order.subOrderId,
        platformId: order.platformId,
        companyId: order.companyId,
        productName: order.productName,
        sku: order.sku,
      }));
      toast({ title: 'Order Found', description: `Found: ${order.productName}` });
    } else {
      setFoundOrder(null);
      toast({ title: 'Not Found', description: 'No order found with this ID', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.orderId || !formData.platformId || !formData.companyId) {
      toast({ 
        title: 'Validation Error', 
        description: 'Please fill in all required fields',
        variant: 'destructive' 
      });
      return;
    }

    try {
      await addReturn({
        ...formData,
        addedToInventory: false,
        addedToDeadStock: false,
      });
      toast({ 
        title: 'Return Recorded Successfully', 
        description: `Return for ${formData.productName} has been recorded and order status updated in master file.` 
      });
      setFormData({
        orderId: '',
        subOrderId: '',
        platformId: '',
        companyId: '',
        productName: '',
        sku: '',
        returnDate: new Date().toISOString().split('T')[0],
        condition: 'good',
        notes: '',
      });
      setFoundOrder(null);
      setOrderSearchQuery('');
      setIsOpen(false);
    } catch (error: any) {
      toast({ 
        title: 'Failed to Record Return', 
        description: error.message || 'An error occurred while recording the return. Please try again.',
        variant: 'destructive' 
      });
    }
  };

  const handleProcessReturn = (returnItem: typeof returns[0], action: 'inventory' | 'deadstock') => {
    if (action === 'inventory') {
      addInventoryItem({
        sku: returnItem.sku,
        hsn: '',
        productName: returnItem.productName,
        quantity: 1,
        costPrice: 0,
        sellingPrice: 0,
        imageUrl: '',
        description: '',
        category: '',
      });
      updateReturn(returnItem.id, { addedToInventory: true });
      toast({ title: 'Added to Inventory', description: `${returnItem.productName} has been added back to inventory` });
    } else {
      addDeadStock({
        sku: returnItem.sku,
        productName: returnItem.productName,
        quantity: 1,
        reason: 'Damaged/Defective return',
      });
      updateReturn(returnItem.id, { addedToDeadStock: true });
      toast({ title: 'Added to Dead Stock', description: `${returnItem.productName} has been marked as dead stock`, variant: 'destructive' });
    }
  };

  const viewOrderDetails = (orderId: string, subOrderId: string) => {
    const order = getOrderByIds(orderId, subOrderId);
    if (order) {
      setSelectedOrderForView(order);
      setViewDialogOpen(true);
    }
  };

  const pendingReturns = filteredReturns.filter(r => !r.addedToInventory && !r.addedToDeadStock);
  const processedReturns = filteredReturns.filter(r => r.addedToInventory || r.addedToDeadStock);

  const exportToCSV = () => {
    const headers = ['Order ID', 'Sub Order ID', 'Product', 'SKU', 'Return Date', 'Condition', 'Status', 'Notes'];
    const rows = returns.map(r => [
      r.orderId, r.subOrderId, r.productName, r.sku, r.returnDate, r.condition,
      r.addedToInventory ? 'Restocked' : r.addedToDeadStock ? 'Dead Stock' : 'Pending',
      r.notes
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `returns-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Returns</h1>
          <p className="text-muted-foreground">Process customer returns - Search by Order ID across all companies</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Return
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl">
              <DialogHeader>
                <DialogTitle>Record Return</DialogTitle>
                <DialogDescription>Search by Order ID or Sub Order ID to find the product</DialogDescription>
              </DialogHeader>
              
              {/* Order Search */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="orderSearch">Search Order ID / Sub Order ID</Label>
                    <Input
                      id="orderSearch"
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      placeholder="Enter Order ID or Sub Order ID"
                      className="bg-secondary/50"
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchOrder()}
                    />
                  </div>
                  <Button type="button" onClick={handleSearchOrder} className="mt-6">
                    <Search className="w-4 h-4 mr-2" />
                    Find
                  </Button>
                </div>

                {/* Found Order Preview */}
                {foundOrder && (
                  <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-success">Order Found!</p>
                        <p className="text-sm font-medium mt-1">{foundOrder.productName}</p>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Order: {foundOrder.orderId}</span>
                          <span>SKU: {foundOrder.sku}</span>
                          <span>Platform: {getPlatformById(foundOrder.platformId)?.name}</span>
                        </div>
                      </div>
                      <Badge variant="outline">{foundOrder.status}</Badge>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="orderId">Order ID</Label>
                      <Input
                        id="orderId"
                        value={formData.orderId}
                        onChange={(e) => setFormData(prev => ({ ...prev, orderId: e.target.value }))}
                        placeholder="Order ID"
                        className="bg-secondary/50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subOrderId">Sub Order ID</Label>
                      <Input
                        id="subOrderId"
                        value={formData.subOrderId}
                        onChange={(e) => setFormData(prev => ({ ...prev, subOrderId: e.target.value }))}
                        placeholder="Sub Order ID"
                        className="bg-secondary/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU</Label>
                      <Input
                        id="sku"
                        value={formData.sku}
                        onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                        placeholder="SKU"
                        className="bg-secondary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="returnDate">Return Date</Label>
                      <Input
                        id="returnDate"
                        type="date"
                        value={formData.returnDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, returnDate: e.target.value }))}
                        className="bg-secondary/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="productName">Product Name</Label>
                    <Input
                      id="productName"
                      value={formData.productName}
                      onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                      placeholder="Product name"
                      className="bg-secondary/50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Product Condition</Label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={formData.condition === 'good' ? 'default' : 'outline'}
                        className={formData.condition === 'good' ? 'bg-success hover:bg-success/90' : ''}
                        onClick={() => setFormData(prev => ({ ...prev, condition: 'good' }))}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Good
                      </Button>
                      <Button
                        type="button"
                        variant={formData.condition === 'bad' ? 'default' : 'outline'}
                        className={formData.condition === 'bad' ? 'bg-destructive hover:bg-destructive/90' : ''}
                        onClick={() => setFormData(prev => ({ ...prev, condition: 'bad' }))}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Damaged
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes about the return"
                      className="bg-secondary/50"
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-primary hover:bg-primary/90">Record Return</Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingReturns.length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{returns.filter(r => r.addedToInventory).length}</p>
                <p className="text-sm text-muted-foreground">Restocked</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{returns.filter(r => r.addedToDeadStock).length}</p>
                <p className="text-sm text-muted-foreground">Dead Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Date Filter */}
      <Card className="bg-card/80 backdrop-blur-xl border-border/50">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search returns by Order ID, Product, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-secondary/50 border-border/50"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                placeholder="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-secondary/50 border-border/50"
              />
              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Returns */}
      <Card className="bg-card/80 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-warning" />
            Pending Returns ({pendingReturns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12">
              <LoadingSpinner size="lg" text="Loading returns..." />
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="data-table-header border-border/50">
                    <TableHead className="text-muted-foreground w-[50px]">View</TableHead>
                    <TableHead className="text-muted-foreground">Order ID</TableHead>
                    <TableHead className="text-muted-foreground">Product</TableHead>
                    <TableHead className="text-muted-foreground">Company</TableHead>
                    <TableHead className="text-muted-foreground">Date</TableHead>
                    <TableHead className="text-muted-foreground">Condition</TableHead>
                    <TableHead className="text-muted-foreground text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingReturns.length > 0 ? pendingReturns.map((item) => {
                  const company = getCompanyById(item.companyId);
                  const platform = getPlatformById(item.platformId);
                  return (
                    <TableRow key={item.id} className="border-border/30 hover:bg-secondary/30">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => viewOrderDetails(item.orderId, item.subOrderId)}
                        >
                          <Eye className="w-4 h-4 text-primary" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs">
                          <div>{item.orderId}</div>
                          <div className="text-muted-foreground">{item.subOrderId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium truncate max-w-[200px]">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">{item.sku}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{company?.name || '-'}</p>
                          <p className="text-xs text-muted-foreground">{platform?.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.returnDate).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.condition === 'good' ? 'outline' : 'destructive'} className={item.condition === 'good' ? 'border-success text-success' : ''}>
                          {item.condition}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-success text-success hover:bg-success/10"
                            onClick={() => handleProcessReturn(item, 'inventory')}
                          >
                            <Package className="w-3 h-3 mr-1" />
                            Restock
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive text-destructive hover:bg-destructive/10"
                            onClick={() => handleProcessReturn(item, 'deadstock')}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Dead Stock
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <RotateCcw className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No pending returns</p>
                        <p className="text-xs text-muted-foreground mt-1">All returns have been processed</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <OrderDetailDialog
        order={selectedOrderForView}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        platformName={selectedOrderForView ? getPlatformById(selectedOrderForView.platformId)?.name : undefined}
        companyName={selectedOrderForView ? getCompanyById(selectedOrderForView.companyId)?.name : undefined}
      />
    </div>
  );
};

export default Returns;
