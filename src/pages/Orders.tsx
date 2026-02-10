import React, { useState, useMemo } from 'react';
import { useData, Order } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { LoadingSpinner, LoadingSkeleton } from '@/components/LoadingSpinner';
import {
  Search,
  Filter,
  Download,
  ShoppingCart,
  Building2,
  Store,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import OrderDetailDialog from '@/components/orders/OrderDetailDialog';

const Orders: React.FC = () => {
  const { companies, orders, getPlatformById, getCompanyById, loading } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const itemsPerPage = 20;

  // Get all platforms
  const allPlatforms = useMemo(() => {
    return companies.flatMap(c => c.platforms);
  }, [companies]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        order.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.subOrderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCompany = selectedCompany === 'all' || order.companyId === selectedCompany;
      const matchesPlatform = selectedPlatform === 'all' || order.platformId === selectedPlatform;
      const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
      
      let matchesDate = true;
      if (startDate && order.orderDate) {
        matchesDate = matchesDate && new Date(order.orderDate) >= new Date(startDate);
      }
      if (endDate && order.orderDate) {
        matchesDate = matchesDate && new Date(order.orderDate) <= new Date(endDate + 'T23:59:59');
      }

      return matchesSearch && matchesCompany && matchesPlatform && matchesStatus && matchesDate;
    });
  }, [orders, searchQuery, selectedCompany, selectedPlatform, selectedStatus, startDate, endDate]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get unique statuses
  const uniqueStatuses = useMemo(() => {
    return [...new Set(orders.map(o => o.status).filter(Boolean))];
  }, [orders]);

  const getStatusColor = (status: string) => {
    if (status === 'delivered') return 'bg-success/20 text-success border-success/30';
    if (status.includes('return') || status === 'returntoseller') return 'bg-warning/20 text-warning border-warning/30';
    if (status === 'canceled' || status === 'faileddelivery') return 'bg-destructive/20 text-destructive border-destructive/30';
    if (status.includes('pending') || status === 'outfordelivery') return 'bg-primary/20 text-primary border-primary/30';
    return 'bg-muted text-muted-foreground';
  };

  const exportToCSV = () => {
    const headers = ['Order ID', 'Sub Order ID', 'Product', 'Quantity', 'Status', 'Order Date', 'Customer', 'State', 'Net Amount', 'Refund', 'Deduction'];
    const rows = filteredOrders.map(o => [
      o.orderId, o.subOrderId, o.productName, o.quantity, o.status, o.orderDate, o.customerName, o.customerState, o.netAmount, o.refundAmount, o.deductionAmount
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const viewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground">View and manage all orders across platforms</p>
        </div>
        <Button variant="outline" onClick={exportToCSV} className="border-primary/30">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card/80 backdrop-blur-xl border-border/50">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders, products, customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/50"
                />
              </div>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <Building2 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <Store className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {allPlatforms.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {uniqueStatuses.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
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
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="bg-card/80 backdrop-blur-xl border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Orders ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12">
              <LoadingSpinner size="lg" text="Loading orders from master files..." />
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div className="min-w-[1200px]">
                <Table>
                  <TableHeader>
                    <TableRow className="data-table-header border-border/50">
                      <TableHead className="text-muted-foreground w-[50px]">View</TableHead>
                      <TableHead className="text-muted-foreground">Order ID</TableHead>
                      <TableHead className="text-muted-foreground">Product</TableHead>
                      <TableHead className="text-muted-foreground">Platform</TableHead>
                      <TableHead className="text-muted-foreground">Qty</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Date</TableHead>
                      <TableHead className="text-muted-foreground">Customer</TableHead>
                      <TableHead className="text-muted-foreground text-right">Amount</TableHead>
                      <TableHead className="text-muted-foreground text-right">Refund</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOrders.length > 0 ? paginatedOrders.map((order, idx) => {
                    const platform = getPlatformById(order.platformId);
                    const company = getCompanyById(order.companyId);
                    return (
                      <TableRow 
                        key={order.id} 
                        className="border-border/30 hover:bg-secondary/30 animate-fade-in"
                        style={{ animationDelay: `${idx * 0.02}s` }}
                      >
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => viewOrderDetails(order)}
                          >
                            <Eye className="w-4 h-4 text-primary" />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-xs">
                            <div className="text-foreground">{order.orderId}</div>
                            <div className="text-muted-foreground">{order.subOrderId}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <p className="text-sm font-medium text-foreground truncate">{order.productName}</p>
                            {order.sku && <p className="text-xs text-muted-foreground">{order.sku}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{platform?.name || '-'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{order.quantity}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(order.status)}>
                            {order.status || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN') : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm truncate max-w-[120px] block">{order.customerName || '-'}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-sm font-medium text-primary">
                            ₹{(order.netAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-sm text-destructive">
                            {order.refundAmount ? `₹${order.refundAmount.toLocaleString('en-IN')}` : '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={10} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <ShoppingCart className="w-8 h-8 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No orders found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <OrderDetailDialog
        order={selectedOrder}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        platformName={selectedOrder ? getPlatformById(selectedOrder.platformId)?.name : undefined}
        companyName={selectedOrder ? getCompanyById(selectedOrder.companyId)?.name : undefined}
      />
    </div>
  );
};

export default Orders;
