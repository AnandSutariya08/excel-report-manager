# Complete File Upload and Master File Logic

## Overview

This document explains the complete flow of:
1. **File Upload Process**
2. **Master File Creation** (first upload)
3. **Master File Merging** (subsequent uploads)

---

## 📤 **STEP 1: FILE UPLOAD PROCESS**

### Location: `src/pages/Upload.tsx` → `processFile()` function

### Flow:

#### **1.1 Parse the Excel/CSV File**
```typescript
// Line 142-144
const rows = await parseFile(file);
// Returns: Array of objects, each object is a row from Excel
// Example: [{ "Order Id": "ORD123", "Product Name": "Widget", ... }, ...]
```

#### **1.2 Extract Month from Order Date**
```typescript
// Line 152-154
const firstOrderDate = getValue(rows[0], headers.orderDate);
const month = extractMonth(firstOrderDate);
// Returns: "2025-12" (YYYY-MM format)
// This determines which master file to use/update
```

#### **1.3 Map Each Row to MergedRow Format**
```typescript
// Line 156-263
for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  
  // Extract orderId and subOrderId (required for matching)
  const orderId = getValue(row, headers.orderId);
  const subOrderId = getValue(row, headers.subOrderId) || orderId;
  
  // Create unique key for deduplication (case-insensitive)
  const uniqueKey = `${orderId}_${subOrderId}`.toLowerCase().trim();
  
  // Skip duplicates within the same file
  if (processedKeys.has(uniqueKey)) {
    duplicateCount++;
    continue; // Skip this row
  }
  processedKeys.add(uniqueKey);
  
  // Create MergedRow object
  const mergedRow: MergedRow = {
    orderId,
    subOrderId,
    orderDate,
    ...row, // Include ALL raw data from Excel
  };
  
  // Map fields based on upload type (sales/payment/gst/refund)
  if (uploadType === 'sales') {
    mergedRow.productName = getValue(row, headers.productName);
    mergedRow.sku = getValue(row, headers.sku);
    // ... map all sales fields
  }
  
  // Similar mapping for payment, gst, refund...
  
  mergedRows.push(mergedRow);
}
```

**Key Points:**
- ✅ Deduplicates within the same file (prevents same order appearing twice)
- ✅ Maps Excel columns to internal fields using header configuration
- ✅ Preserves ALL raw data from Excel (spread operator `...row`)

#### **1.4 Upload Original File to Firebase Storage**
```typescript
// Line 265-268
const uploadedFilePath = getUploadedFilePath(
  selectedCompany, 
  selectedPlatform, 
  month, 
  uploadType, 
  file.name
);
// Path: companies/{companyId}/platforms/{platformId}/{month}/{fileType}/{fileName}
await uploadFileToStorage(file, uploadedFilePath);
```

#### **1.5 Merge into Master File** (See Step 2 & 3 below)
```typescript
// Line 270-278
const masterFilePath = await mergeIntoMasterFile(
  selectedCompany,
  selectedPlatform,
  month,
  mergedRows,  // Array of processed rows
  uploadType   // 'sales' | 'payment' | 'gst' | 'refund'
);
```

#### **1.6 Store Metadata in Firestore**
```typescript
// Line 280-297
await addUploadedFile({
  fileName: file.name,
  fileType: uploadType,
  companyId: selectedCompany,
  platformId: selectedPlatform,
  recordsCount: successCount,
  storagePath: uploadedFilePath,      // Path to original file
  masterFilePath: masterFilePath,     // Path to master file
  month: month,
  // ... other metadata
});
```

---

## 📁 **STEP 2: MASTER FILE CREATION (First Upload)**

### Location: `src/lib/masterFileService.ts` → `mergeIntoMasterFile()` function

### Scenario: User uploads **Sales File** for January 2025 (first file ever)

#### **2.1 Check if Master File Exists**
```typescript
// Line 239-247
const masterPath = getMasterFilePath(companyId, platformId, month);
// Path: companies/{companyId}/platforms/{platformId}/master_2025-01.xlsx

let existingRows: MergedRow[] = [];
try {
  existingRows = await readMasterFile(masterPath);
} catch (error) {
  // Master file doesn't exist yet (404 error)
  console.log('Master file does not exist, creating new one');
  existingRows = []; // Start with empty array
}
```

**Result:** `existingRows = []` (empty, because file doesn't exist)

#### **2.2 Create Map of Existing Rows**
```typescript
// Line 249-254
const existingMap = new Map<string, MergedRow>();
existingRows.forEach(row => {
  const key = `${row.orderId}_${row.subOrderId || row.orderId}`;
  existingMap.set(key, { ...row });
});
// Result: existingMap = {} (empty map)
```

#### **2.3 Process New Rows**
```typescript
// Line 256-285
const newRowsMap = new Map<string, MergedRow>();

newRows.forEach(newRow => {
  const key = `${newRow.orderId}_${newRow.subOrderId || newRow.orderId}`.toLowerCase().trim();
  const existing = existingMap.get(key); // undefined (no existing data)
  
  if (existing) {
    // Skip - no existing data
  } else {
    // New row - add to newRowsMap
    newRowsMap.set(key, { ...newRow });
  }
});

// Add all new rows to existingMap
newRowsMap.forEach((row, key) => {
  existingMap.set(key, row); // Add all new rows
});
```

**Result:** `existingMap` now contains all rows from the sales file

#### **2.4 Create Excel File and Upload**
```typescript
// Line 294-316
const mergedRows = Array.from(existingMap.values());

// Sort by orderId + subOrderId
mergedRows.sort((a, b) => {
  const aKey = `${a.orderId}_${a.subOrderId || a.orderId}`;
  const bKey = `${b.orderId}_${b.subOrderId || b.orderId}`;
  return aKey.localeCompare(bKey);
});

// Create Excel workbook
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(mergedRows);
XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Data');

// Convert to buffer and upload
const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
const fileRef = ref(storage, masterPath);
await uploadBytes(fileRef, excelBuffer, {
  contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
});
```

**Result:** Master file created at `companies/{companyId}/platforms/{platformId}/master_2025-01.xlsx`

---

## 🔄 **STEP 3: MASTER FILE MERGING (Subsequent Uploads)**

### Location: `src/lib/masterFileService.ts` → `mergeIntoMasterFile()` + `mergeRowData()` functions

### Scenario: User uploads **Payment File** for the same month (master file already exists)

#### **3.1 Read Existing Master File**
```typescript
// Line 242-247
let existingRows: MergedRow[] = [];
try {
  existingRows = await readMasterFile(masterPath);
  // Successfully reads existing master file
} catch (error) {
  // Won't execute - file exists
}
```

**Result:** `existingRows` contains all rows from previous sales file upload

#### **3.2 Create Map of Existing Rows**
```typescript
// Line 249-254
const existingMap = new Map<string, MergedRow>();
existingRows.forEach(row => {
  const key = `${row.orderId}_${row.subOrderId || row.orderId}`;
  existingMap.set(key, { ...row });
});
// Result: existingMap contains all existing orders
// Example: { "ORD123_ORD123": { orderId: "ORD123", productName: "Widget", ... } }
```

#### **3.3 Process New Rows and Merge**
```typescript
// Line 256-285
newRows.forEach(newRow => {
  const key = `${newRow.orderId}_${newRow.subOrderId || newRow.orderId}`.toLowerCase().trim();
  const existing = existingMap.get(key);
  
  if (existing) {
    // ✅ MATCH FOUND - Merge data intelligently
    const merged = mergeRowData(existing, newRow, fileType);
    existingMap.set(key, merged);
  } else {
    // New order (not in master file yet)
    newRowsMap.set(key, { ...newRow });
  }
});
```

#### **3.4 Intelligent Merging Logic** (`mergeRowData()` function)

**Location:** `src/lib/masterFileService.ts` → `mergeRowData()` (Line 142-226)

**Key Principle:** 
- **Preserve existing data** from master file
- **Add/Update only relevant fields** based on file type
- **Never overwrite with empty values**

**Example: Merging Payment Data into Existing Sales Data**

```typescript
// Existing row (from sales file):
existing = {
  orderId: "ORD123",
  subOrderId: "ORD123",
  productName: "Widget",
  sku: "SKU001",
  quantity: 5,
  wholesalePrice: 1000,
  // ... sales fields
}

// New row (from payment file):
newRow = {
  orderId: "ORD123",
  subOrderId: "ORD123",
  paymentMode: "UPI",
  netAmount: 950,
  commission: 50,
  tcs: 10,
  // ... payment fields
}

// After mergeRowData(existing, newRow, 'payment'):
merged = {
  orderId: "ORD123",           // ✅ Preserved from existing
  subOrderId: "ORD123",         // ✅ Preserved from existing
  productName: "Widget",        // ✅ Preserved from existing
  sku: "SKU001",                // ✅ Preserved from existing
  quantity: 5,                  // ✅ Preserved from existing
  wholesalePrice: 1000,         // ✅ Preserved from existing
  paymentMode: "UPI",           // ✅ Added from payment file
  netAmount: 950,               // ✅ Added from payment file
  commission: 50,               // ✅ Added from payment file
  tcs: 10,                      // ✅ Added from payment file
  // ... all fields merged
}
```

**File Type-Specific Merging:**

1. **Sales File (`fileType === 'sales'`):**
   - Updates: productName, sku, quantity, status, customer info, prices
   - Creates new orders if they don't exist

2. **Payment File (`fileType === 'payment'`):**
   - Updates: paymentMode, hsn, commission, tcs, tds, netAmount
   - Can also update: productName, status, customer info (if present in payment file)

3. **GST File (`fileType === 'gst'`):**
   - Updates: invoiceNumber, invoiceDate, hsn, gstRate, taxableValue, cgst, sgst, igst
   - Can also update: sku, productName, quantity (if present in GST file)

4. **Refund File (`fileType === 'refund'`):**
   - Updates: refundAmount, deductionAmount, refundReason, refundDate

#### **3.5 Add New Rows (Orders Not in Master File)**
```typescript
// Line 287-292
newRowsMap.forEach((row, key) => {
  if (!existingMap.has(key)) {
    existingMap.set(key, row); // Add new orders
  }
});
```

**Result:** `existingMap` now contains:
- ✅ All existing orders (from sales file)
- ✅ Updated with payment data (merged)
- ✅ Any new orders from payment file (if any)

#### **3.6 Recreate and Upload Master File**
```typescript
// Line 294-316
const mergedRows = Array.from(existingMap.values());
// Sort, create Excel, upload to Storage
// Master file is now updated with merged data
```

**Result:** Master file updated with:
- Sales data (from first upload)
- Payment data (merged into matching orders)

---

## 🔑 **KEY FEATURES**

### **1. Duplicate Prevention**
- ✅ **Within same file:** Deduplicates using `orderId + subOrderId` (case-insensitive)
- ✅ **Across files:** Uses same key to match and merge instead of creating duplicates

### **2. Flexible Upload Order**
- ✅ Can upload **Sales → Payment → GST** in any order
- ✅ Can upload **Payment → Sales → GST** (payment creates order, sales updates it)
- ✅ Master file intelligently merges based on what data exists

### **3. Data Preservation**
- ✅ **Never overwrites** existing data with empty values
- ✅ **Preserves** all fields from previous uploads
- ✅ **Adds** new fields from current upload
- ✅ **Updates** only relevant fields based on file type

### **4. Case-Insensitive Matching**
```typescript
const key = `${orderId}_${subOrderId}`.toLowerCase().trim();
// "ORD123_ORD123" matches "ord123_ord123"
```

### **5. One Master File Per Platform Per Month**
```
Path: companies/{companyId}/platforms/{platformId}/master_{YYYY-MM}.xlsx
Example: companies/comp123/platforms/platform456/master_2025-01.xlsx
```

---

## 📊 **COMPLETE EXAMPLE FLOW**

### Scenario: Upload 3 files for January 2025

#### **Upload 1: Sales File**
- **Input:** Sales report with 100 orders
- **Process:** 
  - Parse file → 100 rows
  - Upload original to Storage
  - Create master file with 100 orders (sales data only)
- **Master File:** 100 rows with sales fields

#### **Upload 2: Payment File**
- **Input:** Payment sheet with 95 orders (some orders from sales file, 5 new)
- **Process:**
  - Parse file → 95 rows
  - Upload original to Storage
  - Read existing master file (100 rows)
  - Match 90 orders by `orderId + subOrderId`
  - Merge payment data into 90 existing orders
  - Add 5 new orders (with payment data only)
- **Master File:** 105 rows (100 updated with payment, 5 new)

#### **Upload 3: GST File**
- **Input:** GST report with 105 orders (all orders from master file)
- **Process:**
  - Parse file → 105 rows
  - Upload original to Storage
  - Read existing master file (105 rows)
  - Match all 105 orders by `orderId + subOrderId`
  - Merge GST data into all existing orders
- **Master File:** 105 rows (all updated with GST data)

**Final Master File Contains:**
- ✅ Sales data (from upload 1)
- ✅ Payment data (from upload 2, merged)
- ✅ GST data (from upload 3, merged)
- ✅ All 105 orders with complete information

---

## 🎯 **SUMMARY**

1. **Upload:** Parse Excel → Map rows → Upload original file
2. **Master File Creation:** First upload creates master file
3. **Master File Merging:** Subsequent uploads:
   - Read existing master file
   - Match orders by `orderId + subOrderId` (case-insensitive)
   - Intelligently merge data based on file type
   - Preserve existing data, add/update new data
   - Recreate and upload updated master file

**Result:** One consolidated master file per platform per month with all data merged intelligently, no duplicates, and flexible upload order.

