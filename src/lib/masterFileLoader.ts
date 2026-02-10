import { readMasterFile, getMasterFilePath, type MergedRow } from './masterFileService';
import { Order } from '@/contexts/DataContext';

/**
 * Convert MergedRow from master file to Order format
 */
function mergedRowToOrder(row: MergedRow, companyId: string, platformId: string): Order {
  return {
    id: `${row.orderId}_${row.subOrderId || row.orderId}`,
    orderId: row.orderId || '',
    subOrderId: row.subOrderId || row.orderId || '',
    platformId,
    companyId,
    productName: row.productName || '',
    sku: row.sku || '',
    skuName: row.skuName || '',
    quantity: row.quantity || 0,
    status: row.status || '',
    orderDate: row.orderDate || '',
    customerName: row.customerName || '',
    customerState: row.customerState || '',
    customerCity: row.customerCity || '',
    customerPincode: row.customerPincode || '',
    wholesalePrice: row.wholesalePrice || 0,
    sellingPrice: row.sellingPrice || 0,
    shippingCharge: row.shippingCharge || 0,
    paymentMode: row.paymentMode || '',
    hsn: row.hsn || '',
    commission: row.commission || 0,
    tcs: row.tcs || 0,
    tds: row.tds || 0,
    shipperCharge: row.shipperCharge || 0,
    netAmount: row.netAmount || 0,
    gstRate: row.gstRate || 0,
    invoiceNumber: row.invoiceNumber || '',
    invoiceDate: row.invoiceDate || '',
    cgst: row.cgst || 0,
    sgst: row.sgst || 0,
    igst: row.igst || 0,
    taxableValue: row.taxableValue || 0,
    invoiceAmount: row.invoiceAmount || 0,
    refundAmount: row.refundAmount || 0,
    deductionAmount: row.deductionAmount || 0,
    refundReason: row.refundReason || '',
    refundDate: row.refundDate || '',
    gstRefund: 0,
    rawData: row,
    createdAt: '',
    updatedAt: '',
  };
}

/**
 * Load all orders from master files for all companies and platforms
 * ONE master file per platform (lifetime) - uses master.xlsx (no month suffix)
 */
export async function loadOrdersFromMasterFiles(
  companies: Array<{ id: string; platforms: Array<{ id: string }> }>,
  uploadedFiles: Array<{ companyId: string; platformId: string; masterFilePath?: string }>
): Promise<Order[]> {
  const allOrders: Order[] = [];

  // Group by company/platform to get unique master files (one per platform)
  // IGNORE old masterFilePath from Firestore (may have month suffixes)
  // Always use getMasterFilePath() which returns master.xlsx (no month)
  const masterFileMap = new Map<string, { companyId: string; platformId: string }>();
  
  // Get unique company/platform combinations from uploaded files
  const platformSet = new Set<string>();
  uploadedFiles.forEach(file => {
    const key = `${file.companyId}_${file.platformId}`;
    if (!platformSet.has(key)) {
      platformSet.add(key);
      const masterPath = getMasterFilePath(file.companyId, file.platformId);
      masterFileMap.set(masterPath, {
        companyId: file.companyId,
        platformId: file.platformId,
      });
    }
  });

  // Also check all company/platform combinations to ensure we load all master files
  companies.forEach(company => {
    company.platforms.forEach(platform => {
      const masterPath = getMasterFilePath(company.id, platform.id);
      if (!masterFileMap.has(masterPath)) {
        masterFileMap.set(masterPath, {
          companyId: company.id,
          platformId: platform.id,
        });
      }
    });
  });

  // Load all master files (one per platform)
  const loadPromises = Array.from(masterFileMap.entries()).map(async ([masterPath, info]) => {
    try {
      const rows = await readMasterFile(masterPath);
      
      if (rows.length === 0) {
        // File doesn't exist yet - this is normal for new uploads
        return [];
      }
      const orders = rows
        .filter(row => row.orderId && String(row.orderId).trim() !== '') // Filter out rows without orderId
        .map(row => mergedRowToOrder(row, info.companyId, info.platformId));
      return orders;
    } catch (error) {
      // Log error but don't throw - allow other files to load
      // In production, you might want to log to an error service
      return [];
    }
  });

  const ordersArrays = await Promise.all(loadPromises);
  allOrders.push(...ordersArrays.flat());

  return allOrders;
}

/**
 * Load orders for a specific company/platform
 * ONE master file per platform (lifetime)
 */
export async function loadOrdersForPlatform(
  companyId: string,
  platformId: string
): Promise<Order[]> {
  try {
    const masterPath = getMasterFilePath(companyId, platformId);
    const rows = await readMasterFile(masterPath);
    return rows
      .filter(row => row.orderId)
      .map(row => mergedRowToOrder(row, companyId, platformId));
  } catch (error) {
    // Return empty array on error - caller can handle
    return [];
  }
}

