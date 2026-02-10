import { useState } from 'react';
import { useData, Order } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  ScanLine, 
  QrCode, 
  Package, 
  Search, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  PackageCheck,
  PackageX,
  Eye,
  LogOut,
  User
} from 'lucide-react';

const EMPLOYEE_CREDENTIALS = { username: 'employee', password: '123' };

const EmployeeReturn = () => {
  const { orders, companies, addReturn, returns, addInventoryItem, updateReturn, addDeadStock } = useData();
  const { toast } = useToast();
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  // Scan state
  const [scanInput, setScanInput] = useState('');
  const [scanMode, setScanMode] = useState<'barcode' | 'qr'>('barcode');
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnCondition, setReturnCondition] = useState<'good' | 'bad'>('good');
  
  // Dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);

  // Get pending returns for employee view (not added to inventory or dead stock)
  const pendingReturns = returns.filter(r => !r.addedToInventory && !r.addedToDeadStock);
  const processedReturns = returns.filter(r => r.addedToInventory || r.addedToDeadStock);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === EMPLOYEE_CREDENTIALS.username && password === EMPLOYEE_CREDENTIALS.password) {
      setIsAuthenticated(true);
      setAuthError('');
      toast({
        title: "Login Successful",
        description: "Welcome, Employee!",
      });
    } else {
      setAuthError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    setFoundOrder(null);
    setScanInput('');
  };

  const handleScan = () => {
    if (!scanInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter Order ID or Sub-Order ID",
        variant: "destructive",
      });
      return;
    }

    const searchTerm = scanInput.trim().toLowerCase();
    
    // Search across all orders from all companies
    const order = orders.find(o => 
      o.orderId?.toLowerCase() === searchTerm ||
      o.subOrderId?.toLowerCase() === searchTerm ||
      o.orderId?.toLowerCase().includes(searchTerm) ||
      o.subOrderId?.toLowerCase().includes(searchTerm)
    );

    if (order) {
      setFoundOrder(order);
      toast({
        title: "Order Found!",
        description: `Found order: ${order.orderId}`,
      });
    } else {
      setFoundOrder(null);
      toast({
        title: "Order Not Found",
        description: "No order found with this ID. Please check and try again.",
        variant: "destructive",
      });
    }
  };

  const getCompanyName = (companyId: string) => {
    return companies.find(c => c.id === companyId)?.name || 'Unknown Company';
  };

  const getPlatformName = (companyId: string, platformId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company?.platforms.find(p => p.id === platformId)?.name || 'Unknown Platform';
  };

  const handleCompleteReturn = () => {
    if (!foundOrder) return;

    // Check if return already exists
    const existingReturn = returns.find(r => 
      r.orderId === foundOrder.orderId && r.subOrderId === foundOrder.subOrderId
    );

    if (existingReturn) {
      toast({
        title: "Return Already Exists",
        description: "This order already has a return record.",
        variant: "destructive",
      });
      return;
    }

    // Create return record matching Return interface
    const newReturn = {
      orderId: foundOrder.orderId,
      subOrderId: foundOrder.subOrderId || '',
      productName: foundOrder.productName || '',
      sku: foundOrder.sku || '',
      returnDate: new Date().toISOString(),
      companyId: foundOrder.companyId,
      platformId: foundOrder.platformId,
      condition: returnCondition,
      addedToInventory: false,
      addedToDeadStock: false,
      notes: returnReason || 'Return via barcode/QR scan',
    };

    addReturn(newReturn);
    
    toast({
      title: "Return Created Successfully",
      description: `Return recorded for order ${foundOrder.orderId}`,
    });

    // Reset form
    setFoundOrder(null);
    setScanInput('');
    setReturnReason('');
    setReturnCondition('good');
  };

  const handleAddToInventory = (returnItem: any) => {
    // Get original order for pricing info
    const originalOrder = orders.find(o => 
      o.orderId === returnItem.orderId && o.subOrderId === returnItem.subOrderId
    );

    // Add to inventory
    const inventoryItem = {
      sku: returnItem.sku || `RET-${Date.now()}`,
      hsn: '',
      productName: returnItem.productName || 'Returned Item',
      quantity: 1,
      category: 'Returns',
      costPrice: 0,
      sellingPrice: originalOrder?.sellingPrice || 0,
      imageUrl: '',
      description: `Returned from order ${returnItem.orderId}`,
    };

    addInventoryItem(inventoryItem);
    
    // Update return status
    updateReturn(returnItem.id, { addedToInventory: true });

    toast({
      title: "Added to Inventory",
      description: `${returnItem.productName} added to inventory`,
    });
  };

  const handleMarkDeadStock = (returnItem: any) => {
    // Add to dead stock
    addDeadStock({
      sku: returnItem.sku || '',
      productName: returnItem.productName || 'Unknown Product',
      quantity: 1,
      reason: returnItem.notes || 'Marked as dead stock from return',
    });

    // Update return
    updateReturn(returnItem.id, { addedToDeadStock: true });
    
    toast({
      title: "Marked as Dead Stock",
      description: `${returnItem.productName} marked as dead stock`,
    });
  };

  const viewReturnDetails = (returnItem: any) => {
    setSelectedReturn(returnItem);
    setViewDialogOpen(true);
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md bg-card/90 backdrop-blur-xl border-border/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Employee Login</CardTitle>
            <CardDescription>Enter your credentials to access return management</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="bg-secondary/50"
                />
              </div>
              {authError && (
                <p className="text-destructive text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {authError}
                </p>
              )}
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Return Management</h1>
              <p className="text-sm text-muted-foreground">Employee Portal</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Scan Section */}
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-primary" />
              Scan Return Parcel
            </CardTitle>
            <CardDescription>
              Scan barcode or QR code to find order and process return
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Scan Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={scanMode === 'barcode' ? 'default' : 'outline'}
                onClick={() => setScanMode('barcode')}
                className="flex-1 gap-2"
              >
                <ScanLine className="w-4 h-4" />
                Barcode
              </Button>
              <Button
                variant={scanMode === 'qr' ? 'default' : 'outline'}
                onClick={() => setScanMode('qr')}
                className="flex-1 gap-2"
              >
                <QrCode className="w-4 h-4" />
                QR Code
              </Button>
            </div>

            {/* Scan Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder={scanMode === 'barcode' ? 'Scan or enter Order ID / Sub-Order ID' : 'Scan QR code'}
                  className="pl-10 bg-secondary/50"
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                />
              </div>
              <Button onClick={handleScan} className="bg-primary hover:bg-primary/90 gap-2">
                <Search className="w-4 h-4" />
                Find Order
              </Button>
            </div>

            {/* Found Order Display */}
            {foundOrder && (
              <div className="border border-primary/30 rounded-lg p-4 bg-primary/5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <div>
                      <h3 className="font-semibold text-foreground">Order Found</h3>
                      <p className="text-sm text-muted-foreground">{foundOrder.orderId}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{getCompanyName(foundOrder.companyId)}</Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Sub-Order ID</p>
                    <p className="font-medium">{foundOrder.subOrderId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Product</p>
                    <p className="font-medium">{foundOrder.productName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">SKU</p>
                    <p className="font-medium">{foundOrder.sku || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Platform</p>
                    <p className="font-medium">{getPlatformName(foundOrder.companyId, foundOrder.platformId)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Customer</p>
                    <p className="font-medium">{foundOrder.customerName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Quantity</p>
                    <p className="font-medium">{foundOrder.quantity || 1}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Selling Price</p>
                    <p className="font-medium">₹{(foundOrder.sellingPrice || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant="secondary">{foundOrder.status || 'Unknown'}</Badge>
                  </div>
                </div>

                {/* Return Form */}
                <div className="border-t border-border/50 pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Return Reason</Label>
                    <Textarea
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      placeholder="Enter return reason (optional)"
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Product Condition</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={returnCondition === 'good' ? 'default' : 'outline'}
                        onClick={() => setReturnCondition('good')}
                        className="flex-1 gap-2"
                      >
                        <PackageCheck className="w-4 h-4" />
                        Good Condition
                      </Button>
                      <Button
                        type="button"
                        variant={returnCondition === 'bad' ? 'destructive' : 'outline'}
                        onClick={() => setReturnCondition('bad')}
                        className="flex-1 gap-2"
                      >
                        <PackageX className="w-4 h-4" />
                        Damaged
                      </Button>
                    </div>
                  </div>
                  <Button 
                    onClick={handleCompleteReturn} 
                    className="w-full bg-primary hover:bg-primary/90 gap-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Complete Return
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/80 backdrop-blur-xl border-border/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">{returns.length}</p>
                <p className="text-sm text-muted-foreground">Total Returns</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/80 backdrop-blur-xl border-border/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-500">{pendingReturns.length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/80 backdrop-blur-xl border-border/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-500">
                  {returns.filter(r => r.addedToInventory).length}
                </p>
                <p className="text-sm text-muted-foreground">Restocked</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/80 backdrop-blur-xl border-border/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-destructive">
                  {returns.filter(r => r.addedToDeadStock).length}
                </p>
                <p className="text-sm text-muted-foreground">Dead Stock</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Returns List */}
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle>Pending Returns</CardTitle>
            <CardDescription>Process pending returns - add to inventory or mark as dead stock</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingReturns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No pending returns</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {pendingReturns.map((returnItem) => {
                    const originalOrder = orders.find(o => 
                      o.orderId === returnItem.orderId && o.subOrderId === returnItem.subOrderId
                    );
                    return (
                      <div
                        key={returnItem.id}
                        className="border border-border/50 rounded-lg p-4 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{returnItem.productName || 'Unknown Product'}</h4>
                              <Badge variant="outline" className="text-xs">
                                {getCompanyName(returnItem.companyId)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Order: {returnItem.orderId} | SKU: {returnItem.sku || '-'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Qty: {originalOrder?.quantity || 1} | ₹{(originalOrder?.sellingPrice || 0).toLocaleString()}
                            </p>
                            {returnItem.condition && (
                              <Badge 
                                variant={returnItem.condition === 'good' ? 'default' : 'destructive'}
                                className="text-xs"
                              >
                                {returnItem.condition === 'good' ? 'Good Condition' : 'Damaged'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewReturnDetails(returnItem)}
                              className="gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleAddToInventory(returnItem)}
                              className="gap-1 bg-green-600 hover:bg-green-700"
                            >
                              <PackageCheck className="w-4 h-4" />
                              Restock
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleMarkDeadStock(returnItem)}
                              className="gap-1"
                            >
                              <PackageX className="w-4 h-4" />
                              Dead Stock
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Recent Processed Returns */}
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle>Recently Processed</CardTitle>
            <CardDescription>Last 10 processed returns</CardDescription>
          </CardHeader>
          <CardContent>
            {processedReturns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No processed returns yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {processedReturns.slice(-10).reverse().map((returnItem) => (
                    <div
                      key={returnItem.id}
                      className="flex items-center justify-between p-3 border border-border/30 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{returnItem.productName}</p>
                        <p className="text-xs text-muted-foreground">{returnItem.orderId}</p>
                      </div>
                      <Badge 
                        variant={returnItem.addedToInventory ? 'default' : 'destructive'}
                      >
                        {returnItem.addedToInventory ? 'Restocked' : 'Dead Stock'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Return Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Return Details</DialogTitle>
            <DialogDescription>Full details of the return</DialogDescription>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Return ID</p>
                  <p className="font-medium">{selectedReturn.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Order ID</p>
                  <p className="font-medium">{selectedReturn.orderId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sub-Order ID</p>
                  <p className="font-medium">{selectedReturn.subOrderId || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Product</p>
                  <p className="font-medium">{selectedReturn.productName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">SKU</p>
                  <p className="font-medium">{selectedReturn.sku || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Company</p>
                  <p className="font-medium">{getCompanyName(selectedReturn.companyId)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Return Date</p>
                  <p className="font-medium">
                    {selectedReturn.returnDate 
                      ? new Date(selectedReturn.returnDate).toLocaleDateString()
                      : '-'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Condition</p>
                  <Badge variant={selectedReturn.condition === 'good' ? 'default' : 'destructive'}>
                    {selectedReturn.condition === 'good' ? 'Good' : 'Damaged'}
                  </Badge>
                </div>
              </div>
              {selectedReturn.notes && (
                <div>
                  <p className="text-muted-foreground text-sm">Notes / Return Reason</p>
                  <p className="font-medium">{selectedReturn.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    handleAddToInventory(selectedReturn);
                    setViewDialogOpen(false);
                  }}
                >
                  <PackageCheck className="w-4 h-4 mr-2" />
                  Add to Inventory
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    handleMarkDeadStock(selectedReturn);
                    setViewDialogOpen(false);
                  }}
                >
                  <PackageX className="w-4 h-4 mr-2" />
                  Mark Dead Stock
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeReturn;
