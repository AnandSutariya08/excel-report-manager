# Excel Merge File Flow Analysis

## ✅ Current Merge Flow (Step by Step)

### 1. **File Upload Process** (`Upload.tsx` → `processFile()`)

1. **Parse Excel/CSV File**
   - Uses `parseFile()` to read Excel/CSV
   - Returns array of row objects

2. **Extract Month from Order Date**
   - Tries first 5 rows to find valid date
   - Uses `extractMonth()` to get YYYY-MM format
   - Fallback to current month if no date found

3. **Map Rows to MergedRow Format**
   - For each row:
     - Extract `orderId` and `subOrderId` (required)
     - Create unique key: `${orderId}_${subOrderId}`.toLowerCase().trim()
     - **Skip duplicates within same file** (prevents same order twice)
     - Map fields based on upload type (sales/payment/gst/refund)
     - Preserve ALL raw data from Excel (`...row`)

4. **Upload Original File to Storage**
   - Path: `companies/{companyId}/platforms/{platformId}/{month}/{fileType}/{fileName}`
   - Preserves original file for audit trail

5. **Merge into Master File**
   - Calls `mergeIntoMasterFile()` with processed rows
   - Master file path: `companies/{companyId}/platforms/{platformId}/master.xlsx`
   - **ONE master file per platform (lifetime, not per month)**

6. **Store Metadata in Firestore**
   - Records upload history, file path, row counts, etc.

---

### 2. **Master File Merging** (`masterFileService.ts` → `mergeIntoMasterFile()`)

#### **Step 1: Read Existing Master File**
```typescript
let existingRows = await readMasterFile(masterPath);
// Returns empty array [] if file doesn't exist (first upload)
```

#### **Step 2: Create Map of Existing Rows**
```typescript
const existingMap = new Map<string, MergedRow>();
existingRows.forEach(row => {
  const key = `${row.orderId}_${row.subOrderId || row.orderId}`.toLowerCase().trim();
  existingMap.set(key, { ...row });
});
```
**Key Format:** `orderId_subOrderId` (lowercase, trimmed)
**Purpose:** Fast lookup for matching orders

#### **Step 3: Process New Rows**
For each new row:
1. **Create key:** `${orderId}_${subOrderId}`.toLowerCase().trim()
2. **Check if exists in master file:**
   - ✅ **If exists:** Call `mergeRowData()` to intelligently merge data
   - ❌ **If new:** Check for duplicates within new batch
     - If duplicate in new batch: Merge within new batch
     - If truly new: Add to newRowsMap

#### **Step 4: Add New Rows to Master**
```typescript
newRowsMap.forEach((row, key) => {
  if (!existingMap.has(key)) {
    existingMap.set(key, row); // Add new orders
  }
});
```

#### **Step 5: Create and Upload Updated Master File**
- Convert map to array (ensures no duplicates)
- Sort by orderId + subOrderId for consistency
- Create Excel workbook
- Upload to Firebase Storage

---

### 3. **Intelligent Data Merging** (`mergeRowData()`)

This function preserves existing data and adds/updates new data based on file type:

#### **Sales File Merge:**
- Updates: productName, sku, quantity, status, customer info, prices, shipping
- Preserves: payment data, GST data, refund data

#### **Payment File Merge:**
- Updates: paymentMode, hsn, commission, tcs, tds, netAmount
- Can also update: wholesalePrice, shippingCharge, customer info, status
- Preserves: sales data, GST data, refund data

#### **GST File Merge:**
- Updates: invoiceNumber, invoiceDate, hsn, gstRate, CGST, SGST, IGST, taxableValue
- Can also update: sku, productName, quantity, customerState, status
- Preserves: sales data, payment data, refund data

#### **Refund File Merge:**
- Updates: refundAmount, deductionAmount, refundReason, refundDate, gstRefund
- Preserves: all other data

**Key Principle:** Only update fields relevant to the file type being merged.

---

### 4. **Order Updates** (`updateOrderInMasterFile()`)

When an order is updated (e.g., status change, return processing):

1. Read existing master file
2. Find order by `orderId + subOrderId` (case-insensitive)
3. Update the order with new data
4. Preserve orderId and subOrderId (they are the key)
5. Recreate and upload master file

---

## 🐛 **CRITICAL BUG FOUND**

### **Issue: Inconsistent Key Creation**

**Location:** `masterFileService.ts` line 298 vs line 312

**Problem:**
- Line 298 (existing rows): `const key = \`${row.orderId}_${row.subOrderId || row.orderId}\`;` ❌ No toLowerCase().trim()
- Line 312 (new rows): `const key = \`${newRow.orderId}_${newRow.subOrderId || newRow.orderId}\`.toLowerCase().trim();` ✅ Has toLowerCase().trim()

**Impact:**
- Existing rows: key = "ORD123_ORD123"
- New rows: key = "ord123_ord123"
- **They won't match!** This causes:
  - Duplicate orders in master file
  - Failed merges
  - Data inconsistency

**Fix Required:** Make key creation consistent everywhere.

---

## ✅ **What Works Correctly**

1. ✅ **Duplicate Prevention:** Within same file and across uploads
2. ✅ **Data Preservation:** Existing data is preserved when merging
3. ✅ **Flexible Upload Order:** Can upload sales/payment/GST in any order
4. ✅ **Field-Specific Merging:** Only updates relevant fields per file type
5. ✅ **Raw Data Preservation:** All original Excel columns preserved
6. ✅ **Case-Insensitive Matching:** (once bug is fixed)

---

## ⚠️ **What Needs Fixing**

1. ❌ **Key Consistency Bug:** Must use toLowerCase().trim() everywhere
2. ⚠️ **CORS Configuration:** Still needs to be configured (external setup)

---

## 📊 **Example Merge Flow**

### Scenario: Upload Sales File → Payment File → GST File

**Upload 1: Sales File (100 orders)**
- Parse: 100 rows
- Master file: Empty → Create new with 100 orders
- Result: 100 orders with sales data only

**Upload 2: Payment File (95 orders, 90 existing + 5 new)**
- Parse: 95 rows
- Master file: 100 orders
- Match: 90 orders found → Merge payment data
- New: 5 orders added
- Result: 105 orders (100 with sales+payment, 5 with payment only)

**Upload 3: GST File (105 orders, all existing)**
- Parse: 105 rows
- Master file: 105 orders
- Match: All 105 orders found → Merge GST data
- Result: 105 orders with complete data (sales+payment+GST)

**Final Master File:**
- ✅ 105 unique orders
- ✅ No duplicates
- ✅ Complete data from all file types
- ✅ Sorted by orderId + subOrderId

---

## 🎯 **Summary**

The merge flow is **mostly correct** but has **one critical bug** that must be fixed:
- **Key consistency issue** will cause duplicates and failed merges
- Once fixed, the merge logic is solid and handles all edge cases
- The intelligent merging preserves data correctly
- Duplicate prevention works within files and across uploads

