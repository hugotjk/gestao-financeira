import ExcelJS from 'exceljs';
import { ExpenseItem, MonthlyProportionalSummary, ReserveContribution } from '../types';

export async function generateExcelReport(
  monthYear: string,
  summary: MonthlyProportionalSummary,
  expenses: ExpenseItem[],
  reserveContributions: ReserveContribution[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Gestão Financeira Familiar Proporcional';
  workbook.created = new Date();

  // Helper for styling headers
  const applyHeaderStyles = (sheet: ExcelJS.Worksheet) => {
    const headerRow = sheet.getRow(1);
    headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E293B' }, // Dark slate header
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;

    // Auto-fit column width
    sheet.columns.forEach((column) => {
      let maxLen = 12;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? String(cell.value) : '';
        if (cellValue.length > maxLen) {
          maxLen = cellValue.length;
        }
      });
      column.width = Math.min(Math.max(maxLen + 4, 12), 40);
    });
  };

  // -------------------------------------------------------------
  // ABA 1: Lancamentos_Detalhados
  // -------------------------------------------------------------
  const sheet1 = workbook.addWorksheet('Lancamentos_Detalhados');
  sheet1.columns = [
    { header: 'ID', key: 'id' },
    { header: 'Mes_Ano', key: 'monthYear' },
    { header: 'Data_Vencimento', key: 'dueDate' },
    { header: 'Nome_Despesa', key: 'description' },
    { header: 'Categoria', key: 'category' },
    { header: 'Tipo_Divisao', key: 'divisionType' },
    { header: 'Responsavel_Indiv', key: 'individualUser' },
    { header: 'Valor_Previsto', key: 'estimatedAmount' },
    { header: 'Valor_Real', key: 'actualAmount' },
    { header: 'Status_Pagamento', key: 'paymentStatus' },
    { header: 'Pago_Por', key: 'paidBy' },
  ];

  expenses.forEach((item) => {
    const row = sheet1.addRow({
      id: item.id,
      monthYear: item.monthYear,
      dueDate: item.dueDate,
      description: item.description,
      category: item.category,
      divisionType: item.divisionType === 'shared' ? 'Compartilhado' : 'Individual',
      individualUser: item.divisionType === 'individual' ? (item.individualUserName || item.individualUserId) : 'Casal (Ambos)',
      estimatedAmount: item.expenseType === 'estimated' ? item.estimatedAmount || 0 : item.actualAmount,
      actualAmount: item.actualAmount,
      paymentStatus: item.paymentStatus === 'paid' ? 'Pago' : 'Pendente',
      paidBy: item.paidBy === 'p1' ? summary.p1Name : item.paidBy === 'p2' ? summary.p2Name : 'Nenhum',
    });

    // Formatting currency cells
    row.getCell('estimatedAmount').numFmt = 'R$ #,##0.00';
    row.getCell('actualAmount').numFmt = 'R$ #,##0.00';
  });

  applyHeaderStyles(sheet1);

  // -------------------------------------------------------------
  // ABA 2: Resumo_Proporcional_Mensal
  // -------------------------------------------------------------
  const sheet2 = workbook.addWorksheet('Resumo_Proporcional_Mensal');
  sheet2.columns = [
    { header: 'Mes_Ano', key: 'monthYear' },
    { header: `Renda_Total_${summary.p1Name.replace(/\s+/g, '_')}`, key: 'p1Gross' },
    { header: `Renda_Total_${summary.p2Name.replace(/\s+/g, '_')}`, key: 'p2Gross' },
    { header: `GastoInd_${summary.p1Name.replace(/\s+/g, '_')}`, key: 'p1Ind' },
    { header: `GastoInd_${summary.p2Name.replace(/\s+/g, '_')}`, key: 'p2Ind' },
    { header: `SobraLiquida_${summary.p1Name.replace(/\s+/g, '_')}`, key: 'p1Net' },
    { header: `SobraLiquida_${summary.p2Name.replace(/\s+/g, '_')}`, key: 'p2Net' },
    { header: `Prop_%_${summary.p1Name.replace(/\s+/g, '_')}`, key: 'p1Prop' },
    { header: `Prop_%_${summary.p2Name.replace(/\s+/g, '_')}`, key: 'p2Prop' },
    { header: 'Total_Contas_Comuns', key: 'totalShared' },
    { header: `Meta_Pago_${summary.p1Name.replace(/\s+/g, '_')}`, key: 'p1Quota' },
    { header: `Meta_Pago_${summary.p2Name.replace(/\s+/g, '_')}`, key: 'p2Quota' },
  ];

  const summaryRow = sheet2.addRow({
    monthYear: summary.monthYear,
    p1Gross: summary.p1GrossIncome,
    p2Gross: summary.p2GrossIncome,
    p1Ind: summary.p1IndividualExpenses,
    p2Ind: summary.p2IndividualExpenses,
    p1Net: summary.p1NetIncome,
    p2Net: summary.p2NetIncome,
    p1Prop: summary.p1Proportion / 100,
    p2Prop: summary.p2Proportion / 100,
    totalShared: summary.totalCommunityBudgetNeeded,
    p1Quota: summary.p1Quota,
    p2Quota: summary.p2Quota,
  });

  // Currency & Percentage Formatting
  ['p1Gross', 'p2Gross', 'p1Ind', 'p2Ind', 'p1Net', 'p2Net', 'totalShared', 'p1Quota', 'p2Quota'].forEach(col => {
    summaryRow.getCell(col).numFmt = 'R$ #,##0.00';
  });
  summaryRow.getCell('p1Prop').numFmt = '0.00%';
  summaryRow.getCell('p2Prop').numFmt = '0.00%';

  applyHeaderStyles(sheet2);

  // -------------------------------------------------------------
  // ABA 3: Historico_Reserva
  // -------------------------------------------------------------
  const sheet3 = workbook.addWorksheet('Historico_Reserva');
  sheet3.columns = [
    { header: 'ID_Aporte', key: 'id' },
    { header: 'Mes_Ano', key: 'monthYear' },
    { header: 'Origem_Extra', key: 'origin' },
    { header: 'Valor_Aportado', key: 'reserveAmount' },
    { header: 'Data_Registro', key: 'createdAt' },
  ];

  reserveContributions.forEach((res) => {
    const row = sheet3.addRow({
      id: res.id,
      monthYear: res.monthYear,
      origin: `${res.userName} - ${res.extraIncomeDescription} (Extra R$ ${res.extraIncomeAmount.toFixed(2)} @ ${res.percentageApplied}%)`,
      reserveAmount: res.reserveAmount,
      createdAt: res.createdAt ? res.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    });

    row.getCell('reserveAmount').numFmt = 'R$ #,##0.00';
  });

  applyHeaderStyles(sheet3);

  // Generate binary buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Gestao_Proporcional_${monthYear.replace('-', '_')}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
