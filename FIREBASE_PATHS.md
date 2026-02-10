# Firebase Paths Documentation

This document outlines all Firebase paths used in the application for both **Firestore** (database) and **Storage** (file storage).

## 🔥 Firestore Collections (Database)

All Firestore paths use the collection/document structure:

### Base Collections
```
/companies/{companyId}
/orders/{orderId}
/inventory/{itemId}
/returns/{returnId}
/deadStock/{itemId}
/uploadedFiles/{fileId}
```

### Detailed Paths

#### 1. Companies Collection
```
/companies/{companyId}
```
**Example:**
```
/companies/comp_abc123xyz
```

**Document Structure:**
```json
{
  "id": "comp_abc123xyz",
  "name": "My Trading Company",
  "description": "Company description",
  "platforms": [
    {
      "id": "platform_xyz789",
      "name": "Amazon",
      "companyId": "comp_abc123xyz",
      "salesHeaders": {...},
      "paymentHeaders": {...},
      "gstHeaders": {...},
      "refundHeaders": {...},
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### 2. Orders Collection
```
/orders/{orderId}
```
**Note:** Currently not used in the new master file flow, but kept for backward compatibility.

#### 3. Inventory Collection
```
/inventory/{itemId}
```
**Example:**
```
/inventory/inv_sku123456
```

#### 4. Returns Collection
```
/returns/{returnId}
```
**Example:**
```
/returns/ret_abc123
```

#### 5. Dead Stock Collection
```
/deadStock/{itemId}
```
**Example:**
```
/deadStock/ds_xyz789
```

#### 6. Uploaded Files Collection (Metadata)
```
/uploadedFiles/{fileId}
```
**Example:**
```
/uploadedFiles/file_20240115_103045
```

**Document Structure:**
```json
{
  "id": "file_20240115_103045",
  "fileName": "january_sales.xlsx",
  "fileType": "sales",
  "companyId": "comp_abc123xyz",
  "companyName": "My Trading Company",
  "platformId": "platform_xyz789",
  "platformName": "Amazon",
  "recordsCount": 1500,
  "uploadDate": "2024-01-15T10:30:45.000Z",
  "uploadedBy": "admin",
  "status": "success",
  "errors": 0,
  "storagePath": "companies/comp_abc123xyz/platforms/platform_xyz789/2024-01/sales/january_sales.xlsx",
  "masterFilePath": "companies/comp_abc123xyz/platforms/platform_xyz789/master_2024-01.xlsx",
  "month": "2024-01"
}
```

---

## 📦 Firebase Storage Paths (Files)

All Storage paths are relative to the storage bucket root.

### Storage Structure Overview
```
companies/
  └── {companyId}/
      └── platforms/
          └── {platformId}/
              ├── master_{month}.xlsx          (Master merged file)
              └── {month}/                     (YYYY-MM format)
                  ├── sales/
                  │   └── {sanitizedFileName}
                  ├── payment/
                  │   └── {sanitizedFileName}
                  ├── gst/
                  │   └── {sanitizedFileName}
                  └── refund/
                      └── {sanitizedFileName}
```

### Detailed Storage Paths

#### 1. Master File Path
**Function:** `getMasterFilePath(companyId, platformId, month)`

**Pattern:**
```
companies/{companyId}/platforms/{platformId}/master_{month}.xlsx
```

**Examples:**
```
companies/comp_abc123xyz/platforms/platform_xyz789/master_2024-01.xlsx
companies/comp_abc123xyz/platforms/platform_xyz789/master_2024-02.xlsx
companies/comp_abc123xyz/platforms/platform_xyz789/master_2024-03.xlsx
```

**Description:**
- One master file per platform per month
- Contains all merged data from sales, payment, and GST files
- Updated incrementally as files are uploaded

#### 2. Uploaded File Path
**Function:** `getUploadedFilePath(companyId, platformId, month, fileType, fileName)`

**Pattern:**
```
companies/{companyId}/platforms/{platformId}/{month}/{fileType}/{sanitizedFileName}
```

**Examples:**

**Sales File:**
```
companies/comp_abc123xyz/platforms/platform_xyz789/2024-01/sales/january_sales_report.xlsx
companies/comp_abc123xyz/platforms/platform_xyz789/2024-01/sales/Jan_Sales_Data.csv
```

**Payment File:**
```
companies/comp_abc123xyz/platforms/platform_xyz789/2024-01/payment/january_payment.xlsx
companies/comp_abc123xyz/platforms/platform_xyz789/2024-01/payment/payment_jan_2024.csv
```

**GST File:**
```
companies/comp_abc123xyz/platforms/platform_xyz789/2024-01/gst/january_gst.xlsx
companies/comp_abc123xyz/platforms/platform_xyz789/2024-01/gst/gst_report_jan.csv
```

**Refund File:**
```
companies/comp_abc123xyz/platforms/platform_xyz789/2024-01/refund/january_refunds.xlsx
```

**File Name Sanitization:**
- Special characters are replaced with underscores
- Only alphanumeric, dots, and hyphens are allowed
- Example: `"Jan Sales (2024).xlsx"` → `"Jan_Sales__2024_.xlsx"`

---

## 📋 Complete Example

### Scenario: Uploading files for January 2024

**Company:** `comp_abc123xyz` (My Trading Company)  
**Platform:** `platform_xyz789` (Amazon)  
**Month:** `2024-01`

#### Step 1: Upload Sales File
- **Original File:** `January_Sales_Report.xlsx`
- **Storage Path:** `companies/comp_abc123xyz/platforms/platform_xyz789/2024-01/sales/January_Sales_Report.xlsx`
- **Master File Created:** `companies/comp_abc123xyz/platforms/platform_xyz789/master_2024-01.xlsx`
- **Firestore Metadata:** `/uploadedFiles/file_20240115_103045`

#### Step 2: Upload Payment File
- **Original File:** `Payment_Jan_2024.csv`
- **Storage Path:** `companies/comp_abc123xyz/platforms/platform_xyz789/2024-01/payment/Payment_Jan_2024.csv`
- **Master File Updated:** `companies/comp_abc123xyz/platforms/platform_xyz789/master_2024-01.xlsx` (merged with sales data)
- **Firestore Metadata:** `/uploadedFiles/file_20240115_104530`

#### Step 3: Upload GST File
- **Original File:** `GST_Report_January.xlsx`
- **Storage Path:** `companies/comp_abc123xyz/platforms/platform_xyz789/2024-01/gst/GST_Report_January.xlsx`
- **Master File Updated:** `companies/comp_abc123xyz/platforms/platform_xyz789/master_2024-01.xlsx` (merged with sales + payment data)
- **Firestore Metadata:** `/uploadedFiles/file_20240115_110215`

### Final Structure

**Storage:**
```
companies/comp_abc123xyz/platforms/platform_xyz789/
  ├── master_2024-01.xlsx (Contains all merged data)
  └── 2024-01/
      ├── sales/
      │   └── January_Sales_Report.xlsx
      ├── payment/
      │   └── Payment_Jan_2024.csv
      └── gst/
          └── GST_Report_January.xlsx
```

**Firestore:**
```
/uploadedFiles/
  ├── file_20240115_103045 (Sales file metadata)
  ├── file_20240115_104530 (Payment file metadata)
  └── file_20240115_110215 (GST file metadata)
```

---

## 🔑 Key Points

1. **Master File:** One per platform per month, contains all merged data
2. **Original Files:** Stored separately by type (sales/payment/gst/refund) for reference
3. **Metadata:** All file information stored in Firestore for quick queries
4. **Month Format:** Always `YYYY-MM` (e.g., `2024-01`, `2024-02`)
5. **File Sanitization:** Special characters in filenames are replaced with underscores
6. **No Duplicates:** Master file uses `orderId + subOrderId` as unique key

---

## 🔍 Accessing Files

### Download Master File
```typescript
import { downloadMasterFile } from '@/lib/masterFileService';

const blob = await downloadMasterFile('companies/comp_abc123xyz/platforms/platform_xyz789/master_2024-01.xlsx');
```

### Read Master File Data
```typescript
import { readMasterFile } from '@/lib/masterFileService';

const rows = await readMasterFile('companies/comp_abc123xyz/platforms/platform_xyz789/master_2024-01.xlsx');
```

### Query Uploaded Files from Firestore
```typescript
import { useData } from '@/contexts/DataContext';

const { uploadedFiles } = useData();
const janFiles = uploadedFiles.filter(f => f.month === '2024-01');
```

