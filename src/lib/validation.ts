import { z } from 'zod';

/**
 * Validation schemas for form inputs
 * Critical for data integrity in tax/business analysis
 */

// Company validation
export const companySchema = z.object({
  name: z.string()
    .min(1, 'Company name is required')
    .max(100, 'Company name must be less than 100 characters')
    .trim(),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
});

// Platform validation
export const platformSchema = z.object({
  name: z.string()
    .min(1, 'Platform name is required')
    .max(100, 'Platform name must be less than 100 characters')
    .trim(),
  salesHeaders: z.record(z.string()).optional(),
  paymentHeaders: z.record(z.string()).optional(),
  gstHeaders: z.record(z.string()).optional(),
  refundHeaders: z.record(z.string()).optional(),
});

// Return validation
export const returnSchema = z.object({
  orderId: z.string()
    .min(1, 'Order ID is required')
    .trim(),
  subOrderId: z.string()
    .optional()
    .or(z.literal('')),
  platformId: z.string()
    .min(1, 'Platform is required'),
  companyId: z.string()
    .min(1, 'Company is required'),
  productName: z.string()
    .min(1, 'Product name is required')
    .trim(),
  sku: z.string()
    .min(1, 'SKU is required')
    .trim(),
  returnDate: z.string()
    .min(1, 'Return date is required'),
  condition: z.enum(['good', 'bad'], {
    errorMap: () => ({ message: 'Please select return condition' }),
  }),
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
});

// Inventory validation
export const inventorySchema = z.object({
  sku: z.string()
    .min(1, 'SKU is required')
    .max(100, 'SKU must be less than 100 characters')
    .trim(),
  productName: z.string()
    .min(1, 'Product name is required')
    .max(200, 'Product name must be less than 200 characters')
    .trim(),
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(0, 'Quantity cannot be negative'),
  costPrice: z.number()
    .min(0, 'Cost price cannot be negative')
    .or(z.literal(0)),
  sellingPrice: z.number()
    .min(0, 'Selling price cannot be negative')
    .or(z.literal(0)),
  hsn: z.string()
    .max(50, 'HSN code must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  category: z.string()
    .max(100, 'Category must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
});

// File upload validation
export const fileUploadSchema = z.object({
  file: z.instanceof(File, { message: 'Please select a file' })
    .refine((file) => {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv', // .csv
      ];
      return validTypes.includes(file.type) || 
             file.name.endsWith('.xlsx') || 
             file.name.endsWith('.xls') || 
             file.name.endsWith('.csv');
    }, 'File must be Excel (.xlsx, .xls) or CSV (.csv) format')
    .refine((file) => file.size <= 50 * 1024 * 1024, 'File size must be less than 50MB'),
  companyId: z.string().min(1, 'Please select a company'),
  platformId: z.string().min(1, 'Please select a platform'),
  uploadType: z.enum(['sales', 'payment', 'gst', 'refund'], {
    errorMap: () => ({ message: 'Please select file type' }),
  }),
});

// Email validation
export const emailSchema = z.string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .trim();

// Password validation
export const passwordSchema = z.string()
  .min(6, 'Password must be at least 6 characters')
  .max(100, 'Password must be less than 100 characters');

/**
 * Helper function to validate and get safe error message
 */
export function getValidationError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.errors.map(e => e.message).join(', ');
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Validation failed. Please check your input.';
}

/**
 * Sanitize string input to prevent injection
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Validate order ID format
 */
export function isValidOrderId(orderId: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(orderId) && orderId.length > 0 && orderId.length <= 100;
}

/**
 * Validate SKU format
 */
export function isValidSKU(sku: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(sku) && sku.length > 0 && sku.length <= 100;
}

