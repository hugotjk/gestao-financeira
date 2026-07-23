export type DivisionType = 'shared' | 'individual';

export interface UserProfile {
  id: string; // 'p1' or 'p2' or uuid
  name: string;
  avatarColor: string;
}

export interface IncomeSource {
  id: string;
  monthYear: string; // YYYY-MM
  userId: 'p1' | 'p2';
  userName: string; // Stored to track name at creation/cascaded
  description: string;
  amount: number;
  type: 'fixed' | 'extra'; // Fixed or Extra/Freela
  reservePercentage?: number; // % configured for reserve (e.g. 0, 10, 20)
  createdAt: string;
}

export interface ExpenseItem {
  id: string;
  monthYear: string; // YYYY-MM
  description: string;
  category: string;
  divisionType: DivisionType; // 'shared' or 'individual'
  individualUserId?: 'p1' | 'p2'; // If individual, who owns it
  individualUserName?: string;
  expenseType: 'fixed' | 'estimated'; // 'Exata' or 'Prevista'
  estimatedAmount?: number; // Valor previsto
  actualAmount: number; // Valor real (0 if awaiting)
  isConfirmed: boolean; // Trava: true when actual amount is confirmed
  dueDate: string; // YYYY-MM-DD
  paymentStatus: 'pending' | 'paid';
  paidBy?: 'p1' | 'p2' | 'none'; // Who actually paid this bill in their app
  assignedTo?: 'p1' | 'p2' | 'none'; // Who was assigned to pay by distribution algorithm
  barcode?: string; // Linha digitável ou código de barras
  pixCode?: string; // Chave Pix Copia e Cola
  notes?: string;
  cardItemsBreakdown?: {
    id: string;
    date?: string;
    description: string;
    cardDigits?: string;
    amount: number;
    assignedTo: 'p1' | 'p2' | 'shared';
  }[];
  updatedAt: string;
}

export interface CardStatementItem {
  id: string;
  date?: string;
  description: string;
  cardDigits?: string;
  amount: number;
  assignedTo: 'p1' | 'p2' | 'shared';
}

export interface CardStatementData {
  bankName: string;
  statementPeriod?: string;
  totalInvoiceAmount?: number;
  items: CardStatementItem[];
}

export interface ReserveContribution {
  id: string;
  monthYear: string;
  incomeSourceId: string;
  userId: 'p1' | 'p2';
  userName: string;
  extraIncomeDescription: string;
  extraIncomeAmount: number;
  percentageApplied: number; // e.g. 20
  reserveAmount: number; // calculated contribution
  createdAt: string;
}

export interface AppSettings {
  p1Name: string;
  p2Name: string;
  reservePercentage: number; // default 20%
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export interface MonthlyProportionalSummary {
  monthYear: string;
  p1Name: string;
  p2Name: string;
  
  // P1 Financials
  p1FixedIncome: number;
  p1ExtraIncome: number;
  p1GrossIncome: number;
  p1IndividualExpenses: number;
  p1NetIncome: number;
  p1Proportion: number; // Percentage (0 - 100)
  
  // P2 Financials
  p2FixedIncome: number;
  p2ExtraIncome: number;
  p2GrossIncome: number;
  p2IndividualExpenses: number;
  p2NetIncome: number;
  p2Proportion: number; // Percentage (0 - 100)

  // Couple Totals
  totalGrossIncome: number;
  totalNetIncome: number;
  totalSharedExpenses: number;
  totalReserveContributions: number;
  totalCommunityBudgetNeeded: number; // shared expenses + reserve contributions

  // Quotas (Metas)
  p1Quota: number;
  p2Quota: number;

  // Trava de Segurança Status
  hasUnconfirmedEstimates: boolean;
  unconfirmedCount: number;
  canCloseMonth: boolean;
}

export interface DistributionResult {
  p1TargetQuota: number;
  p2TargetQuota: number;
  p1AssignedBills: ExpenseItem[];
  p2AssignedBills: ExpenseItem[];
  p1AssignedTotal: number;
  p2AssignedTotal: number;
  p1Difference: number; // p1AssignedTotal - p1TargetQuota
  p2Difference: number; // p2AssignedTotal - p2TargetQuota
  pixEqualizationAmount: number; // Minimum transfer needed if any
  pixPayer?: 'p1' | 'p2';
  pixReceiver?: 'p1' | 'p2';
  explanation: string;
}

export interface ParsedBillData {
  barcode?: string;
  pixCode?: string;
  amount?: number;
  dueDate?: string;
  description?: string;
  rawText?: string;
}
