import { ExpenseItem, IncomeSource, MonthlyProportionalSummary, DistributionResult } from '../types';

export function calculateProportionalSummary(
  p1Name: string,
  p2Name: string,
  incomes: IncomeSource[],
  expenses: ExpenseItem[],
  reservePercentage: number
): MonthlyProportionalSummary {
  // P1 Incomes
  const p1Incomes = incomes.filter(i => i.userId === 'p1');
  const p1FixedIncome = p1Incomes.filter(i => i.type === 'fixed').reduce((acc, curr) => acc + curr.amount, 0);
  const p1ExtraIncome = p1Incomes.filter(i => i.type === 'extra').reduce((acc, curr) => acc + curr.amount, 0);
  const p1GrossIncome = p1FixedIncome + p1ExtraIncome;

  // P2 Incomes
  const p2Incomes = incomes.filter(i => i.userId === 'p2');
  const p2FixedIncome = p2Incomes.filter(i => i.type === 'fixed').reduce((acc, curr) => acc + curr.amount, 0);
  const p2ExtraIncome = p2Incomes.filter(i => i.type === 'extra').reduce((acc, curr) => acc + curr.amount, 0);
  const p2GrossIncome = p2FixedIncome + p2ExtraIncome;

  // Individual Expenses
  const p1IndividualExpenses = expenses
    .filter(e => e.divisionType === 'individual' && e.individualUserId === 'p1')
    .reduce((acc, curr) => acc + (curr.isConfirmed ? curr.actualAmount : (curr.estimatedAmount || 0)), 0);

  const p2IndividualExpenses = expenses
    .filter(e => e.divisionType === 'individual' && e.individualUserId === 'p2')
    .reduce((acc, curr) => acc + (curr.isConfirmed ? curr.actualAmount : (curr.estimatedAmount || 0)), 0);

  // Net Incomes
  const p1NetIncome = Math.max(0, p1GrossIncome - p1IndividualExpenses);
  const p2NetIncome = Math.max(0, p2GrossIncome - p2IndividualExpenses);
  const totalNetIncome = p1NetIncome + p2NetIncome;

  // Proportions (%)
  let p1Proportion = 50;
  let p2Proportion = 50;

  if (totalNetIncome > 0) {
    p1Proportion = (p1NetIncome / totalNetIncome) * 100;
    p2Proportion = (p2NetIncome / totalNetIncome) * 100;
  }

  // Shared Expenses
  const sharedExpensesList = expenses.filter(e => e.divisionType === 'shared');
  const totalSharedExpenses = sharedExpensesList.reduce(
    (acc, curr) => acc + (curr.isConfirmed ? curr.actualAmount : (curr.estimatedAmount || 0)),
    0
  );

  // Automatic Reserve Contributions on Extra Incomes
  const totalExtraIncomes = p1ExtraIncome + p2ExtraIncome;
  const totalReserveContributions = (totalExtraIncomes * reservePercentage) / 100;

  // Community Budget Needed
  const totalCommunityBudgetNeeded = totalSharedExpenses + totalReserveContributions;

  // Quotas
  const p1Quota = (totalCommunityBudgetNeeded * p1Proportion) / 100;
  const p2Quota = (totalCommunityBudgetNeeded * p2Proportion) / 100;

  // Check Trava de Segurança (Unconfirmed estimates)
  const unconfirmedShared = sharedExpensesList.filter(e => e.expenseType === 'estimated' && !e.isConfirmed);
  const unconfirmedCount = unconfirmedShared.length;
  const hasUnconfirmedEstimates = unconfirmedCount > 0;
  const canCloseMonth = !hasUnconfirmedEstimates;

  const monthYear = incomes[0]?.monthYear || expenses[0]?.monthYear || new Date().toISOString().slice(0, 7);

  return {
    monthYear,
    p1Name,
    p2Name,
    p1FixedIncome,
    p1ExtraIncome,
    p1GrossIncome,
    p1IndividualExpenses,
    p1NetIncome,
    p1Proportion,
    p2FixedIncome,
    p2ExtraIncome,
    p2GrossIncome,
    p2IndividualExpenses,
    p2NetIncome,
    p2Proportion,
    totalGrossIncome: p1GrossIncome + p2GrossIncome,
    totalNetIncome,
    totalSharedExpenses,
    totalReserveContributions,
    totalCommunityBudgetNeeded,
    p1Quota,
    p2Quota,
    hasUnconfirmedEstimates,
    unconfirmedCount,
    canCloseMonth,
  };
}

/**
 * Intelligent Bill Distribution Algorithm (Subset Sum Solver)
 * Finds the combination of shared bills that minimizes the difference
 * between Person 1's assigned bills total and Person 1's target quota.
 */
export function optimizeBillDistribution(
  sharedBills: ExpenseItem[],
  p1Quota: number,
  p2Quota: number,
  p1Name: string,
  p2Name: string
): DistributionResult {
  type BillWithEffective = ExpenseItem & { effectiveAmount: number };

  // Only consider bills with confirmed/actual positive amounts
  const validBills: BillWithEffective[] = sharedBills.map(b => ({
    ...b,
    effectiveAmount: b.isConfirmed ? b.actualAmount : (b.estimatedAmount || 0),
  }));

  const totalBillAmount = validBills.reduce((acc, curr) => acc + curr.effectiveAmount, 0);

  if (validBills.length === 0 || totalBillAmount === 0) {
    return {
      p1TargetQuota: p1Quota,
      p2TargetQuota: p2Quota,
      p1AssignedBills: [],
      p2AssignedBills: [],
      p1AssignedTotal: 0,
      p2AssignedTotal: 0,
      p1Difference: -p1Quota,
      p2Difference: -p2Quota,
      pixEqualizationAmount: 0,
      explanation: 'Nenhum boleto cadastrado para distribuição.',
    };
  }

  // Subset Sum Solver via recursion / branch & bound
  let bestP1Subset: BillWithEffective[] = [];
  let minDiff = Infinity;

  function search(index: number, currentSubset: BillWithEffective[], currentSum: number) {
    const diff = Math.abs(currentSum - p1Quota);
    if (diff < minDiff) {
      minDiff = diff;
      bestP1Subset = [...currentSubset];
    }

    if (index >= validBills.length) return;

    // Option 1: Include validBills[index] in P1's subset
    search(index + 1, [...currentSubset, validBills[index]], currentSum + validBills[index].effectiveAmount);

    // Option 2: Exclude validBills[index] from P1's subset (given to P2)
    search(index + 1, currentSubset, currentSum);
  }

  // Run solver
  search(0, [], 0);

  const p1SetIds = new Set(bestP1Subset.map(b => b.id));
  const p2AssignedBills = validBills.filter(b => !p1SetIds.has(b.id));

  const p1AssignedTotal = bestP1Subset.reduce((acc, b) => acc + b.effectiveAmount, 0);
  const p2AssignedTotal = p2AssignedBills.reduce((acc, b) => acc + b.effectiveAmount, 0);

  const p1Diff = p1AssignedTotal - p1Quota;
  const p2Diff = p2AssignedTotal - p2Quota;

  const pixAmount = Math.abs(p1Diff);
  let pixPayer: 'p1' | 'p2' | undefined;
  let pixReceiver: 'p1' | 'p2' | undefined;
  let explanation = '';

  if (Math.abs(p1Diff) < 0.01) {
    explanation = `Divisão exata dos boletos! ${p1Name} e ${p2Name} pagam exatamente sua proporção sem necessidade de Pix.`;
  } else if (p1Diff > 0) {
    // P1 assigned bills sum is greater than P1 quota, so P1 overpaid
    pixPayer = 'p2';
    pixReceiver = 'p1';
    explanation = `${p1Name} pagará R$ ${p1AssignedTotal.toFixed(2)} em boletos (R$ ${p1Diff.toFixed(2)} a mais que sua meta de R$ ${p1Quota.toFixed(2)}). Para equalizar, ${p2Name} faz um Pix de R$ ${pixAmount.toFixed(2)} para ${p1Name}.`;
  } else {
    // P1 assigned bills sum is less than P1 quota
    pixPayer = 'p1';
    pixReceiver = 'p2';
    explanation = `${p2Name} pagará R$ ${p2AssignedTotal.toFixed(2)} em boletos (R$ ${Math.abs(p2Diff).toFixed(2)} a mais que sua meta de R$ ${p2Quota.toFixed(2)}). Para equalizar, ${p1Name} faz um Pix de R$ ${pixAmount.toFixed(2)} para ${p2Name}.`;
  }

  return {
    p1TargetQuota: p1Quota,
    p2TargetQuota: p2Quota,
    p1AssignedBills: bestP1Subset,
    p2AssignedBills,
    p1AssignedTotal,
    p2AssignedTotal,
    p1Difference: p1Diff,
    p2Difference: p2Diff,
    pixEqualizationAmount: pixAmount,
    pixPayer,
    pixReceiver,
    explanation,
  };
}
