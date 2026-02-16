import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import StatCard from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  RotateCcw,
  Building2,
  MapPin,
  Calendar,
  BarChart3,
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
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

const Dashboard: React.FC = () => {
  const { companies, orders, inventory, returns } = useData();
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Filter orders based on selection
  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (selectedCompany !== 'all') {
      filtered = filtered.filter(o => o.companyId === selectedCompany);
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
        case 'year':
          rangeStartDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(o => o.orderDate && new Date(o.orderDate) >= rangeStartDate);
    }

    return filtered;
  }, [orders, selectedCompany, timeRange, startDate, endDate]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const delivered = filteredOrders.filter(o => o.status?.toLowerCase() === 'delivered');
    const returned = filteredOrders.filter(o => 
      o.status?.toLowerCase().includes('return') || 
      o.status?.toLowerCase() === 'returntoseller' || 
      o.status?.toLowerCase() === 'returntosellerinitiated'
    );
    
    const totalRevenue = delivered.reduce((sum, o) => sum + (o.netAmount || 0), 0);
    const totalCost = delivered.reduce((sum, o) => {
      const invItem = inventory.find(i => i.sku === o.sku);
      const costPrice = invItem ? invItem.costPrice : (o.wholesalePrice || 0);
      return sum + (costPrice * (o.quantity || 0));
    }, 0);
    const totalCommission = delivered.reduce((sum, o) => sum + (o.commission || 0), 0);
    const totalShipping = delivered.reduce((sum, o) => sum + (o.shippingCharge || 0), 0);
    const totalTax = delivered.reduce((sum, o) => sum + (o.cgst || 0) + (o.sgst || 0) + (o.igst || 0), 0);
    
    const profit = totalRevenue - totalCost;
    const netProfit = profit - totalCommission - totalShipping;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalOrders: filteredOrders.length,
      deliveredOrders: delivered.length,
      returnedOrders: returned.length,
      totalRevenue,
      totalCost,
      profit: netProfit,
      profitMargin,
      totalCommission,
      totalShipping,
      totalTax,
      averageOrderValue: delivered.length > 0 ? totalRevenue / delivered.length : 0,
    };
  }, [filteredOrders, inventory]);

  // Platform-wise performance
  const platformPerformance = useMemo(() => {
    const platformMap = new Map<string, { name: string; revenue: number; profit: number; orders: number }>();
    
    filteredOrders.filter(o => o.status?.toLowerCase() === 'delivered').forEach(order => {
      const platform = companies.flatMap(c => c.platforms).find(p => p.id === order.platformId);
      const platformName = platform?.name || 'Unknown';
      
      const invItem = inventory.find(i => i.sku === order.sku);
      const costPrice = invItem ? invItem.costPrice : (order.wholesalePrice || 0);
      
      const existing = platformMap.get(order.platformId) || { name: platformName, revenue: 0, profit: 0, orders: 0 };
      const orderProfit = (order.netAmount || 0) - (costPrice * (order.quantity || 0)) - (order.commission || 0) - (order.shippingCharge || 0);
      
      platformMap.set(order.platformId, {
        name: platformName,
        revenue: existing.revenue + (order.netAmount || 0),
        profit: existing.profit + orderProfit,
        orders: existing.orders + 1,
      });
    });

    return Array.from(platformMap.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, companies, inventory]);

  // State-wise performance
  const statePerformance = useMemo(() => {
    const stateMap = new Map<string, { orders: number; revenue: number }>();
    
    filteredOrders.filter(o => o.status === 'delivered').forEach(order => {
      const state = order.customerState || 'Unknown';
      const existing = stateMap.get(state) || { orders: 0, revenue: 0 };
      stateMap.set(state, {
        orders: existing.orders + 1,
        revenue: existing.revenue + order.netAmount,
      });
    });

    return Array.from(stateMap.entries())
      .map(([state, data]) => ({ state, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredOrders]);

  // Top products
  const topProducts = useMemo(() => {
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    
    filteredOrders.filter(o => o.status === 'delivered').forEach(order => {
      const key = order.sku || order.productName;
      const existing = productMap.get(key) || { name: order.productName, quantity: 0, revenue: 0 };
      productMap.set(key, {
        name: order.productName,
        quantity: existing.quantity + order.quantity,
        revenue: existing.revenue + order.netAmount,
      });
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredOrders]);

  // Order status distribution
  const statusDistribution = useMemo(() => {
    const statusMap = new Map<string, number>();
    
    filteredOrders.forEach(order => {
      const status = order.status;
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    return Array.from(statusMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredOrders]);

  const COLORS = ['hsl(173, 80%, 45%)', 'hsl(35, 100%, 55%)', 'hsl(142, 76%, 45%)', 'hsl(262, 83%, 58%)', 'hsl(0, 72%, 51%)', 'hsl(200, 80%, 50%)'];

  // Daily trend data
  const dailyTrend = useMemo(() => {
    const dayMap = new Map<string, { date: string; orders: number; revenue: number; profit: number }>();
    
    filteredOrders.filter(o => o.status?.toLowerCase() === 'delivered').forEach(order => {
      const date = new Date(order.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      const existing = dayMap.get(date) || { date, orders: 0, revenue: 0, profit: 0 };
      
      const invItem = inventory.find(i => i.sku === order.sku);
      const costPrice = invItem ? invItem.costPrice : (order.wholesalePrice || 0);
      const orderProfit = (order.netAmount || 0) - (costPrice * (order.quantity || 0)) - (order.commission || 0) - (order.shippingCharge || 0);

      dayMap.set(date, {
        date,
        orders: existing.orders + 1,
        revenue: existing.revenue + (order.netAmount || 0),
        profit: existing.profit + orderProfit,
      });
    });

    return Array.from(dayMap.values()).slice(-30);
  }, [filteredOrders, inventory]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Track your e-commerce performance across all platforms</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[180px] bg-secondary/50 border-border/50">
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
          <Select value={timeRange} onValueChange={(v) => { setTimeRange(v); if (v !== 'custom') { setStartDate(''); setEndDate(''); } }}>
            <SelectTrigger className="w-[150px] bg-secondary/50 border-border/50">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={`₹${metrics.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          change={12.5}
          icon={IndianRupee}
          variant="primary"
        />
        <StatCard
          title="Profit/Loss"
          value={`₹${Math.abs(metrics.profit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          change={metrics.profitMargin}
          changeLabel={metrics.profit >= 0 ? 'profit margin' : 'loss margin'}
          icon={metrics.profit >= 0 ? TrendingUp : TrendingDown}
          variant={metrics.profit >= 0 ? 'success' : 'destructive'}
        />
        <StatCard
          title="Total Orders"
          value={metrics.totalOrders}
          change={8.2}
          icon={ShoppingCart}
          variant="default"
        />
        <StatCard
          title="Returns"
          value={metrics.returnedOrders}
          change={-5.3}
          icon={RotateCcw}
          variant="warning"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Average Order Value"
          value={`₹${metrics.averageOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          icon={IndianRupee}
          variant="default"
        />
        <StatCard
          title="Total Commission Paid"
          value={`₹${metrics.totalCommission.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          icon={TrendingDown}
          variant="warning"
        />
        <StatCard
          title="Inventory Items"
          value={inventory.length}
          icon={Package}
          variant="primary"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {dailyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrend}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
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
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="hsl(173, 80%, 45%)"
                    strokeWidth={2}
                    fill="url(#colorRevenue)"
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
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-sm">No data available for the selected period</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(222, 47%, 9%)',
                      border: '1px solid hsl(222, 30%, 18%)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-sm">No order data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Performance */}
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Platform-wise Profit & Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {platformPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                    <XAxis dataKey="name" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                    <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(222, 47%, 9%)',
                        border: '1px solid hsl(222, 30%, 18%)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(173, 80%, 45%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Profit/Loss" fill="hsl(142, 76%, 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-sm">No platform data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProducts.length > 0 ? topProducts.map((product, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.quantity} units sold</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-primary font-mono">
                    ₹{product.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              )) : (
                <p className="text-center text-muted-foreground py-8">No product data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* State Performance */}
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-accent" />
              State-wise Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statePerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                  <XAxis type="number" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                  <YAxis dataKey="state" type="category" stroke="hsl(215, 20%, 55%)" fontSize={10} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(222, 47%, 9%)',
                      border: '1px solid hsl(222, 30%, 18%)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="hsl(35, 100%, 55%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Info */}
      {orders.length === 0 && (
        <Card className="bg-card/80 backdrop-blur-xl border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Data Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Start by creating a company and uploading your sales, payment, and GST data to see analytics here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
