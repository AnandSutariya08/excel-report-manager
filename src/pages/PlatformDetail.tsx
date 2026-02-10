import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Store,
  ShoppingCart,
  TrendingUp,
  Package,
  IndianRupee,
  Search,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';

const PlatformDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPlatformById, getCompanyById, getOrdersByPlatform } = useData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const platform = getPlatformById(id || '');
  const company = platform ? getCompanyById(platform.companyId) : undefined;
  const platformOrders = useMemo(() => getOrdersByPlatform(id || ''), [id, getOrdersByPlatform]);
  
  const filteredOrders = useMemo(() => {
    return platformOrders.filter(order => {
      const matchesSearch = 
        order.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.subOrderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.productName.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesDate = true;
      if (startDate && order.orderDate) {
        matchesDate = matchesDate && new Date(order.orderDate) >= new Date(startDate);
      }
      if (endDate && order.orderDate) {
        matchesDate = matchesDate && new Date(order.orderDate) <= new Date(endDate + 'T23:59:59');
      }

      return matchesSearch && matchesDate;
    });
  }, [platformOrders, searchQuery, startDate, endDate]);
  
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Calculate stats
  const stats = useMemo(() => {
    const totalSales = platformOrders.reduce((sum, o) => sum + (o.netAmount || 0), 0);
    const totalOrders = platformOrders.length;
    const deliveredOrders = platformOrders.filter(o => o.status === 'delivered').length;
    const returnedOrders = platformOrders.filter(o => o.status.includes('return')).length;
    const totalRefunds = platformOrders.reduce((sum, o) => sum + (o.refundAmount || 0), 0);
    const totalDeductions = platformOrders.reduce((sum, o) => sum + (o.deductionAmount || 0), 0);
    const netProfit = totalSales - totalRefunds - totalDeductions;
    
    return { totalSales, totalOrders, deliveredOrders, returnedOrders, totalRefunds, totalDeductions, netProfit };
  }, [platformOrders]);
  
  const getStatusColor = (status: string) => {
    if (status === 'delivered') return 'bg-success/20 text-success border-success/30';
    if (status.includes('return')) return 'bg-warning/20 text-warning border-warning/30';
    if (status === 'canceled') return 'bg-destructive/20 text-destructive border-destructive/30';
    return 'bg-primary/20 text-primary border-primary/30';
  };
  
  const exportToCSV = () => {
    const headers = ['Order ID', 'Sub Order ID', 'Product', 'Qty', 'Status', 'Date', 'Net Amount', 'Refund', 'Deduction'];
    const rows = filteredOrders.map(o => [
      o.orderId, o.subOrderId, o.productName, o.quantity, o.status, o.orderDate, o.netAmount, o.refundAmount, o.deductionAmount
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${platform?.name}-orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };
  
  if (!platform || !company) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Store className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">Platform not found</h2>
        <Button variant="outline" onClick={() => navigate('/companies')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Companies
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/company/${company.id}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Store className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">{platform.name}</h1>
            </div>
            <p className="text-muted-foreground">{company.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => navigate('/upload')}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Upload Data
          </Button>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Orders</span>
            </div>
            <p className="text-xl font-bold mt-1">{stats.totalOrders}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Delivered</span>
            </div>
            <p className="text-xl font-bold mt-1 text-success">{stats.deliveredOrders}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-warning" />
              <span className="text-xs text-muted-foreground">Returns</span>
            </div>
            <p className="text-xl font-bold mt-1 text-warning">{stats.returnedOrders}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Sales</span>
            </div>
            <p className="text-lg font-bold mt-1">₹{stats.totalSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Refunds</span>
            </div>
            <p className="text-lg font-bold mt-1 text-destructive">₹{stats.totalRefunds.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-warning" />
              <span className="text-xs text-muted-foreground">Deductions</span>
            </div>
            <p className="text-lg font-bold mt-1 text-warning">₹{stats.totalDeductions.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Net Profit</span>
            </div>
            <p className="text-lg font-bold mt-1 text-success">₹{stats.netProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
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
                placeholder="Search orders..."
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
      
      {/* Orders Table */}
      <Card className="bg-card/80 backdrop-blur-xl border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Platform Orders ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="min-w-[1000px]">
              <Table>
                <TableHeader>
                  <TableRow className="data-table-header border-border/50">
                    <TableHead className="text-muted-foreground">Order ID</TableHead>
                    <TableHead className="text-muted-foreground">Product</TableHead>
                    <TableHead className="text-muted-foreground">Qty</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Date</TableHead>
                    <TableHead className="text-muted-foreground text-right">Amount</TableHead>
                    <TableHead className="text-muted-foreground text-right">Refund</TableHead>
                    <TableHead className="text-muted-foreground text-right">Deduction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.length > 0 ? paginatedOrders.map((order, idx) => (
                    <TableRow 
                      key={order.id} 
                      className="border-border/30 hover:bg-secondary/30 cursor-pointer"
                    >
                      <TableCell>
                        <div className="font-mono text-xs">
                          <div>{order.orderId}</div>
                          <div className="text-muted-foreground">{order.subOrderId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium truncate max-w-[200px]">{order.productName}</p>
                      </TableCell>
                      <TableCell className="font-mono">{order.quantity}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN') : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-primary">
                        ₹{(order.netAmount || 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        {order.refundAmount ? `₹${order.refundAmount.toLocaleString('en-IN')}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-warning">
                        {order.deductionAmount ? `₹${order.deductionAmount.toLocaleString('en-IN')}` : '-'}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
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
    </div>
  );
};

export default PlatformDetail;
