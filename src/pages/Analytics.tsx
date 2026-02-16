import React, { useState, useMemo } from 'react';
import { useData, Order } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Package,
  RotateCcw,
  Building2,
  MapPin,
  Calendar,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

interface ProductAnalysis {
  sku: string;
  productName: string;
  totalQuantity: number;
  sellingPrice: number;
  wholesalePrice: number;
  totalSales: number;
  totalCost: number;
  commission: number;
  shipping: number;
  gst: number;
  refunds: number;
  deductions: number;
  netProfit: number;
  profitMargin: number;
  returnCount: number;
  returnRate: number;
  orders: number;
}

interface StateAnalysis {
  state: string;
  orders: number;
  revenue: number;
  returns: number;
  returnRate: number;
  profit: number;
}

const formatCurrency = (value: number) => `₹${Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const Analytics: React.FC = () => {
  const { companies, orders, returns, inventory } = useData();
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Get available platforms for selected company
  const availablePlatforms = useMemo(() => {
    if (selectedCompany === 'all') {
      return companies.flatMap(c => c.platforms);
    }
    const company = companies.find(c => c.id === selectedCompany);
    return company?.platforms || [];
  }, [companies, selectedCompany]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (selectedCompany !== 'all') {
      filtered = filtered.filter(o => o.companyId === selectedCompany);
    }

    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(o => o.platformId === selectedPlatform);
    }

    // Apply date range filter
    if (startDate || endDate) {
      // Custom date range takes precedence
      if (startDate) {
        filtered = filtered.filter(o => o.orderDate && new Date(o.orderDate) >= new Date(startDate));
      }
      if (endDate) {
        filtered = filtered.filter(o => o.orderDate && new Date(o.orderDate) <= new Date(endDate + 'T23:59:59'));
      }
    } else if (timeRange !== 'all') {
      const now = new Date();
      const rangeStartDate = new Date();
      
      switch (timeRange) {
        case 'day':
          rangeStartDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          rangeStartDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          rangeStartDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          rangeStartDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          rangeStartDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(o => o.orderDate && new Date(o.orderDate) >= rangeStartDate);
    }

    return filtered;
  }, [orders, selectedCompany, selectedPlatform, timeRange, startDate, endDate]);

  // Product-wise analysis with proper P&L calculation
  const productAnalysis = useMemo(() => {
    const productMap = new Map<string, ProductAnalysis>();

    filteredOrders.forEach(order => {
      const key = order.sku || order.productName || 'Unknown';
      const isDelivered = order.status?.toLowerCase().includes('deliver');
      const isReturned = order.status?.toLowerCase().includes('return');

      const existing = productMap.get(key) || {
        sku: order.sku || '',
        productName: order.productName || 'Unknown',
        totalQuantity: 0,
        sellingPrice: order.sellingPrice || 0,
        wholesalePrice: order.wholesalePrice || 0,
        totalSales: 0,
        totalCost: 0,
        commission: 0,
        shipping: 0,
        gst: 0,
        refunds: 0,
        deductions: 0,
        netProfit: 0,
        profitMargin: 0,
        returnCount: 0,
        orders: 0,
        returnRate: 0,
      };

      existing.orders += 1;
      existing.totalQuantity += order.quantity || 0;

      if (isDelivered) {
        // Find matching inventory item for real cost price
        const invItem = inventory.find(i => i.sku === order.sku);
        const costPrice = invItem ? invItem.costPrice : (order.wholesalePrice || 0);
        
        // Revenue calculation using Selling Price
        const revenue = (order.sellingPrice || 0) * (order.quantity || 1);
        const cost = costPrice * (order.quantity || 1);
        
        existing.totalSales += revenue;
        existing.totalCost += cost;
        existing.commission += order.commission || 0;
        existing.shipping += order.shippingCharge || order.shipperCharge || 0;
        existing.gst += (order.cgst || 0) + (order.sgst || 0) + (order.igst || 0);
      }

      if (isReturned) {
        existing.returnCount += 1;
      }

      // Refunds and deductions
      existing.refunds += order.refundAmount || 0;
      existing.deductions += order.deductionAmount || 0;

      productMap.set(key, existing);
    });

    // Calculate profit and margin for each product
    return Array.from(productMap.values()).map(product => {
      // Net Profit = Sales - Cost - Commission - Shipping - Refunds - Deductions
      const netProfit = product.totalSales - product.totalCost - product.commission - 
                        product.shipping - product.refunds - product.deductions;
      
      const profitMargin = product.totalSales > 0 
        ? (netProfit / product.totalSales) * 100 
        : 0;

      const returnRate = product.orders > 0 
        ? (product.returnCount / product.orders) * 100 
        : 0;

      return {
        ...product,
        netProfit,
        profitMargin,
        returnRate,
      };
    }).sort((a, b) => b.totalSales - a.totalSales);
  }, [filteredOrders]);

  // High return products (return rate > 10%)
  const highReturnProducts = useMemo(() => {
    return productAnalysis
      .filter(p => p.returnCount > 0)
      .sort((a, b) => b.returnRate - a.returnRate)
      .slice(0, 10);
  }, [productAnalysis]);

  // Loss-making products
  const lossProducts = useMemo(() => {
    return productAnalysis
      .filter(p => p.netProfit < 0)
      .sort((a, b) => a.netProfit - b.netProfit);
  }, [productAnalysis]);

  // Profitable products
  const profitableProducts = useMemo(() => {
    return productAnalysis
      .filter(p => p.netProfit > 0)
      .sort((a, b) => b.netProfit - a.netProfit)
      .slice(0, 10);
  }, [productAnalysis]);

  // State-wise analysis including returns
  const stateAnalysis = useMemo(() => {
    const stateMap = new Map<string, StateAnalysis>();

    filteredOrders.forEach(order => {
      const state = order.customerState || 'Unknown';
      const isDelivered = order.status?.toLowerCase().includes('deliver');
      const isReturned = order.status?.toLowerCase().includes('return');

      const existing = stateMap.get(state) || {
        state,
        orders: 0,
        revenue: 0,
        returns: 0,
        returnRate: 0,
        profit: 0,
      };

      existing.orders += 1;

      if (isDelivered) {
        const invItem = inventory.find(i => i.sku === order.sku);
        const costPrice = invItem ? invItem.costPrice : (order.wholesalePrice || 0);
        
        const revenue = (order.sellingPrice || 0) * (order.quantity || 1);
        const cost = costPrice * (order.quantity || 1);
        existing.revenue += revenue;
        existing.profit += revenue - cost - (order.commission || 0) - 
                          (order.shippingCharge || 0) - (order.refundAmount || 0) - 
                          (order.deductionAmount || 0);
      }

      if (isReturned) {
        existing.returns += 1;
      }

      stateMap.set(state, existing);
    });

    return Array.from(stateMap.values())
      .map(s => ({
        ...s,
        returnRate: s.orders > 0 ? (s.returns / s.orders) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  // High return states
  const highReturnStates = useMemo(() => {
    return stateAnalysis
      .filter(s => s.returns > 0)
      .sort((a, b) => b.returnRate - a.returnRate)
      .slice(0, 10);
  }, [stateAnalysis]);

  // Overall metrics
  const overallMetrics = useMemo(() => {
    const delivered = filteredOrders.filter(o => o.status?.toLowerCase().includes('deliver'));
    const returned = filteredOrders.filter(o => o.status?.toLowerCase().includes('return'));

    const totalSales = delivered.reduce((sum, o) => 
      sum + ((o.sellingPrice || 0) * (o.quantity || 1)), 0);
    
    const totalCost = delivered.reduce((sum, o) => {
      const invItem = inventory.find(i => i.sku === o.sku);
      const costPrice = invItem ? invItem.costPrice : (o.wholesalePrice || 0);
      return sum + (costPrice * (o.quantity || 1));
    }, 0);
    
    const totalCommission = delivered.reduce((sum, o) => sum + (o.commission || 0), 0);
    const totalShipping = delivered.reduce((sum, o) => sum + (o.shippingCharge || o.shipperCharge || 0), 0);
    const totalGST = delivered.reduce((sum, o) => sum + (o.cgst || 0) + (o.sgst || 0) + (o.igst || 0), 0);
    const totalRefunds = filteredOrders.reduce((sum, o) => sum + (o.refundAmount || 0), 0);
    const totalDeductions = filteredOrders.reduce((sum, o) => sum + (o.deductionAmount || 0), 0);
    const totalTCS = delivered.reduce((sum, o) => sum + (o.tcs || 0), 0);
    const totalTDS = delivered.reduce((sum, o) => sum + (o.tds || 0), 0);

    const netProfit = totalSales - totalCost - totalCommission - totalShipping - 
                      totalRefunds - totalDeductions;

    return {
      totalOrders: filteredOrders.length,
      deliveredOrders: delivered.length,
      returnedOrders: returned.length,
      returnRate: filteredOrders.length > 0 ? (returned.length / filteredOrders.length) * 100 : 0,
      totalSales,
      totalCost,
      grossProfit: totalSales - totalCost,
      totalCommission,
      totalShipping,
      totalGST,
      totalRefunds,
      totalDeductions,
      totalTCS,
      totalTDS,
      netProfit,
      profitMargin: totalSales > 0 ? (netProfit / totalSales) * 100 : 0,
    };
  }, [filteredOrders]);

  // Daily profit trend
  const profitTrend = useMemo(() => {
    const dayMap = new Map<string, { date: string; sales: number; profit: number; orders: number }>();

    filteredOrders.filter(o => o.status?.toLowerCase().includes('deliver')).forEach(order => {
      const date = order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Unknown';
      const existing = dayMap.get(date) || { date, sales: 0, profit: 0, orders: 0 };
      
      const invItem = inventory.find(i => i.sku === order.sku);
      const costPrice = invItem ? invItem.costPrice : (order.wholesalePrice || 0);
      
      const revenue = (order.sellingPrice || 0) * (order.quantity || 1);
      const cost = costPrice * (order.quantity || 1);
      const profit = revenue - cost - (order.commission || 0) - (order.shippingCharge || 0) - 
                    (order.refundAmount || 0) - (order.deductionAmount || 0);

      dayMap.set(date, {
        date,
        sales: existing.sales + revenue,
        profit: existing.profit + profit,
        orders: existing.orders + 1,
      });
    });

    return Array.from(dayMap.values()).slice(-30);
  }, [filteredOrders]);

  const COLORS = ['hsl(173, 80%, 45%)', 'hsl(35, 100%, 55%)', 'hsl(142, 76%, 45%)', 'hsl(262, 83%, 58%)', 'hsl(0, 72%, 51%)', 'hsl(200, 80%, 50%)'];

  const formatCurrency = (value: number) => `₹${Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profit & Loss Analytics</h1>
          <p className="text-muted-foreground">Comprehensive business analysis with item-wise P&L</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={selectedCompany} onValueChange={(v) => { setSelectedCompany(v); setSelectedPlatform('all'); }}>
            <SelectTrigger className="w-[160px] bg-secondary/50 border-border/50">
              <Building2 className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger className="w-[140px] bg-secondary/50 border-border/50">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {availablePlatforms.map(platform => (
                <SelectItem key={platform.id} value={platform.id}>{platform.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={(v) => { setTimeRange(v); if (v !== 'custom') { setStartDate(''); setEndDate(''); } }}>
            <SelectTrigger className="w-[130px] bg-secondary/50 border-border/50">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          {timeRange === 'custom' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                placeholder="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[140px] bg-secondary/50 border-border/50"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                placeholder="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[140px] bg-secondary/50 border-border/50"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Sales</p>
            <p className="text-xl font-bold text-primary mt-1">{formatCurrency(overallMetrics.totalSales)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Cost of Goods</p>
            <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(overallMetrics.totalCost)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Gross Profit</p>
            <p className="text-xl font-bold text-accent mt-1">{formatCurrency(overallMetrics.grossProfit)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Deductions</p>
            <p className="text-xl font-bold text-destructive mt-1">
              {formatCurrency(overallMetrics.totalCommission + overallMetrics.totalShipping + overallMetrics.totalRefunds + overallMetrics.totalDeductions)}
            </p>
          </CardContent>
        </Card>
        <Card className={`backdrop-blur-xl border-border/50 ${overallMetrics.netProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Net Profit/Loss</p>
            <div className="flex items-center gap-2 mt-1">
              {overallMetrics.netProfit >= 0 ? (
                <TrendingUp className="w-5 h-5 text-success" />
              ) : (
                <TrendingDown className="w-5 h-5 text-destructive" />
              )}
              <p className={`text-xl font-bold ${overallMetrics.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {overallMetrics.netProfit < 0 && '-'}{formatCurrency(overallMetrics.netProfit)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Return Rate</p>
            <div className="flex items-center gap-2 mt-1">
              <RotateCcw className="w-4 h-4 text-warning" />
              <p className="text-xl font-bold text-warning">{overallMetrics.returnRate.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deductions Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-secondary/30 border-border/30">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Commission</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(overallMetrics.totalCommission)}</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/30 border-border/30">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Shipping</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(overallMetrics.totalShipping)}</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/30 border-border/30">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Refunds</p>
            <p className="text-lg font-semibold text-destructive">{formatCurrency(overallMetrics.totalRefunds)}</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/30 border-border/30">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Deductions</p>
            <p className="text-lg font-semibold text-destructive">{formatCurrency(overallMetrics.totalDeductions)}</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/30 border-border/30">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">TCS</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(overallMetrics.totalTCS)}</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/30 border-border/30">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">TDS</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(overallMetrics.totalTDS)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Product P&L
          </TabsTrigger>
          <TabsTrigger value="returns" className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            High Returns
          </TabsTrigger>
          <TabsTrigger value="states" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            State Analysis
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Trends
          </TabsTrigger>
        </TabsList>

        {/* Product P&L Tab */}
        <TabsContent value="products" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profitable Products */}
            <Card className="bg-card/80 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-success" />
                  Top Profitable Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px]">
                  <div className="space-y-3 pr-4">
                    {profitableProducts.length > 0 ? profitableProducts.map((product, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-success/5 border border-success/20 hover:bg-success/10 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{product.productName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{product.sku || 'No SKU'} • {product.orders} orders</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <p className="text-sm font-bold text-success">{formatCurrency(product.netProfit)}</p>
                            <p className="text-xs text-muted-foreground">{product.profitMargin.toFixed(1)}% margin</p>
                          </div>
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Sales: {formatCurrency(product.totalSales)}</span>
                          <span>Cost: {formatCurrency(product.totalCost)}</span>
                        </div>
                      </div>
                    )) : (
                      <p className="text-center text-muted-foreground py-8">No profitable products found</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Loss Making Products */}
            <Card className="bg-card/80 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                  Loss Making Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px]">
                  <div className="space-y-3 pr-4">
                    {lossProducts.length > 0 ? lossProducts.map((product, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 hover:bg-destructive/10 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{product.productName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{product.sku || 'No SKU'} • {product.orders} orders</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <p className="text-sm font-bold text-destructive">-{formatCurrency(product.netProfit)}</p>
                            <p className="text-xs text-muted-foreground">{product.profitMargin.toFixed(1)}% margin</p>
                          </div>
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Sales: {formatCurrency(product.totalSales)}</span>
                          <span>Refunds: {formatCurrency(product.refunds)}</span>
                          <span>Returns: {product.returnCount}</span>
                        </div>
                      </div>
                    )) : (
                      <p className="text-center text-muted-foreground py-8">No loss-making products - Great!</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* All Products Table */}
          <Card className="bg-card/80 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                All Products P&L Report
              </CardTitle>
              <CardDescription>Complete item-wise profit and loss breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="min-w-[800px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card z-10">
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Product</th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">Qty</th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">Sales</th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">Cost</th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">Commission</th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">Shipping</th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">Refunds</th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">Net P&L</th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">Margin</th>
                        <th className="text-center py-3 px-2 font-medium text-muted-foreground">Returns</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productAnalysis.map((product, idx) => (
                        <tr key={idx} className="border-b border-border/50 hover:bg-secondary/30">
                          <td className="py-3 px-2">
                            <p className="font-medium truncate max-w-[200px]">{product.productName}</p>
                            <p className="text-xs text-muted-foreground">{product.sku || '-'}</p>
                          </td>
                          <td className="text-right py-3 px-2">{product.totalQuantity}</td>
                          <td className="text-right py-3 px-2 text-primary font-medium">{formatCurrency(product.totalSales)}</td>
                          <td className="text-right py-3 px-2">{formatCurrency(product.totalCost)}</td>
                          <td className="text-right py-3 px-2">{formatCurrency(product.commission)}</td>
                          <td className="text-right py-3 px-2">{formatCurrency(product.shipping)}</td>
                          <td className="text-right py-3 px-2 text-destructive">{formatCurrency(product.refunds)}</td>
                          <td className={`text-right py-3 px-2 font-bold ${product.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {product.netProfit < 0 && '-'}{formatCurrency(product.netProfit)}
                          </td>
                          <td className={`text-right py-3 px-2 ${product.profitMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {product.profitMargin.toFixed(1)}%
                          </td>
                          <td className="text-center py-3 px-2">
                            {product.returnCount > 0 ? (
                              <Badge variant={product.returnRate > 10 ? 'destructive' : 'secondary'} className="text-xs">
                                {product.returnCount} ({product.returnRate.toFixed(0)}%)
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* High Returns Tab */}
        <TabsContent value="returns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* High Return Products */}
            <Card className="bg-card/80 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  High Return Products
                </CardTitle>
                <CardDescription>Products with highest return rates - needs attention</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {highReturnProducts.length > 0 ? highReturnProducts.map((product, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-warning/5 border border-warning/20">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">{product.productName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{product.sku || 'No SKU'}</p>
                          </div>
                          <Badge variant="destructive" className="ml-4">
                            {product.returnRate.toFixed(1)}% Return Rate
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-3 text-xs">
                          <div>
                            <p className="text-muted-foreground">Total Orders</p>
                            <p className="font-semibold text-foreground">{product.orders}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Returns</p>
                            <p className="font-semibold text-destructive">{product.returnCount}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Loss from Returns</p>
                            <p className="font-semibold text-destructive">{formatCurrency(product.refunds)}</p>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <p className="text-center text-muted-foreground py-8">No high return products - Excellent!</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Return Rate by State */}
            <Card className="bg-card/80 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-destructive" />
                  High Return States
                </CardTitle>
                <CardDescription>States with highest return rates</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {highReturnStates.length > 0 ? highReturnStates.map((state, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">{state.state}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{state.orders} orders</p>
                          </div>
                          <Badge variant="destructive">
                            {state.returnRate.toFixed(1)}% Return
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-3 text-xs">
                          <div>
                            <p className="text-muted-foreground">Revenue</p>
                            <p className="font-semibold text-primary">{formatCurrency(state.revenue)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Returns</p>
                            <p className="font-semibold text-destructive">{state.returns}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Profit</p>
                            <p className={`font-semibold ${state.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {formatCurrency(state.profit)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <p className="text-center text-muted-foreground py-8">No return data available</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* State Analysis Tab */}
        <TabsContent value="states" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* State Revenue Chart */}
            <Card className="bg-card/80 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">State-wise Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stateAnalysis.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                      <XAxis type="number" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                      <YAxis dataKey="state" type="category" stroke="hsl(215, 20%, 55%)" fontSize={10} width={100} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(222, 47%, 9%)',
                          border: '1px solid hsl(222, 30%, 18%)',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                      />
                      <Bar dataKey="revenue" fill="hsl(173, 80%, 45%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* State Profit Chart */}
            <Card className="bg-card/80 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">State-wise Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stateAnalysis.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                      <XAxis type="number" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                      <YAxis dataKey="state" type="category" stroke="hsl(215, 20%, 55%)" fontSize={10} width={100} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(222, 47%, 9%)',
                          border: '1px solid hsl(222, 30%, 18%)',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [formatCurrency(value), 'Profit']}
                      />
                      <Bar 
                        dataKey="profit" 
                        fill="hsl(142, 76%, 45%)" 
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* State Table */}
          <Card className="bg-card/80 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Complete State Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">State</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Orders</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Revenue</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Returns</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Return Rate</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stateAnalysis.map((state, idx) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="py-3 px-2 font-medium">{state.state}</td>
                        <td className="text-right py-3 px-2">{state.orders}</td>
                        <td className="text-right py-3 px-2 text-primary font-medium">{formatCurrency(state.revenue)}</td>
                        <td className="text-right py-3 px-2 text-destructive">{state.returns}</td>
                        <td className="text-right py-3 px-2">
                          <Badge variant={state.returnRate > 10 ? 'destructive' : 'secondary'} className="text-xs">
                            {state.returnRate.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className={`text-right py-3 px-2 font-bold ${state.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(state.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          {/* Profit Trend Chart */}
          <Card className="bg-card/80 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Daily Sales & Profit Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={profitTrend}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(173, 80%, 45%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(173, 80%, 45%)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                    <XAxis dataKey="date" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                    <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(222, 47%, 9%)',
                        border: '1px solid hsl(222, 30%, 18%)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => [formatCurrency(value), name === 'sales' ? 'Sales' : 'Profit']}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      name="Sales"
                      stroke="hsl(173, 80%, 45%)"
                      strokeWidth={2}
                      fill="url(#colorSales)"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      name="Profit"
                      stroke="hsl(142, 76%, 45%)"
                      strokeWidth={2}
                      fill="url(#colorProfit)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {orders.length === 0 && (
        <Card className="bg-card/80 backdrop-blur-xl border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Data Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Upload your sales, payment, and GST data to see comprehensive profit & loss analytics.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Analytics;