import React, { useState, useRef } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  Search, 
  Plus, 
  Minus, 
  AlertTriangle, 
  Image as ImageIcon, 
  Printer, 
  Download,
  Upload as UploadIcon,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';

const Inventory: React.FC = () => {
  const { inventory, addInventoryItem, updateInventoryItem, deadStock } = useData();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

        let successCount = 0;
        rows.forEach(row => {
          if (row.SKU || row.sku) {
            addInventoryItem({
              sku: String(row.SKU || row.sku),
              hsn: String(row.HSN || row.hsn || ''),
              productName: String(row.ProductName || row.productName || row['Product Name'] || ''),
              quantity: parseInt(row.Quantity || row.quantity || 0),
              costPrice: parseFloat(row.CostPrice || row.costPrice || row['Cost Price'] || 0),
              sellingPrice: parseFloat(row.SellingPrice || row.sellingPrice || row['Selling Price'] || 0),
              imageUrl: String(row.ImageUrl || row.imageUrl || ''),
              description: String(row.Description || row.description || ''),
              category: String(row.Category || row.category || ''),
            });
            successCount++;
          }
        });

        toast({
          title: 'Bulk Upload Success',
          description: `Imported ${successCount} items to inventory`,
        });
      } catch (error) {
        toast({
          title: 'Bulk Upload Failed',
          description: 'Error parsing the file. Please check the format.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsBinaryString(file);
    if (e.target) e.target.value = '';
  };
  const [formData, setFormData] = useState({
    sku: '',
    hsn: '',
    productName: '',
    quantity: 0,
    costPrice: 0,
    sellingPrice: 0,
    imageUrl: '',
    description: '',
    category: '',
  });

  const filteredInventory = inventory.filter(item =>
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.hsn?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addInventoryItem(formData);
    toast({ title: 'Inventory updated', description: `${formData.productName} has been added` });
    setFormData({ sku: '', hsn: '', productName: '', quantity: 0, costPrice: 0, sellingPrice: 0, imageUrl: '', description: '', category: '' });
    setIsOpen(false);
  };

  const adjustQuantity = (id: string, adjustment: number) => {
    const item = inventory.find(i => i.id === id);
    if (item) {
      const newQty = Math.max(0, item.quantity + adjustment);
      updateInventoryItem(id, { quantity: newQty });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
  const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockItems = inventory.filter(item => item.quantity < 10);

  const exportToCSV = () => {
    const headers = ['SKU', 'HSN', 'Product Name', 'Quantity', 'Cost Price', 'Selling Price', 'Category', 'Value'];
    const rows = inventory.map(i => [
      i.sku, i.hsn, i.productName, i.quantity, i.costPrice, i.sellingPrice, i.category, i.quantity * i.costPrice
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const printCatalog = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const catalogItems = inventory.filter(item => item.imageUrl);
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Product Catalog</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              background: #fff;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #333;
            }
            .header h1 {
              font-size: 28px;
              color: #333;
              margin-bottom: 5px;
            }
            .header p {
              color: #666;
              font-size: 14px;
            }
            .catalog {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
            }
            .product {
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 15px;
              text-align: center;
              page-break-inside: avoid;
            }
            .product img {
              width: 100%;
              height: 150px;
              object-fit: contain;
              margin-bottom: 10px;
              border-radius: 4px;
            }
            .product-name {
              font-weight: 600;
              font-size: 14px;
              color: #333;
              margin-bottom: 8px;
              min-height: 40px;
            }
            .product-details {
              font-size: 12px;
              color: #666;
            }
            .product-details p {
              margin: 4px 0;
            }
            .hsn-badge {
              display: inline-block;
              background: #f0f0f0;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 11px;
              color: #333;
              margin-top: 5px;
            }
            @media print {
              body { padding: 10px; }
              .catalog { grid-template-columns: repeat(3, 1fr); gap: 15px; }
              .product { padding: 10px; }
              .no-image { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Product Catalog</h1>
            <p>Generated on ${new Date().toLocaleDateString('en-IN')}</p>
          </div>
          <div class="catalog">
            ${inventory.map(item => `
              <div class="product ${!item.imageUrl ? 'no-image' : ''}">
                ${item.imageUrl 
                  ? `<img src="${item.imageUrl}" alt="${item.productName}" />`
                  : `<div style="height: 150px; background: #f5f5f5; display: flex; align-items: center; justify-content: center; border-radius: 4px; margin-bottom: 10px;">
                      <span style="color: #999;">No Image</span>
                    </div>`
                }
                <div class="product-name">${item.productName}</div>
                <div class="product-details">
                  <p><strong>SKU:</strong> ${item.sku}</p>
                  ${item.category ? `<p><strong>Category:</strong> ${item.category}</p>` : ''}
                  ${item.description ? `<p>${item.description}</p>` : ''}
                  ${item.hsn ? `<span class="hsn-badge">HSN: ${item.hsn}</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground">Manage your unified inventory with HSN codes</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={bulkInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleBulkUpload}
          />
          <Button variant="outline" onClick={() => bulkInputRef.current?.click()}>
            <UploadIcon className="w-4 h-4 mr-2" />
            Bulk Upload
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={printCatalog}>
            <Printer className="w-4 h-4 mr-2" />
            Print Catalog
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Inventory Item</DialogTitle>
                <DialogDescription>Add a new product to your inventory with image and HSN</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Image Upload */}
                <div className="flex items-start gap-4">
                  <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-secondary/30">
                    {formData.imageUrl ? (
                      <div className="relative w-full h-full">
                        <img src={formData.imageUrl} alt="Product" className="w-full h-full object-contain" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="flex flex-col items-center justify-center cursor-pointer text-muted-foreground"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImageIcon className="w-8 h-8 mb-1" />
                        <span className="text-xs">Upload Image</span>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sku">SKU *</Label>
                        <Input
                          id="sku"
                          value={formData.sku}
                          onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                          placeholder="Product SKU"
                          className="bg-secondary/50"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hsn">HSN Code</Label>
                        <Input
                          id="hsn"
                          value={formData.hsn}
                          onChange={(e) => setFormData(prev => ({ ...prev, hsn: e.target.value }))}
                          placeholder="HSN Code"
                          className="bg-secondary/50"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="productName">Product Name *</Label>
                      <Input
                        id="productName"
                        value={formData.productName}
                        onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                        placeholder="Product name"
                        className="bg-secondary/50"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                      className="bg-secondary/50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="costPrice">Cost Price (₹)</Label>
                    <Input
                      id="costPrice"
                      type="number"
                      value={formData.costPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, costPrice: parseFloat(e.target.value) || 0 }))}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sellingPrice">Selling Price (₹)</Label>
                    <Input
                      id="sellingPrice"
                      type="number"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, sellingPrice: parseFloat(e.target.value) || 0 }))}
                      className="bg-secondary/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Product category"
                    className="bg-secondary/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Product description"
                    className="bg-secondary/50"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90">Add Item</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{inventory.length}</p>
                <p className="text-sm text-muted-foreground">Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalItems.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Units</p>
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
                <p className="text-2xl font-bold text-foreground">₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                <p className="text-sm text-muted-foreground">Stock Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{lowStockItems.length}</p>
                <p className="text-sm text-muted-foreground">Low Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by SKU, product name or HSN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-secondary/50 border-border/50"
        />
      </div>

      {/* Inventory Table */}
      <Card className="bg-card/80 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Stock Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="data-table-header border-border/50">
                  <TableHead className="text-muted-foreground w-[60px]">Image</TableHead>
                  <TableHead className="text-muted-foreground">SKU</TableHead>
                  <TableHead className="text-muted-foreground">HSN</TableHead>
                  <TableHead className="text-muted-foreground">Product</TableHead>
                  <TableHead className="text-muted-foreground text-center">Quantity</TableHead>
                  <TableHead className="text-muted-foreground text-right">Cost</TableHead>
                  <TableHead className="text-muted-foreground text-right">Selling</TableHead>
                  <TableHead className="text-muted-foreground text-right">Value</TableHead>
                  <TableHead className="text-muted-foreground text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.length > 0 ? filteredInventory.map((item) => (
                  <TableRow key={item.id} className="border-border/30 hover:bg-secondary/30">
                    <TableCell>
                      <div className="w-10 h-10 rounded bg-secondary/50 overflow-hidden flex items-center justify-center">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{item.hsn || '-'}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground max-w-[200px] truncate">{item.productName}</p>
                        {item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={item.quantity < 10 ? 'destructive' : 'outline'} className="font-mono">
                        {item.quantity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ₹{item.costPrice.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-primary">
                      ₹{item.sellingPrice.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ₹{(item.quantity * item.costPrice).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => adjustQuantity(item.id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => adjustQuantity(item.id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          {searchQuery ? 'No items match your search' : 'No inventory items'}
                        </p>
                        {!searchQuery && (
                          <p className="text-xs text-muted-foreground mt-1">Add your first product to get started</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dead Stock */}
      {deadStock.length > 0 && (
        <Card className="bg-card/80 backdrop-blur-xl border-destructive/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Dead Stock ({deadStock.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deadStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div>
                    <p className="text-sm font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">SKU: {item.sku} | Reason: {item.reason}</p>
                  </div>
                  <Badge variant="destructive">{item.quantity} units</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Inventory;
