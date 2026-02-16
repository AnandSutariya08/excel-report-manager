import React, { useState, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload as UploadIcon, FileSpreadsheet, Check, AlertCircle, Building2, Store, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  parseFile,
  mergeIntoMasterFile,
  uploadFileToStorage,
  getUploadedFilePath,
  extractMonth,
  type MergedRow,
} from '@/lib/masterFileService';

type UploadType = 'sales' | 'payment' | 'gst' | 'refund';

const Upload: React.FC = () => {
  const { companies, getPlatformById, getCompanyById, addUploadedFile, deductInventoryBySKU } = useData();
  const { toast } = useToast();
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [uploadType, setUploadType] = useState<UploadType>('sales');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; errors: number; duplicates: number } | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const selectedCompanyData = companies.find(c => c.id === selectedCompany);
  const platforms = selectedCompanyData?.platforms || [];

  // Get value from row using header mapping - handles spaces, case, and variations
  const getValue = (row: Record<string, any>, headerName: string): string => {
    if (!headerName) return '';
    
    // Normalize: remove extra spaces, convert to lowercase
    const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalizedHeader = normalize(headerName);
    
    // Try exact match first
    if (row[headerName] !== undefined && row[headerName] !== null && row[headerName] !== '') {
      return String(row[headerName]);
    }
    
    // Try case-insensitive match with normalized comparison
    const key = Object.keys(row).find(k => normalize(k) === normalizedHeader);
    if (key && row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return String(row[key]);
    }
    
    // Try partial match (e.g., "Order Id" matches "OrderId", "order_id", etc.)
    const partialMatch = Object.keys(row).find(k => {
      const normalizedKey = normalize(k).replace(/[_\s-]/g, '');
      const normalizedSearch = normalizedHeader.replace(/[_\s-]/g, '');
      return normalizedKey === normalizedSearch;
    });
    
    if (partialMatch && row[partialMatch] !== undefined && row[partialMatch] !== null && row[partialMatch] !== '') {
      return String(row[partialMatch]);
    }
    
    return '';
  };

  // Parse number from string
  const parseNumber = (value: string): number => {
    if (!value) return 0;
    const cleaned = String(value).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Parse date from various formats
  const parseDate = (value: string): string => {
    if (!value) return '';
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      // Return original if parsing fails
    }
    return value;
  };

  // Process file: upload to Storage, merge into master file, store metadata

  
  const processFile = async (file: File) => {
    if (!selectedPlatform || !selectedCompany) {
      toast({ title: 'Select platform and company', description: 'Please select both company and platform before uploading', variant: 'destructive' });
      return;
    }

    const platform = getPlatformById(selectedPlatform);
    const company = getCompanyById(selectedCompany);
    
    if (!platform || !company) {
      toast({ title: 'Platform/Company not found', description: 'Selected platform or company does not exist', variant: 'destructive' });
      return;
    }

    // Get the appropriate headers based on upload type
    const headers = uploadType === 'sales' ? platform.salesHeaders :
                    uploadType === 'payment' ? platform.paymentHeaders :
                    uploadType === 'gst' ? platform.gstHeaders :
                    platform.refundHeaders;

    // Debug: Log headers to see what's in Firestore
    console.log('Platform headers from Firestore:', {
      platformId: platform.id,
      platformName: platform.name,
      uploadType,
      headers,
      salesHeaders: platform.salesHeaders,
      paymentHeaders: platform.paymentHeaders,
      gstHeaders: platform.gstHeaders,
      refundHeaders: platform.refundHeaders,
    });

    if (!headers || !headers.orderId || headers.orderId.trim() === '') {
      toast({ 
        title: 'Headers not configured', 
        description: `Please configure ${uploadType} headers for this platform first. Go to Companies > Platform Settings to configure headers.`,
        variant: 'destructive' 
      });
      console.error('Headers missing or empty:', { headers, uploadType, platform });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResult(null);
    setUploadedFileName(file.name);

    try {
      // Step 1: Parse the file
      setProgress(10);
      const rows = await parseFile(file);
      
      if (rows.length === 0) {
        toast({ title: 'Empty file', description: 'No data found in the file', variant: 'destructive' });
        setIsProcessing(false);
        return;
      }

      // Step 2: Extract month from order dates (try multiple rows for accuracy)
      let month = '';
      // Try to get month from first few rows to ensure accuracy
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const orderDate = getValue(rows[i], headers.orderDate);
        if (orderDate && orderDate.trim() !== '') {
          month = extractMonth(orderDate);
          if (month) break; // Use first valid month found
        }
      }
      // Fallback to current month if no valid date found
      if (!month) {
        const now = new Date();
        month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      }
      
      console.log('Extracted month for master file:', month, 'from order dates in file');

      // Step 3: Map rows to MergedRow format
      setProgress(20);
      const mergedRows: MergedRow[] = [];
      let errorCount = 0;
      let successCount = 0;
      let duplicateCount = 0;
      const processedKeys = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        setProgress(20 + Math.round((i / rows.length) * 50));
        const row = rows[i];
        
        try {
          const orderId = getValue(row, headers.orderId);
          const subOrderId = getValue(row, headers.subOrderId) || orderId;
          const orderDate = parseDate(getValue(row, headers.orderDate));
          
          // Skip rows without order ID
          if (!orderId || orderId.trim() === '') {
            errorCount++;
            continue;
          }

          // Create unique key for deduplication within this file (case-insensitive)
          const uniqueKey = `${orderId}_${subOrderId}`.toLowerCase().trim();
          
          // Skip duplicates within the same file
          if (processedKeys.has(uniqueKey)) {
            duplicateCount++;
            continue;
          }
          processedKeys.add(uniqueKey);

          const mergedRow: MergedRow = {
            orderId,
            subOrderId,
            orderDate,
            ...row, // Include all raw data
          };

          // Map fields based on upload type
          if (uploadType === 'sales') {
            mergedRow.productName = getValue(row, headers.productName);
            mergedRow.sku = getValue(row, headers.sku);
            mergedRow.skuName = getValue(row, headers.skuName);
            mergedRow.quantity = parseNumber(getValue(row, headers.quantity)) || 1;
            mergedRow.status = getValue(row, headers.status).toLowerCase();
            mergedRow.customerName = getValue(row, headers.customerName);
            mergedRow.customerState = getValue(row, headers.customerState);
            mergedRow.customerCity = getValue(row, headers.customerCity);
            mergedRow.customerPincode = getValue(row, headers.customerPincode);
            mergedRow.wholesalePrice = parseNumber(getValue(row, headers.wholesalePrice));
            mergedRow.sellingPrice = parseNumber(getValue(row, headers.sellingPrice));
            mergedRow.shippingCharge = parseNumber(getValue(row, headers.shippingCharge));
          }

          if (uploadType === 'payment') {
            if (headers.productName) mergedRow.productName = getValue(row, headers.productName);
            if (headers.status) mergedRow.status = getValue(row, headers.status).toLowerCase();
            mergedRow.paymentMode = getValue(row, headers.paymentMode);
            mergedRow.hsn = getValue(row, headers.hsn);
            mergedRow.wholesalePrice = parseNumber(getValue(row, headers.wholesalePrice));
            mergedRow.shippingCharge = parseNumber(getValue(row, headers.shippingCharge));
            mergedRow.tcs = parseNumber(getValue(row, headers.tcs));
            mergedRow.tds = parseNumber(getValue(row, headers.tds));
            mergedRow.commission = parseNumber(getValue(row, headers.commission));
            mergedRow.shipperCharge = parseNumber(getValue(row, headers.shipperCharge));
            mergedRow.netAmount = parseNumber(getValue(row, headers.netAmount));
            if (headers.customerCity) mergedRow.customerCity = getValue(row, headers.customerCity);
            if (headers.customerPincode) mergedRow.customerPincode = getValue(row, headers.customerPincode);
            if (headers.customerState) mergedRow.customerState = getValue(row, headers.customerState);
          }

          if (uploadType === 'gst') {
            if (headers.status) mergedRow.status = getValue(row, headers.status).toLowerCase();
            mergedRow.invoiceNumber = getValue(row, headers.invoiceNumber);
            mergedRow.invoiceDate = parseDate(getValue(row, headers.invoiceDate));
            mergedRow.hsn = getValue(row, headers.hsn);
            mergedRow.gstRate = parseNumber(getValue(row, headers.gstRate));
            if (headers.sku) mergedRow.sku = getValue(row, headers.sku);
            if (headers.productName) mergedRow.productName = getValue(row, headers.productName);
            if (headers.quantity) mergedRow.quantity = parseNumber(getValue(row, headers.quantity)) || 1;
            if (headers.customerState) mergedRow.customerState = getValue(row, headers.customerState);
            mergedRow.taxableValue = parseNumber(getValue(row, headers.taxableValue));
            mergedRow.cgst = parseNumber(getValue(row, headers.cgst));
            mergedRow.igst = parseNumber(getValue(row, headers.igst));
            mergedRow.sgst = parseNumber(getValue(row, headers.sgst));
            mergedRow.invoiceAmount = parseNumber(getValue(row, headers.invoiceAmount));
          }

          if (uploadType === 'refund') {
            mergedRow.refundAmount = parseNumber(getValue(row, headers.refundAmount));
            mergedRow.deductionAmount = parseNumber(getValue(row, headers.deductionAmount));
            mergedRow.refundReason = getValue(row, headers.refundReason);
            mergedRow.refundDate = parseDate(getValue(row, headers.refundDate));
          }

          mergedRows.push(mergedRow);
          
          // Deduct from inventory if it's a sales upload
          if (uploadType === 'sales' && mergedRow.sku && mergedRow.quantity) {
            try {
              await deductInventoryBySKU(mergedRow.sku, mergedRow.quantity);
            } catch (invErr) {
              console.error(`Failed to deduct inventory for SKU ${mergedRow.sku}:`, invErr);
            }
          }
          
          successCount++;
        } catch (e) {
          console.error('Error processing row:', e);
          errorCount++;
        }
      }

      // Step 4: Upload original file to Storage
      setProgress(75);
      const uploadedFilePath = getUploadedFilePath(selectedCompany, selectedPlatform, month, uploadType, file.name);
      await uploadFileToStorage(file, uploadedFilePath);

      // Step 5: Merge into master file (one file per platform for lifetime)
      setProgress(85);
      const masterFilePath = await mergeIntoMasterFile(
        selectedCompany,
        selectedPlatform,
        mergedRows,
        uploadType
      );

      // Step 6: Store metadata in Firestore
      setProgress(95);
      await addUploadedFile({
        fileName: file.name,
        fileType: uploadType,
        companyId: selectedCompany,
        companyName: company.name,
        platformId: selectedPlatform,
        platformName: platform.name,
        recordsCount: successCount,
        uploadDate: new Date().toISOString(),
        uploadedBy: 'admin',
        status: errorCount === 0 ? 'success' : successCount > 0 ? 'partial' : 'failed',
        errors: errorCount,
        storagePath: uploadedFilePath,
        masterFilePath: masterFilePath, // Same master file for all uploads to this platform
        month: month, // Keep month for organizing uploaded files, but master file is same
      });

      setProgress(100);
      setResult({ success: successCount, errors: errorCount, duplicates: duplicateCount });
      
      toast({
        title: 'Upload complete',
        description: `Processed ${successCount} records${duplicateCount > 0 ? `, ${duplicateCount} duplicates skipped` : ''}, ${errorCount} errors. Master file updated.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while processing the file. Please ensure the file format is correct and try again.';
      
      toast({ 
        title: 'Upload Failed', 
        description: errorMessage,
        variant: 'destructive' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      processFile(file);
    } else {
      toast({ title: 'Invalid file', description: 'Please upload a CSV or Excel file', variant: 'destructive' });
    }
  }, [selectedPlatform, uploadType, selectedCompany]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const platform = getPlatformById(selectedPlatform);
  const currentHeaders = platform ? (
    uploadType === 'sales' ? platform.salesHeaders :
    uploadType === 'payment' ? platform.paymentHeaders :
    uploadType === 'gst' ? platform.gstHeaders :
    platform.refundHeaders
  ) : null;

  const hasConfiguredHeaders = currentHeaders && currentHeaders.orderId && currentHeaders.orderId.trim() !== '';
  
  // Debug: Log header configuration status
  if (selectedPlatform && platform) {
    console.log('Header configuration check:', {
      platform: platform.name,
      uploadType,
      hasHeaders: hasConfiguredHeaders,
      orderIdHeader: currentHeaders?.orderId,
      allHeaders: currentHeaders,
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Upload Data</h1>
        <p className="text-muted-foreground">Import sales, payment, GST, and refund data from Excel files</p>
      </div>

      {/* Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Company
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedCompany} onValueChange={(v) => { setSelectedCompany(v); setSelectedPlatform(''); }}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Store className="w-4 h-4 text-accent" />
              Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform} disabled={!selectedCompany}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue placeholder={selectedCompany ? "Select platform" : "Select company first"} />
              </SelectTrigger>
              <SelectContent>
                {platforms.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-success" />
              File Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={uploadType} onValueChange={(v) => setUploadType(v as UploadType)}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">Sales Report</SelectItem>
                <SelectItem value="payment">Payment Sheet</SelectItem>
                <SelectItem value="gst">GST Report</SelectItem>
                <SelectItem value="refund">Refund/Deduction</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Info className="w-4 h-4 text-warning" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {!selectedPlatform ? (
                <span className="text-muted-foreground">Select platform</span>
              ) : hasConfiguredHeaders ? (
                <span className="text-success">Headers configured ✓</span>
              ) : (
                <span className="text-warning">Configure headers first</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configured Headers Preview */}
      {selectedPlatform && currentHeaders && hasConfiguredHeaders && (
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Configured Column Mappings for {uploadType.toUpperCase()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(currentHeaders).filter(([_, v]) => v).map(([key, value]) => (
                <div key={key} className="flex items-center gap-1 px-2 py-1 bg-secondary/50 rounded text-xs">
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="text-foreground font-mono">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Zone */}
      <Card className="bg-card/80 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Upload File</CardTitle>
          <CardDescription>
            Drop your {uploadType === 'sales' ? 'Sales Report' : uploadType === 'payment' ? 'Payment Sheet' : uploadType === 'gst' ? 'GST Report' : 'Refund/Deduction'} file here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300",
              isDragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50",
              (!selectedPlatform || !hasConfiguredHeaders) && "opacity-50 pointer-events-none"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {isProcessing ? (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
                <p className="text-foreground font-medium">Processing {uploadedFileName}...</p>
                <Progress value={progress} className="max-w-xs mx-auto" />
                <p className="text-sm text-muted-foreground">{progress}% complete</p>
              </div>
            ) : result ? (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-success" />
                </div>
                <p className="text-foreground font-medium">Upload Complete!</p>
                <div className="flex flex-wrap justify-center gap-4 text-sm">
                  <span className="text-success">{result.success} processed</span>
                  {result.duplicates > 0 && <span className="text-warning">{result.duplicates} duplicates skipped</span>}
                  {result.errors > 0 && <span className="text-destructive">{result.errors} errors</span>}
                </div>
                <Button variant="outline" onClick={() => setResult(null)}>Upload Another</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                  <UploadIcon className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-foreground font-medium mb-1">
                    {isDragging ? 'Drop your file here' : 'Drag & drop your Excel file'}
                  </p>
                  <p className="text-sm text-muted-foreground">or click to browse (CSV, XLSX, XLS)</p>
                </div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-secondary/30 border-border/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Important Notes:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Orders are matched by Order ID + Sub Order ID + Date to prevent duplicates</li>
                <li>• Sales file creates new orders; Payment, GST, Refund files update existing orders</li>
                <li>• Make sure column names in your Excel match the configured mappings exactly</li>
                <li>• GST refunds for returned products are automatically calculated</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Upload;
