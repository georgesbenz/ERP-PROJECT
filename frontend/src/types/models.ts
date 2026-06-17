// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  roles: { role: { id: string; name: string } }[];
  status: string;
  lastLoginAt?: string;
  createdAt: string;
}

// ─── Tax ──────────────────────────────────────────────────────────────────────

export interface TaxCode {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  rate: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  children?: Category[];
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  salePrice: number;
  costPrice: number;
  categoryId?: string;
  category?: Category;
  taxId?: string;
  tax?: TaxCode;
  isService: boolean;
  isActive: boolean;
  minStock?: number;
  createdAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
}

export interface StockLevel {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  product: Product;
  warehouse: Warehouse;
}

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN';

export interface StockMovement {
  id: string;
  tenantId: string;
  productId: string;
  warehouseId: string;
  type: MovementType;
  quantity: number;
  unitCost?: number;
  reference?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  product: Product;
  warehouse: Warehouse;
}

// ─── Sales ────────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  loyaltyPoints?: number;
  creditLimit?: number;
  creditBalance?: number;
  createdAt: string;
}

export interface SaleLine {
  id: string;
  productId: string;
  product?: Product;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  total: number;
}

export interface Sale {
  id: string;
  reference: string;
  customerId?: string;
  customer?: Customer;
  status: string;
  saleDate: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  lines: SaleLine[];
  createdAt: string;
}

// ─── Purchases ────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Purchase {
  id: string;
  reference: string;
  supplierId?: string;
  supplier?: Supplier;
  status: string;
  orderDate: string;
  expectedDate?: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  lines: PurchaseLine[];
  createdAt: string;
}

export interface PurchaseLine {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitCost: number;
  discount: number;
  taxRate: number;
  total: number;
}

// ─── Finance ──────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  number: string;
  customerId?: string;
  customer?: Customer;
  status: string;
  issueDate: string;
  dueDate?: string;
  total: number;
  paidAmount: number;
}

export interface Payment {
  id: string;
  reference: string;
  amount: number;
  method: string;
  status: string;
  paidAt: string;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
  children?: Account[];
}

// ─── CRM ──────────────────────────────────────────────────────────────────────

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';
export type OpportunityStatus = 'OPEN' | 'WON' | 'LOST' | 'ON_HOLD';

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  status: LeadStatus;
  source?: string;
  createdAt: string;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
}

export interface PipelineStage {
  id: string;
  name: string;
  sortOrder: number;
  probability: number;
}

export interface Opportunity {
  id: string;
  title: string;
  customerId?: string;
  customer?: Customer;
  pipelineId?: string;
  pipeline?: Pipeline;
  stageId?: string;
  stage?: PipelineStage;
  status: OpportunityStatus;
  value: number;
  probability: number;
  expectedCloseDate?: string;
  createdAt: string;
}

// ─── Budgeting ────────────────────────────────────────────────────────────────

export interface BudgetPlan {
  id: string;
  name: string;
  fiscalYear: number;
  status: string;
  totalAmount: number;
  startDate: string;
  endDate: string;
  departmentId?: string;
  department?: Department;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardOverview {
  totalCustomers: number;
  totalProducts: number;
  salesThisMonth: number;
  revenueThisMonth: number | string;
  pendingPurchases: number;
  openLeads: number;
  openOpportunities: number;
  unreadNotifications: number;
  lowStockCount: number;
  activeBudgets: number;
}
