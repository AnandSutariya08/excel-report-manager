import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  db, 
  companiesCollection, 
  inventoryCollection, 
  returnsCollection, 
  deadStockCollection,
  uploadedFilesCollection,
  generateId,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot
} from '@/lib/firebase';
import { loadOrdersFromMasterFiles } from '@/lib/masterFileLoader';
import { updateOrderInMasterFile, getMasterFilePath } from '@/lib/masterFileService';

// Dynamic Header Mapping - stores the Excel column name for each field
export interface HeaderMapping {
  [key: string]: string; // fieldName -> excelColumnName
}

export interface Platform {
  id: string;
  name: string;
  companyId: string;
  // Dynamic header mappings for each file type
  salesHeaders: HeaderMapping;
  paymentHeaders: HeaderMapping;
  gstHeaders: HeaderMapping;
  refundHeaders: HeaderMapping;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  description: string;
  platforms: Platform[];
  createdAt: string;
}

// Order stores ALL data from Excel files, merged by orderId + subOrderId
export interface Order {
  id: string;
  orderId: string;
  subOrderId: string;
  platformId: string;
  companyId: string;
  
  // Sales data
  productName: string;
  sku: string;
  skuName: string;
  quantity: number;
  status: string;
  orderDate: string;
  customerName: string;
  customerState: string;
  customerCity: string;
  customerPincode: string;
  wholesalePrice: number;
  sellingPrice: number;
  shippingCharge: number;
  
  // Payment data
  paymentMode: string;
  hsn: string;
  commission: number;
  tcs: number;
  tds: number;
  shipperCharge: number;
  netAmount: number;
  
  // GST data
  gstRate: number;
  invoiceNumber: string;
  invoiceDate: string;
  cgst: number;
  sgst: number;
  igst: number;
  taxableValue: number;
  invoiceAmount: number;
  
  // Refund/Deduction data
  refundAmount: number;
  deductionAmount: number;
  refundReason: string;
  refundDate: string;
  
  // GST Refund for returned products
  gstRefund: number;
  
  // Raw data from Excel (for viewing all fields)
  rawData: Record<string, any>;
  
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  hsn: string;
  productName: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  imageUrl: string;
  description: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface Return {
  id: string;
  orderId: string;
  subOrderId: string;
  platformId: string;
  companyId: string;
  productName: string;
  sku: string;
  returnDate: string;
  condition: 'good' | 'bad';
  addedToInventory: boolean;
  addedToDeadStock: boolean;
  notes: string;
  createdAt: string;
}

export interface DeadStock {
  id: string;
  sku: string;
  productName: string;
  quantity: number;
  reason: string;
  createdAt: string;
}

export interface UploadedFile {
  id: string;
  fileName: string;
  fileType: 'sales' | 'payment' | 'gst' | 'refund';
  companyId: string;
  companyName: string;
  platformId: string;
  platformName: string;
  recordsCount: number;
  uploadDate: string;
  uploadedBy: string;
  status: 'success' | 'partial' | 'failed';
  errors: number;
  // Storage paths
  storagePath: string; // Path to uploaded file in Storage
  masterFilePath: string; // Path to master file in Storage
  month: string; // Format: YYYY-MM
}

interface DataContextType {
  companies: Company[];
  orders: Order[];
  inventory: InventoryItem[];
  returns: Return[];
  deadStock: DeadStock[];
  uploadedFiles: UploadedFile[];
  loading: boolean;
  
  // Company operations
  addCompany: (company: Omit<Company, 'id' | 'platforms' | 'createdAt'>) => Promise<Company>;
  updateCompany: (id: string, data: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  getCompanyById: (id: string) => Company | undefined;
  
  // Platform operations
  addPlatform: (companyId: string, platform: Omit<Platform, 'id' | 'companyId' | 'createdAt'>) => Promise<Platform>;
  updatePlatform: (platformId: string, data: Partial<Platform>) => Promise<void>;
  deletePlatform: (platformId: string) => Promise<void>;
  getPlatformById: (id: string) => Platform | undefined;
  
  // Order operations
  updateOrder: (id: string, data: Partial<Order>) => Promise<void>;
  getOrdersByCompany: (companyId: string) => Order[];
  getOrdersByPlatform: (platformId: string) => Order[];
  getOrderByIds: (orderId: string, subOrderId?: string) => Order | undefined;
  searchOrders: (query: string) => Order[];
  
  // Inventory operations
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateInventoryItem: (id: string, data: Partial<InventoryItem>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  getInventoryBySKU: (sku: string) => InventoryItem | undefined;
  
  // Return operations
  addReturn: (returnData: Omit<Return, 'id' | 'createdAt'>) => Promise<void>;
  updateReturn: (id: string, data: Partial<Return>) => Promise<void>;
  isOrderReturned: (orderId: string, subOrderId?: string) => boolean;
  
  // Dead stock operations
  addDeadStock: (item: Omit<DeadStock, 'id' | 'createdAt'>) => Promise<void>;
  
  // File operations
  addUploadedFile: (file: Omit<UploadedFile, 'id'>) => Promise<void>;
  deleteUploadedFile: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);
  const [deadStock, setDeadStock] = useState<DeadStock[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from Firebase on mount with real-time listeners
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Companies listener
    const unsubCompanies = onSnapshot(companiesCollection, (snapshot) => {
      const companiesData = snapshot.docs.map(doc => doc.data() as Company);
      setCompanies(companiesData);
    });
    unsubscribers.push(unsubCompanies);

    // Orders are loaded from master files, not Firestore
    // No listener needed - orders are loaded from master files

    // Inventory listener
    const unsubInventory = onSnapshot(inventoryCollection, (snapshot) => {
      const inventoryData = snapshot.docs.map(doc => doc.data() as InventoryItem);
      setInventory(inventoryData);
    });
    unsubscribers.push(unsubInventory);

    // Returns listener
    const unsubReturns = onSnapshot(returnsCollection, (snapshot) => {
      const returnsData = snapshot.docs.map(doc => doc.data() as Return);
      setReturns(returnsData);
    });
    unsubscribers.push(unsubReturns);

    // Dead stock listener
    const unsubDeadStock = onSnapshot(deadStockCollection, (snapshot) => {
      const deadStockData = snapshot.docs.map(doc => doc.data() as DeadStock);
      setDeadStock(deadStockData);
    });
    unsubscribers.push(unsubDeadStock);

    // Uploaded files listener
    const unsubFiles = onSnapshot(uploadedFilesCollection, (snapshot) => {
      const filesData = snapshot.docs.map(doc => doc.data() as UploadedFile);
      setUploadedFiles(filesData);
      setLoading(false);
    });
    unsubscribers.push(unsubFiles);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  // Reload orders when companies or uploadedFiles change
  useEffect(() => {
    if (companies.length > 0 && uploadedFiles.length > 0) {
      setLoading(true);
      loadOrdersFromMasterFiles(companies, uploadedFiles)
        .then(loadedOrders => {
          setOrders(loadedOrders);
          setLoading(false);
        })
        .catch(error => {
          // Log error but don't show to user - they can retry
          setOrders([]); // Clear orders on error
          setLoading(false);
        });
    } else if (companies.length > 0 && uploadedFiles.length === 0) {
      // No files uploaded yet, clear orders
      setOrders([]);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [companies, uploadedFiles]);

  // Company operations
  const addCompany = async (data: Omit<Company, 'id' | 'platforms' | 'createdAt'>): Promise<Company> => {
    try {
      // Validate input
      if (!data.name || !data.name.trim()) {
        throw new Error('Company name is required');
      }

      const newCompany: Company = {
        ...data,
        name: data.name.trim(),
        description: data.description?.trim() || '',
        id: generateId(),
        platforms: [],
        createdAt: new Date().toISOString(),
      };
      
      await setDoc(doc(companiesCollection, newCompany.id), newCompany);
      return newCompany;
    } catch (error: any) {
      throw new Error(`Failed to create company: ${error.message || 'Unknown error'}`);
    }
  };

  const updateCompany = async (id: string, data: Partial<Company>) => {
    const company = companies.find(c => c.id === id);
    if (company) {
      const updated = { ...company, ...data };
      await setDoc(doc(companiesCollection, id), updated);
    }
  };

  const deleteCompany = async (id: string) => {
    await deleteDoc(doc(companiesCollection, id));
    // Note: Orders are stored in master files, not Firestore
    // Master files will remain but won't be loaded since company is deleted
  };

  const getCompanyById = (id: string) => companies.find(c => c.id === id);

  // Platform operations
  const addPlatform = async (companyId: string, data: Omit<Platform, 'id' | 'companyId' | 'createdAt'>): Promise<Platform> => {
    const newPlatform: Platform = {
      ...data,
      id: generateId(),
      companyId,
      createdAt: new Date().toISOString(),
    };
    const company = companies.find(c => c.id === companyId);
    if (company) {
      const updated = { ...company, platforms: [...company.platforms, newPlatform] };
      await setDoc(doc(companiesCollection, companyId), updated);
    }
    return newPlatform;
  };

  const updatePlatform = async (platformId: string, data: Partial<Platform>) => {
    for (const company of companies) {
      const platformIndex = company.platforms.findIndex(p => p.id === platformId);
      if (platformIndex >= 0) {
        const updatedPlatforms = [...company.platforms];
        updatedPlatforms[platformIndex] = { ...updatedPlatforms[platformIndex], ...data };
        await setDoc(doc(companiesCollection, company.id), { ...company, platforms: updatedPlatforms });
        break;
      }
    }
  };

  const deletePlatform = async (platformId: string) => {
    for (const company of companies) {
      const platformIndex = company.platforms.findIndex(p => p.id === platformId);
      if (platformIndex >= 0) {
        const updatedPlatforms = company.platforms.filter(p => p.id !== platformId);
        await setDoc(doc(companiesCollection, company.id), { ...company, platforms: updatedPlatforms });
        // Note: Orders are stored in master files, not Firestore
        // Master files will remain but won't be loaded since platform is deleted
        break;
      }
    }
  };

  const getPlatformById = (id: string) => {
    for (const company of companies) {
      const platform = company.platforms.find(p => p.id === id);
      if (platform) return platform;
    }
    return undefined;
  };

  // Order operations - Legacy function removed
  // Orders are now managed through master files only
  // File uploads are handled in Upload.tsx which directly updates master files

  /**
   * Update order in master file - CRITICAL: This ensures data consistency
   * Updates are written to master files, not Firestore
   */
  const updateOrder = async (id: string, data: Partial<Order>) => {
    const order = orders.find(o => o.id === id);
    if (!order) {
      throw new Error(`Order with ID ${id} not found`);
    }

    try {
      // Convert Order fields to MergedRow format for master file
      const masterFileUpdates: Partial<MergedRow> = {};
      
      if (data.status !== undefined) masterFileUpdates.status = data.status;
      if (data.gstRefund !== undefined) masterFileUpdates.gstRefund = data.gstRefund;
      if (data.refundAmount !== undefined) masterFileUpdates.refundAmount = data.refundAmount;
      if (data.deductionAmount !== undefined) masterFileUpdates.deductionAmount = data.deductionAmount;
      if (data.refundReason !== undefined) masterFileUpdates.refundReason = data.refundReason;
      if (data.refundDate !== undefined) masterFileUpdates.refundDate = data.refundDate;
      
      // Update master file
      await updateOrderInMasterFile(
        order.companyId,
        order.platformId,
        order.orderId,
        order.subOrderId,
        masterFileUpdates
      );

      // Reload orders from master files to reflect the update
      if (companies.length > 0 && uploadedFiles.length > 0) {
        const loadedOrders = await loadOrdersFromMasterFiles(companies, uploadedFiles);
        setOrders(loadedOrders);
      }
    } catch (error: any) {
      throw new Error(`Failed to update order in master file: ${error.message}`);
    }
  };

  const getOrdersByCompany = (companyId: string) => orders.filter(o => o.companyId === companyId);

  const getOrdersByPlatform = (platformId: string) => orders.filter(o => o.platformId === platformId);

  const getOrderByIds = (orderId: string, subOrderId?: string) => {
    if (subOrderId) {
      return orders.find(o => o.orderId === orderId && o.subOrderId === subOrderId);
    }
    return orders.find(o => 
      o.orderId?.toLowerCase() === orderId.toLowerCase() || 
      o.subOrderId?.toLowerCase() === orderId.toLowerCase()
    );
  };

  const searchOrders = (query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return orders.filter(o =>
      o.orderId?.toLowerCase().includes(q) ||
      o.subOrderId?.toLowerCase().includes(q) ||
      o.productName?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.sku?.toLowerCase().includes(q)
    );
  };

  // Inventory operations
  const addInventoryItem = async (data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const existing = inventory.find(i => i.sku === data.sku);

    if (existing) {
      const updated = { ...existing, quantity: existing.quantity + data.quantity, updatedAt: now };
      await setDoc(doc(inventoryCollection, existing.id), updated);
    } else {
      const newItem: InventoryItem = { ...data, id: generateId(), createdAt: now, updatedAt: now };
      await setDoc(doc(inventoryCollection, newItem.id), newItem);
    }
  };

  const updateInventoryItem = async (id: string, data: Partial<InventoryItem>) => {
    const item = inventory.find(i => i.id === id);
    if (item) {
      const updated = { ...item, ...data, updatedAt: new Date().toISOString() };
      await setDoc(doc(inventoryCollection, id), updated);
    }
  };

  const deleteInventoryItem = async (id: string) => {
    await deleteDoc(doc(inventoryCollection, id));
  };

  const getInventoryBySKU = (sku: string) => inventory.find(i => i.sku === sku);

  // Return operations
  const addReturn = async (data: Omit<Return, 'id' | 'createdAt'>) => {
    // Check if return already exists for this order
    const existingReturn = returns.find(r => 
      r.orderId === data.orderId && r.subOrderId === data.subOrderId
    );

    if (existingReturn) {
      throw new Error('Return already exists for this order');
    }

    const newReturn: Return = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(returnsCollection, newReturn.id), newReturn);

    // Update order in master file to reflect return and calculate GST refund
    const order = getOrderByIds(data.orderId, data.subOrderId);
    if (order) {
      try {
        const gstRefund = (order.cgst || 0) + (order.sgst || 0) + (order.igst || 0);
        await updateOrder(order.id, { 
          status: 'returned',
          gstRefund: gstRefund
        });
      } catch (error: any) {
        // Log error but don't fail the return creation
        console.error('Failed to update order status in master file:', error);
        throw new Error(`Return recorded but failed to update order status: ${error.message}`);
      }
    }
  };

  const updateReturn = async (id: string, data: Partial<Return>) => {
    const returnItem = returns.find(r => r.id === id);
    if (returnItem) {
      const updated = { ...returnItem, ...data };
      await setDoc(doc(returnsCollection, id), updated);
    }
  };

  const isOrderReturned = (orderId: string, subOrderId?: string) => {
    return returns.some(r => 
      r.orderId === orderId && 
      (!subOrderId || r.subOrderId === subOrderId)
    );
  };

  // Dead stock operations
  const addDeadStock = async (data: Omit<DeadStock, 'id' | 'createdAt'>) => {
    const now = new Date().toISOString();
    const existing = deadStock.find(d => d.sku === data.sku);

    if (existing) {
      const updated = { ...existing, quantity: existing.quantity + data.quantity };
      await setDoc(doc(deadStockCollection, existing.id), updated);
    } else {
      const newItem: DeadStock = { ...data, id: generateId(), createdAt: now };
      await setDoc(doc(deadStockCollection, newItem.id), newItem);
    }
  };

  // File operations
  const addUploadedFile = async (data: Omit<UploadedFile, 'id'>) => {
    const newFile: UploadedFile = { ...data, id: generateId() };
    await setDoc(doc(uploadedFilesCollection, newFile.id), newFile);
  };

  const deleteUploadedFile = async (id: string) => {
    await deleteDoc(doc(uploadedFilesCollection, id));
  };

  return (
    <DataContext.Provider value={{
      companies,
      orders,
      inventory,
      returns,
      deadStock,
      uploadedFiles,
      loading,
      addCompany,
      updateCompany,
      deleteCompany,
      getCompanyById,
      addPlatform,
      updatePlatform,
      deletePlatform,
      getPlatformById,
      updateOrder,
      getOrdersByCompany,
      getOrdersByPlatform,
      getOrderByIds,
      searchOrders,
      addInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      getInventoryBySKU,
      addReturn,
      updateReturn,
      isOrderReturned,
      addDeadStock,
      addUploadedFile,
      deleteUploadedFile,
    }}>
      {children}
    </DataContext.Provider>
  );
};
