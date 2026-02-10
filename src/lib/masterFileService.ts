import * as XLSX from 'xlsx';
import { storage, ref, uploadBytes, getDownloadURL } from './firebase';

export interface MergedRow {
  orderId: string;
  subOrderId: string;
  orderDate?: string;
  // Sales fields
  productName?: string;
  sku?: string;
  skuName?: string;
  quantity?: number;
  status?: string;
  customerName?: string;
  customerState?: string;
  customerCity?: string;
  customerPincode?: string;
  wholesalePrice?: number;
  sellingPrice?: number;
  shippingCharge?: number;
  // Payment fields
  paymentMode?: string;
  hsn?: string;
  commission?: number;
  tcs?: number;
  tds?: number;
  shipperCharge?: number;
  netAmount?: number;
  // GST fields
  gstRate?: number;
  invoiceNumber?: string;
  invoiceDate?: string;
  cgst?: number;
  sgst?: number;
  igst?: number;
  taxableValue?: number;
  invoiceAmount?: number;
  // Refund fields
  refundAmount?: number;
  deductionAmount?: number;
  refundReason?: string;
  refundDate?: string;
  // GST Refund for returned products
  gstRefund?: number;
  // Raw data from all files
  [key: string]: any;
}

/**
 * Get the storage path for master file
 * ONE master file per platform for lifetime (not per month)
 */
export function getMasterFilePath(companyId: string, platformId: string): string {
  return `companies/${companyId}/platforms/${platformId}/master.xlsx`;
}

/**
 * Get the storage path for uploaded file
 */
export function getUploadedFilePath(
  companyId: string,
  platformId: string,
  month: string,
  fileType: 'sales' | 'payment' | 'gst' | 'refund',
  fileName: string
): string {
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `companies/${companyId}/platforms/${platformId}/${month}/${fileType}/${sanitizedFileName}`;
}

/**
 * Extract month from date string (format: YYYY-MM or YYYY-MM-DD)
 * Improved to handle various date formats and ensure consistency
 */
export function extractMonth(dateString: string): string {
  if (!dateString || dateString.trim() === '') {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  
  try {
    // Try parsing as ISO date string
    let date = new Date(dateString);
    
    // If invalid, try parsing as YYYY-MM-DD format
    if (isNaN(date.getTime())) {
      // Try YYYY-MM-DD format
      const parts = dateString.split(/[-/]/);
      if (parts.length >= 2) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
          return `${year}-${String(month).padStart(2, '0')}`;
        }
      }
      // If still invalid, use current month
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    
    // Valid date - extract YYYY-MM
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}-${String(month).padStart(2, '0')}`;
  } catch {
    // Fallback to current month
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}

/**
 * Read master file from Storage using getDownloadURL() - signed URLs bypass CORS
 */
export async function readMasterFile(storagePath: string): Promise<MergedRow[]> {
  const fileRef = ref(storage, storagePath);
  
  // Use getDownloadURL() - signed URLs bypass CORS restrictions completely
  try {
    const downloadURL = await getDownloadURL(fileRef);
    
    // Fetch the file using the signed URL (no CORS issues with signed URLs)
    const response = await fetch(downloadURL);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as MergedRow[];
    return rows;
  } catch (error: any) {
    // File doesn't exist yet - this is expected on first upload
    // Handle various error codes that indicate file not found
    if (
      error?.code === 'storage/object-not-found' ||
      error?.code === 'storage/unauthorized' ||
      error?.code === 'storage/unknown' ||
      error?.message?.includes('not found') ||
      error?.message?.includes('No such object') ||
      error?.serverResponse?.statusCode === 404 ||
      error?.message?.includes('404')
    ) {
      // Master file doesn't exist yet - will be created on first upload
      return [];
    }
    
    // Check for CORS errors - provide helpful message
    if (
      error?.message?.includes('CORS') ||
      error?.message?.includes('Access-Control-Allow-Origin') ||
      error?.message?.includes('blocked by CORS policy') ||
      error?.message?.includes('Failed to fetch') ||
      (error?.name === 'TypeError' && error?.message?.includes('fetch'))
    ) {
      const errorMsg = `
🚨 CORS ERROR - Firebase Storage bucket needs CORS configuration!

QUICK FIX (choose one):
1. Run: gsutil cors set configure-cors.json gs://demoproject-c9fbc.firebasestorage.app
2. Or use Google Cloud Console (see QUICK_CORS_FIX.md)

This is a ONE-TIME setup. After configuring, refresh your browser.

See QUICK_CORS_FIX.md for detailed instructions.
      `.trim();
      console.error(errorMsg);
      throw new Error('CORS configuration required. See QUICK_CORS_FIX.md for setup instructions.');
    }
    
    // For other errors, return empty array - caller can handle gracefully
    // This prevents crashes when files are temporarily unavailable
    console.warn('Error reading master file:', error);
    return [];
  }
}

/**
 * Intelligently merge two rows, preserving existing data and adding new fields
 */
function mergeRowData(existing: MergedRow, newRow: MergedRow, fileType: 'sales' | 'payment' | 'gst' | 'refund'): MergedRow {
  const merged: MergedRow = { ...existing };

  // Always preserve orderId and subOrderId from existing (they are the key)
  merged.orderId = existing.orderId;
  merged.subOrderId = existing.subOrderId || existing.orderId;

  // Merge based on file type - only update fields relevant to that file type
  if (fileType === 'sales') {
    // Sales fields: update if new data exists and is not empty
    if (newRow.productName) merged.productName = newRow.productName;
    if (newRow.sku) merged.sku = newRow.sku;
    if (newRow.skuName) merged.skuName = newRow.skuName;
    if (newRow.quantity !== undefined && newRow.quantity !== null) merged.quantity = newRow.quantity;
    if (newRow.status) merged.status = newRow.status;
    if (newRow.customerName) merged.customerName = newRow.customerName;
    if (newRow.customerState) merged.customerState = newRow.customerState;
    if (newRow.customerCity) merged.customerCity = newRow.customerCity;
    if (newRow.customerPincode) merged.customerPincode = newRow.customerPincode;
    if (newRow.wholesalePrice !== undefined && newRow.wholesalePrice !== null) merged.wholesalePrice = newRow.wholesalePrice;
    if (newRow.sellingPrice !== undefined && newRow.sellingPrice !== null) merged.sellingPrice = newRow.sellingPrice;
    if (newRow.shippingCharge !== undefined && newRow.shippingCharge !== null) merged.shippingCharge = newRow.shippingCharge;
    if (newRow.orderDate) merged.orderDate = newRow.orderDate;
  }

  if (fileType === 'payment') {
    // Payment fields: update if new data exists
    if (newRow.paymentMode) merged.paymentMode = newRow.paymentMode;
    if (newRow.hsn) merged.hsn = newRow.hsn;
    if (newRow.commission !== undefined && newRow.commission !== null) merged.commission = newRow.commission;
    if (newRow.tcs !== undefined && newRow.tcs !== null) merged.tcs = newRow.tcs;
    if (newRow.tds !== undefined && newRow.tds !== null) merged.tds = newRow.tds;
    if (newRow.shipperCharge !== undefined && newRow.shipperCharge !== null) merged.shipperCharge = newRow.shipperCharge;
    if (newRow.netAmount !== undefined && newRow.netAmount !== null) merged.netAmount = newRow.netAmount;
    // Update these if they exist in payment file
    if (newRow.wholesalePrice !== undefined && newRow.wholesalePrice !== null) merged.wholesalePrice = newRow.wholesalePrice;
    if (newRow.shippingCharge !== undefined && newRow.shippingCharge !== null) merged.shippingCharge = newRow.shippingCharge;
    if (newRow.customerCity) merged.customerCity = newRow.customerCity;
    if (newRow.customerPincode) merged.customerPincode = newRow.customerPincode;
    if (newRow.customerState) merged.customerState = newRow.customerState;
    if (newRow.productName) merged.productName = newRow.productName;
    if (newRow.status) merged.status = newRow.status;
  }

  if (fileType === 'gst') {
    // GST fields: update if new data exists
    if (newRow.invoiceNumber) merged.invoiceNumber = newRow.invoiceNumber;
    if (newRow.invoiceDate) merged.invoiceDate = newRow.invoiceDate;
    if (newRow.hsn) merged.hsn = newRow.hsn;
    if (newRow.gstRate !== undefined && newRow.gstRate !== null) merged.gstRate = newRow.gstRate;
    if (newRow.taxableValue !== undefined && newRow.taxableValue !== null) merged.taxableValue = newRow.taxableValue;
    if (newRow.cgst !== undefined && newRow.cgst !== null) merged.cgst = newRow.cgst;
    if (newRow.sgst !== undefined && newRow.sgst !== null) merged.sgst = newRow.sgst;
    if (newRow.igst !== undefined && newRow.igst !== null) merged.igst = newRow.igst;
    if (newRow.invoiceAmount !== undefined && newRow.invoiceAmount !== null) merged.invoiceAmount = newRow.invoiceAmount;
    // Update these if they exist in GST file
    if (newRow.sku) merged.sku = newRow.sku;
    if (newRow.productName) merged.productName = newRow.productName;
    if (newRow.quantity !== undefined && newRow.quantity !== null) merged.quantity = newRow.quantity;
    if (newRow.customerState) merged.customerState = newRow.customerState;
    if (newRow.status) merged.status = newRow.status;
  }

  if (fileType === 'refund') {
    // Refund fields: update if new data exists
    if (newRow.refundAmount !== undefined && newRow.refundAmount !== null) merged.refundAmount = newRow.refundAmount;
    if (newRow.deductionAmount !== undefined && newRow.deductionAmount !== null) merged.deductionAmount = newRow.deductionAmount;
    if (newRow.refundReason) merged.refundReason = newRow.refundReason;
    if (newRow.refundDate) merged.refundDate = newRow.refundDate;
    if (newRow.gstRefund !== undefined && newRow.gstRefund !== null) merged.gstRefund = newRow.gstRefund;
  }
  
  // Always allow status and gstRefund updates (for returns)
  if (newRow.status !== undefined) merged.status = newRow.status;
  if (newRow.gstRefund !== undefined && newRow.gstRefund !== null) merged.gstRefund = newRow.gstRefund;

  // Merge all raw data fields (preserve existing, add new)
  if (newRow) {
    Object.keys(newRow).forEach(key => {
      if (key !== 'orderId' && key !== 'subOrderId') {
        // If it's a raw data field not in our interface, add it
        if (!(key in merged)) {
          merged[key] = newRow[key];
        }
      }
    });
  }

  return merged;
}

/**
 * Create or update master file by merging new data
 * Handles any upload order (sales, payment, GST) and prevents duplicates
 */
export async function mergeIntoMasterFile(
  companyId: string,
  platformId: string,
  newRows: MergedRow[],
  fileType: 'sales' | 'payment' | 'gst' | 'refund'
): Promise<string> {
  const masterPath = getMasterFilePath(companyId, platformId);
  
  // Read existing master file or start with empty array
  let existingRows: MergedRow[] = [];
  try {
    existingRows = await readMasterFile(masterPath);
  } catch (error) {
    // Master file doesn't exist yet - will create new one
    existingRows = [];
  }

  // Create a map of existing rows by orderId + subOrderId (unique key)
  // Use toLowerCase().trim() for consistent case-insensitive matching
  const existingMap = new Map<string, MergedRow>();
  existingRows.forEach(row => {
    const key = `${row.orderId}_${row.subOrderId || row.orderId}`.toLowerCase().trim();
    existingMap.set(key, { ...row });
  });

  // Track duplicates in new data
  const newRowsMap = new Map<string, MergedRow>();
  
  // Process new rows and merge into existing map
  newRows.forEach(newRow => {
    if (!newRow.orderId) {
      // Skip rows without orderId - they cannot be processed
      return;
    }

    const key = `${newRow.orderId}_${newRow.subOrderId || newRow.orderId}`.toLowerCase().trim();
    const existing = existingMap.get(key);
    
    if (existing) {
      // Row exists - intelligently merge data based on file type
      const merged = mergeRowData(existing, newRow, fileType);
      existingMap.set(key, merged);
    } else {
      // New row - check if it's a duplicate within the new batch
      if (newRowsMap.has(key)) {
        // Duplicate in new data - merge with existing in newRowsMap
        const existingNew = newRowsMap.get(key)!;
        const merged = mergeRowData(existingNew, newRow, fileType);
        newRowsMap.set(key, merged);
      } else {
        // Truly new row
        newRowsMap.set(key, { ...newRow });
      }
    }
  });

  // Add all new rows (that weren't duplicates of existing) to the map
  newRowsMap.forEach((row, key) => {
    if (!existingMap.has(key)) {
      existingMap.set(key, row);
    }
  });

  // Convert map back to array (ensures no duplicates)
  const mergedRows = Array.from(existingMap.values());

  // Sort by orderId and subOrderId for consistency
  mergedRows.sort((a, b) => {
    const aKey = `${a.orderId}_${a.subOrderId || a.orderId}`;
    const bKey = `${b.orderId}_${b.subOrderId || b.orderId}`;
    return aKey.localeCompare(bKey);
  });

  // Create Excel workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(mergedRows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Data');

  // Convert to buffer
  const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

  // Upload to Storage
  const fileRef = ref(storage, masterPath);
  await uploadBytes(fileRef, excelBuffer, {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return masterPath;
}

/**
 * Upload a file to Storage
 */
export async function uploadFileToStorage(
  file: File,
  storagePath: string
): Promise<string> {
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, file);
  return storagePath;
}

/**
 * Parse Excel/CSV file and return rows
 */
export async function parseFile(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        let workbook: XLSX.WorkBook;
        
        if (file.name.endsWith('.csv')) {
          workbook = XLSX.read(data, { type: 'string', raw: false, cellDates: true });
        } else {
          workbook = XLSX.read(data, { type: 'binary', raw: false, cellDates: true });
        }
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
        
        resolve(rows as Record<string, any>[]);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  });
}

/**
 * Update a specific order in the master file
 * This is critical for maintaining data consistency
 */
export async function updateOrderInMasterFile(
  companyId: string,
  platformId: string,
  orderId: string,
  subOrderId: string,
  updates: Partial<MergedRow>
): Promise<void> {
  const masterPath = getMasterFilePath(companyId, platformId);
  
  try {
    // Read existing master file
    const existingRows = await readMasterFile(masterPath);
    
    if (existingRows.length === 0) {
      throw new Error(`Master file not found for company ${companyId} and platform ${platformId}`);
    }
    
    // Find the order to update
    const key = `${orderId}_${subOrderId || orderId}`.toLowerCase().trim();
    const orderIndex = existingRows.findIndex(
      row => `${row.orderId}_${row.subOrderId || row.orderId}`.toLowerCase().trim() === key
    );
    
    if (orderIndex === -1) {
      throw new Error(`Order ${orderId} not found in master file`);
    }
    
    // Update the order
    const updatedRow: MergedRow = {
      ...existingRows[orderIndex],
      ...updates,
      // Preserve orderId and subOrderId as they are the key
      orderId: existingRows[orderIndex].orderId,
      subOrderId: existingRows[orderIndex].subOrderId || existingRows[orderIndex].orderId,
    };
    
    existingRows[orderIndex] = updatedRow;
    
    // Sort by orderId and subOrderId for consistency
    existingRows.sort((a, b) => {
      const aKey = `${a.orderId}_${a.subOrderId || a.orderId}`;
      const bKey = `${b.orderId}_${b.subOrderId || b.orderId}`;
      return aKey.localeCompare(bKey);
    });
    
    // Create Excel workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(existingRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Data');
    
    // Convert to buffer
    const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    
    // Upload to Storage
    const fileRef = ref(storage, masterPath);
    await uploadBytes(fileRef, excelBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  } catch (error: any) {
    throw new Error(`Failed to update order in master file: ${error.message}`);
  }
}

/**
 * Download master file as blob
 * Uses getDownloadURL() - signed URLs bypass CORS restrictions
 */
export async function downloadMasterFile(storagePath: string): Promise<Blob> {
  try {
    const fileRef = ref(storage, storagePath);
    // Use getDownloadURL() - signed URLs bypass CORS completely
    const downloadURL = await getDownloadURL(fileRef);
    
    // Fetch the file using the signed URL (no CORS issues)
    const response = await fetch(downloadURL);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    return blob;
  } catch (error: any) {
    if (error?.code === 'storage/object-not-found' || error?.message?.includes('not found') || error?.message?.includes('404')) {
      throw new Error('Master file not found');
    }
    throw new Error(`Failed to download file: ${error.message || 'Unknown error'}`);
  }
}

