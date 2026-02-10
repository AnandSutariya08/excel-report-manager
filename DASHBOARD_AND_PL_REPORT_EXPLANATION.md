# 📊 Dashboard & P&L Report - Complete Explanation

## 🎯 **How Dashboard Works**

### **1. Data Flow Overview**

```
Excel Files (Different Platforms)
    ↓
Header Mapping (Platform-specific column names)
    ↓
Normalized Data (Standard field names)
    ↓
Master Excel Files (One per platform)
    ↓
Orders Array (Unified format)
    ↓
Dashboard Calculations
    ↓
P&L Reports & Analytics
```

---

## 🔄 **Step-by-Step Process**

### **Step 1: Header Mapping System**

**Problem:** Different platforms (Flipkart, Amazon, Meesho, etc.) use different column names in their Excel exports.

**Solution:** Each platform has a **Header Mapping** configuration that maps platform-specific column names to standard internal field names.

**Example:**
- **Flipkart** might use: `Order ID`, `Product Name`, `Selling Price`
- **Amazon** might use: `OrderNumber`, `Item Name`, `Sale Price`
- **Meesho** might use: `OrderId`, `Product`, `Price`

**Configuration Location:** `Companies > [Company] > [Platform] > Platform Settings`

**How it works:**
```typescript
// Platform configuration stores:
salesHeaders: {
  orderId: "Order ID",        // Flipkart column name
  productName: "Product Name", // Flipkart column name
  sellingPrice: "Selling Price" // Flipkart column name
}

// When uploading, the system:
1. Reads Excel file with actual column names
2. Uses header mapping to find the right column
3. Extracts data and normalizes to standard field names
```

---

### **Step 2: File Upload & Normalization**

**Location:** `src/pages/Upload.tsx`

**Process:**
1. **User uploads Excel file** (Sales/Payment/GST/Refund)
2. **System reads platform headers** from Firestore
3. **`getValue()` function** extracts data using header mapping:
   ```typescript
   // Example: If platform uses "Order ID" but code expects "orderId"
   const orderId = getValue(row, headers.orderId); 
   // Returns value from "Order ID" column
   ```
4. **Data is normalized** to standard `MergedRow` format
5. **Merged into master file** (one per platform)

**Key Function:**
```typescript
function getValue(row: Record<string, any>, headerName: string): string {
  if (!headerName) return '';
  // Case-insensitive search for column name
  const key = Object.keys(row).find(
    k => k.toLowerCase().trim() === headerName.toLowerCase().trim()
  );
  return key ? String(row[key] || '') : '';
}
```

---

### **Step 3: Master File System**

**Location:** `src/lib/masterFileService.ts`

**Key Points:**
- **ONE master file per platform** (lifetime, not per month)
- Contains **all merged data** from all uploads (Sales + Payment + GST + Refund)
- Uses **standardized field names** (normalized from different platforms)
- Stored in Firebase Storage: `companies/{companyId}/platforms/{platformId}/master.xlsx`

**Why this works:**
- All platforms' data is normalized to the same field names
- Dashboard can read from all master files using the same field names
- No need to know which platform the data came from

---

### **Step 4: Loading Orders**

**Location:** `src/lib/masterFileLoader.ts` & `src/contexts/DataContext.tsx`

**Process:**
1. **Reads all master files** from all platforms
2. **Converts MergedRow to Order** format (standardized)
3. **Combines into single orders array**
4. **Stored in DataContext** for use across the app

**Code:**
```typescript
// Loads from all platforms
const orders = await loadOrdersFromMasterFiles(companies, uploadedFiles);

// All orders now have same field names:
// - orderId, productName, netAmount, wholesalePrice, etc.
// - Regardless of which platform they came from
```

---

### **Step 5: Dashboard Calculations**

**Location:** `src/pages/Dashboard.tsx`

**How it works:**
1. **Filters orders** by company, date range, etc.
2. **Calculates metrics** using standardized field names
3. **All platforms use same calculations** because data is normalized

**P&L Calculation:**
```typescript
// Revenue (from delivered orders only)
const totalRevenue = delivered.reduce((sum, o) => sum + o.netAmount, 0);

// Cost (wholesale price × quantity)
const totalCost = delivered.reduce((sum, o) => sum + (o.wholesalePrice * o.quantity), 0);

// Expenses
const totalCommission = delivered.reduce((sum, o) => sum + o.commission, 0);
const totalShipping = delivered.reduce((sum, o) => sum + o.shippingCharge, 0);

// Profit/Loss
const profit = totalRevenue - totalCost - totalCommission - totalShipping;
const profitMargin = (profit / totalRevenue) * 100;
```

**Key Points:**
- ✅ Uses `netAmount` (standardized field) - works for all platforms
- ✅ Uses `wholesalePrice` (standardized field) - works for all platforms
- ✅ Uses `commission` (standardized field) - works for all platforms
- ✅ **No platform-specific logic needed** - data is already normalized

---

## 💰 **P&L Report Generation**

### **Revenue Calculation:**
- **Source:** `netAmount` field from delivered orders
- **Platform Independent:** All platforms map their "net amount" column to `netAmount`
- **Formula:** Sum of all `netAmount` for delivered orders

### **Cost Calculation:**
- **Source:** `wholesalePrice × quantity` from delivered orders
- **Platform Independent:** All platforms map their "cost/wholesale price" column to `wholesalePrice`
- **Formula:** Sum of `(wholesalePrice × quantity)` for delivered orders

### **Expenses:**
1. **Commission:** `commission` field (platform fees)
2. **Shipping:** `shippingCharge` field
3. **Taxes:** `cgst + sgst + igst` fields
4. **TCS/TDS:** `tcs + tds` fields

### **Profit/Loss:**
```
Profit = Revenue - Cost - Commission - Shipping - Taxes
Profit Margin = (Profit / Revenue) × 100
```

---

## 🌐 **Multi-Platform Support**

### **How Different Header Names Work:**

**Example Scenario:**
- **Platform 1 (Flipkart):** Uses "Order ID", "Product Name", "Net Amount"
- **Platform 2 (Amazon):** Uses "OrderNumber", "Item Name", "Sale Price"
- **Platform 3 (Meesho):** Uses "OrderId", "Product", "Price"

**Solution:**
1. **Each platform configured separately:**
   - Flipkart: `orderId: "Order ID"`, `productName: "Product Name"`, `netAmount: "Net Amount"`
   - Amazon: `orderId: "OrderNumber"`, `productName: "Item Name"`, `netAmount: "Sale Price"`
   - Meesho: `orderId: "OrderId"`, `productName: "Product"`, `netAmount: "Price"`

2. **During upload:**
   - System reads platform-specific headers
   - Maps to standard field names
   - Stores in master file with standard names

3. **In Dashboard:**
   - Reads from master files (all have standard names)
   - Calculates P&L using standard field names
   - **No need to know which platform data came from**

---

## 📈 **Dashboard Features**

### **1. Revenue Metrics**
- Total Revenue (from `netAmount`)
- Average Order Value
- Revenue Trend Chart

### **2. Profit/Loss Metrics**
- Total Profit/Loss
- Profit Margin %
- Cost Breakdown (wholesale, commission, shipping)

### **3. Order Analytics**
- Total Orders
- Delivered Orders
- Returned Orders
- Order Status Distribution

### **4. Geographic Analytics**
- State-wise Performance
- Revenue by State

### **5. Product Analytics**
- Top Selling Products
- Product Revenue
- Product Quantity Sold

---

## ✅ **Why This System Works**

### **1. Normalization at Upload Time**
- Different column names are mapped to standard names **once** during upload
- Master files always use standard names
- Dashboard doesn't need to know about platform differences

### **2. Single Source of Truth**
- Master files contain all data in standardized format
- No need to query multiple sources with different formats
- Consistent calculations across all platforms

### **3. Flexible Header Mapping**
- Each platform can have completely different column names
- Configuration is done once per platform
- No code changes needed for new platforms

### **4. Accurate P&L Calculation**
- All financial fields are standardized (`netAmount`, `wholesalePrice`, `commission`, etc.)
- Same calculation logic works for all platforms
- Consistent results regardless of platform

---

## 🔍 **Example: Real-World Flow**

### **Scenario:**
- **Company:** "ABC Trading"
- **Platforms:** Flipkart, Amazon, Meesho
- **Each platform has different Excel column names**

### **Step 1: Configuration**
```
Flipkart Platform:
  salesHeaders: {
    orderId: "Order ID",
    productName: "Product Name",
    netAmount: "Net Amount",
    wholesalePrice: "Wholesale Price"
  }

Amazon Platform:
  salesHeaders: {
    orderId: "OrderNumber",
    productName: "Item Name",
    netAmount: "Sale Price",
    wholesalePrice: "Cost"
  }

Meesho Platform:
  salesHeaders: {
    orderId: "OrderId",
    productName: "Product",
    netAmount: "Price",
    wholesalePrice: "Cost Price"
  }
```

### **Step 2: Upload Files**
- Upload Flipkart sales file → Maps "Order ID" to `orderId`, "Net Amount" to `netAmount`
- Upload Amazon sales file → Maps "OrderNumber" to `orderId`, "Sale Price" to `netAmount`
- Upload Meesho sales file → Maps "OrderId" to `orderId`, "Price" to `netAmount`

### **Step 3: Master Files Created**
- `companies/abc/platforms/flipkart/master.xlsx` → Standard field names
- `companies/abc/platforms/amazon/master.xlsx` → Standard field names
- `companies/abc/platforms/meesho/master.xlsx` → Standard field names

### **Step 4: Dashboard Loads All**
- Reads all 3 master files
- All have same field names (`orderId`, `netAmount`, etc.)
- Combines into single orders array

### **Step 5: P&L Calculation**
```typescript
// Works for ALL platforms because data is normalized
const totalRevenue = orders
  .filter(o => o.status === 'delivered')
  .reduce((sum, o) => sum + o.netAmount, 0); // ✅ Same field name for all

const totalCost = orders
  .filter(o => o.status === 'delivered')
  .reduce((sum, o) => sum + (o.wholesalePrice * o.quantity), 0); // ✅ Same field name for all

const profit = totalRevenue - totalCost - totalCommission - totalShipping;
```

**Result:** Accurate P&L report combining data from all 3 platforms, even though they had different column names!

---

## 🎯 **Summary**

1. **Header Mapping:** Each platform maps its unique column names to standard field names
2. **Normalization:** Data is normalized during upload to master files
3. **Unified Data:** All platforms' data uses the same field names in master files
4. **Dashboard:** Calculates P&L using standard field names (works for all platforms)
5. **Result:** Accurate multi-platform P&L reports regardless of different Excel column names

**The system is designed to handle platform differences transparently - you configure headers once, and the dashboard works for all platforms automatically!**

