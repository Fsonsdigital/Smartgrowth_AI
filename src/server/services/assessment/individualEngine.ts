import type {
  AssessmentCalculationOutput,
  FormulaExplanation,
  IndividualAssessmentInput,
  MetricBand,
} from '../../../shared/types.js';

export const INDIVIDUAL_CALCULATION_VERSION = 'ind-v1.2.0';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseNonNegativeNumber(val: unknown, fieldName: string, flags: string[]): number {
  if (val === undefined || val === null || val === '') {
    flags.push(`MISSING_${fieldName.toUpperCase()}_DEFAULTED_ZERO`);
    return 0;
  }
  const num = Number(val);
  if (!Number.isFinite(num)) {
    throw new Error(`Invalid numeric value for ${fieldName}.`);
  }
  if (num < 0) {
    throw new Error(`${fieldName} cannot be negative.`);
  }
  return num;
}

export function validateIndividualInput(raw: Record<string, unknown>): {
  input: IndividualAssessmentInput;
  flags: string[];
} {
  const flags: string[] = [];
  const monthlyIncome = parseNonNegativeNumber(raw.monthlyIncome, 'monthlyIncome', flags);
  const monthlyExpenses = parseNonNegativeNumber(raw.monthlyExpenses, 'monthlyExpenses', flags);
  const monthlySavings = parseNonNegativeNumber(raw.monthlySavings, 'monthlySavings', flags);
  const totalLiquidSavings = parseNonNegativeNumber(raw.totalLiquidSavings, 'totalLiquidSavings', flags);
  const monthlyDebtRepayment = parseNonNegativeNumber(raw.monthlyDebtRepayment, 'monthlyDebtRepayment', flags);
  const totalDebt = parseNonNegativeNumber(raw.totalDebt, 'totalDebt', flags);
  const dependentsCount = Math.floor(parseNonNegativeNumber(raw.dependentsCount, 'dependentsCount', flags));

  const stabilityRaw = String(raw.incomeStability ?? 'steady').toLowerCase();
  const incomeStability: IndividualAssessmentInput['incomeStability'] =
    stabilityRaw === 'variable' || stabilityRaw === 'seasonal' ? stabilityRaw : 'steady';

  if (monthlyIncome === 0) {
    flags.push('ZERO_OR_MISSING_INCOME');
  }
  if (monthlyExpenses === 0) {
    flags.push('ZERO_EXPENSES_REPORTED');
  }

  return {
    input: {
      monthlyIncome,
      monthlyExpenses,
      monthlySavings,
      totalLiquidSavings,
      monthlyDebtRepayment,
      totalDebt,
      dependentsCount,
      incomeStability,
    },
    flags,
  };
}

export function calculateIndividualAssessment(
  raw: Record<string, unknown>,
  currency = 'NGN'
): AssessmentCalculationOutput {
  const { input, flags } = validateIndividualInput(raw);
  const {
    monthlyIncome,
    monthlyExpenses,
    monthlySavings,
    totalLiquidSavings,
    monthlyDebtRepayment,
    totalDebt,
  } = input;

  const hasIncome = monthlyIncome > 0;
  const savingsRate = hasIncome ? round2((monthlySavings / monthlyIncome) * 100) : null;
  const expenseToIncomeRatio = hasIncome ? round2((monthlyExpenses / monthlyIncome) * 100) : null;
  const debtRepaymentToIncomeRatio = hasIncome
    ? round2((monthlyDebtRepayment / monthlyIncome) * 100)
    : null;
  const monthlySurplusOrDeficit = round2(monthlyIncome - monthlyExpenses - monthlyDebtRepayment);
  const emergencyBufferMonths =
    monthlyExpenses > 0 ? round2(totalLiquidSavings / monthlyExpenses) : null;

  if (monthlySurplusOrDeficit < 0) {
    flags.push('MONTHLY_CASH_DEFICIT');
  }
  if (debtRepaymentToIncomeRatio !== null && debtRepaymentToIncomeRatio > 36) {
    flags.push('ELEVATED_DEBT_REPAYMENT_BURDEN');
  }
  if (monthlyExpenses + monthlySavings + monthlyDebtRepayment > monthlyIncome && hasIncome) {
    flags.push('ALLOCATIONS_EXCEED_REPORTED_INCOME');
  }

  const savingsBand: MetricBand =
    savingsRate === null
      ? 'Insufficient Data'
      : savingsRate >= 20
        ? 'Strong'
        : savingsRate >= 10
          ? 'Stable'
          : savingsRate > 0
            ? 'Watch'
            : 'Critical';

  const expenseBand: MetricBand =
    expenseToIncomeRatio === null
      ? 'Insufficient Data'
      : expenseToIncomeRatio <= 60
        ? 'Strong'
        : expenseToIncomeRatio <= 75
          ? 'Stable'
          : expenseToIncomeRatio <= 90
            ? 'Watch'
            : 'Critical';

  const debtBand: MetricBand =
    debtRepaymentToIncomeRatio === null
      ? 'Insufficient Data'
      : debtRepaymentToIncomeRatio <= 15
        ? 'Strong'
        : debtRepaymentToIncomeRatio <= 30
          ? 'Stable'
          : debtRepaymentToIncomeRatio <= 40
            ? 'Watch'
            : 'Critical';

  const surplusBand: MetricBand =
    !hasIncome && monthlySurplusOrDeficit === 0
      ? 'Insufficient Data'
      : monthlySurplusOrDeficit > 0
        ? 'Strong'
        : monthlySurplusOrDeficit === 0
          ? 'Watch'
          : 'Critical';

  const bufferBand: MetricBand =
    emergencyBufferMonths === null
      ? 'Insufficient Data'
      : emergencyBufferMonths >= 3
        ? 'Strong'
        : emergencyBufferMonths >= 1
          ? 'Stable'
          : emergencyBufferMonths > 0
            ? 'Watch'
            : 'Critical';

  const formulas: FormulaExplanation[] = [
    {
      key: 'savingsRate',
      label: 'Savings Rate',
      formula: '(Monthly Savings / Monthly Income) × 100',
      inputsUsed: { monthlySavings, monthlyIncome },
      value: savingsRate,
      formattedValue: savingsRate !== null ? `${savingsRate.toFixed(1)}%` : 'N/A (zero income)',
      unit: '%',
      band: savingsBand,
      explanation:
        'Measures the proportion of gross monthly income directed toward savings or reserves. A 20%+ rate indicates strong savings capacity.',
    },
    {
      key: 'expenseToIncomeRatio',
      label: 'Expense-to-Income Ratio',
      formula: '(Monthly Expenses / Monthly Income) × 100',
      inputsUsed: { monthlyExpenses, monthlyIncome },
      value: expenseToIncomeRatio,
      formattedValue:
        expenseToIncomeRatio !== null ? `${expenseToIncomeRatio.toFixed(1)}%` : 'N/A (zero income)',
      unit: '%',
      band: expenseBand,
      explanation:
        'Shows how much monthly income is absorbed by recurring living expenses. Lower ratios leave room for savings and debt reduction.',
    },
    {
      key: 'debtRepaymentToIncomeRatio',
      label: 'Debt Repayment-to-Income Ratio',
      formula: '(Monthly Debt Repayment / Monthly Income) × 100',
      inputsUsed: { monthlyDebtRepayment, monthlyIncome, totalDebt },
      value: debtRepaymentToIncomeRatio,
      formattedValue:
        debtRepaymentToIncomeRatio !== null
          ? `${debtRepaymentToIncomeRatio.toFixed(1)}%`
          : 'N/A (zero income)',
      unit: '%',
      band: debtBand,
      explanation:
        'Tracks monthly debt service pressure against monthly income. Ratios above 30–36% signal tight repayment flexibility.',
    },
    {
      key: 'monthlySurplusOrDeficit',
      label: 'Monthly Financial Surplus / Deficit',
      formula: 'Monthly Income − Monthly Expenses − Monthly Debt Repayment',
      inputsUsed: { monthlyIncome, monthlyExpenses, monthlyDebtRepayment },
      value: monthlySurplusOrDeficit,
      formattedValue: `${currency} ${monthlySurplusOrDeficit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      unit: 'currency',
      band: surplusBand,
      explanation:
        'Net unallocated monthly cashflow remaining after living expenses and scheduled debt repayments.',
    },
    {
      key: 'emergencyBufferMonths',
      label: 'Emergency Cash Buffer',
      formula: 'Total Liquid Savings / Monthly Expenses',
      inputsUsed: { totalLiquidSavings, monthlyExpenses },
      value: emergencyBufferMonths,
      formattedValue:
        emergencyBufferMonths !== null ? `${emergencyBufferMonths.toFixed(1)} mo` : 'N/A',
      unit: 'months',
      band: bufferBand,
      explanation:
        'Estimates how many months of essential monthly expenses your current liquid savings can cover without new income.',
    },
  ];

  // Transparent threshold-based readiness tier without an unvalidated composite numerical score
  let readinessTier: AssessmentCalculationOutput['readinessTier'] = 'Developing';
  if (!hasIncome) {
    readinessTier = 'Needs Data';
  } else if (
    monthlySurplusOrDeficit > 0 &&
    (savingsRate ?? 0) >= 15 &&
    (debtRepaymentToIncomeRatio ?? 0) <= 25 &&
    (emergencyBufferMonths ?? 0) >= 2
  ) {
    readinessTier = 'Resilient';
  } else if (
    monthlySurplusOrDeficit < 0 ||
    (debtRepaymentToIncomeRatio ?? 0) > 40 ||
    (expenseToIncomeRatio ?? 0) > 90
  ) {
    readinessTier = 'Vulnerable';
  }

  const summaryStatement = !hasIncome
    ? 'Monthly income is currently zero or unrecorded, so income-based ratios cannot be computed reliably.'
    : `Calculated across 5 deterministic formulas (${INDIVIDUAL_CALCULATION_VERSION}): savings rate is ${savingsRate?.toFixed(1)}%, expense ratio is ${expenseToIncomeRatio?.toFixed(1)}%, debt repayment ratio is ${debtRepaymentToIncomeRatio?.toFixed(1)}%, and monthly surplus/deficit is ${currency} ${monthlySurplusOrDeficit.toLocaleString('en-US')}.`;

  return {
    audience: 'individual',
    calculationVersion: INDIVIDUAL_CALCULATION_VERSION,
    compositeScore: null,
    compositeScorePolicy: 'DISABLED_UNVALIDATED_COMPOSITE',
    readinessTier,
    summaryStatement,
    metrics: {
      monthlyIncome,
      monthlyExpenses,
      monthlySavings,
      totalLiquidSavings,
      monthlyDebtRepayment,
      totalDebt,
      savingsRate,
      expenseToIncomeRatio,
      debtRepaymentToIncomeRatio,
      monthlySurplusOrDeficit,
      emergencyBufferMonths,
    },
    formulas,
    dataQualityFlags: Array.from(new Set(flags)),
  };
}
