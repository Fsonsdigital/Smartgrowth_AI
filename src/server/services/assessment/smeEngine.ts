import type {
  AssessmentCalculationOutput,
  FormulaExplanation,
  MetricBand,
  SmeAssessmentInput,
} from '../../../shared/types.js';

export const SME_CALCULATION_VERSION = 'sme-v1.2.0';

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

export function validateSmeInput(raw: Record<string, unknown>): {
  input: SmeAssessmentInput;
  flags: string[];
} {
  const flags: string[] = [];
  const monthlyRevenue = parseNonNegativeNumber(raw.monthlyRevenue, 'monthlyRevenue', flags);
  const monthlyOperatingExpenses = parseNonNegativeNumber(
    raw.monthlyOperatingExpenses,
    'monthlyOperatingExpenses',
    flags
  );
  const monthlyDebtService = parseNonNegativeNumber(
    raw.monthlyDebtService,
    'monthlyDebtService',
    flags
  );
  const cashOnHand = parseNonNegativeNumber(raw.cashOnHand, 'cashOnHand', flags);
  const accountsReceivable = parseNonNegativeNumber(
    raw.accountsReceivable,
    'accountsReceivable',
    flags
  );
  const accountsPayable = parseNonNegativeNumber(raw.accountsPayable, 'accountsPayable', flags);

  const methodRaw = String(raw.recordKeepingMethod ?? 'spreadsheet').toLowerCase();
  const recordKeepingMethod: SmeAssessmentInput['recordKeepingMethod'] =
    methodRaw === 'digital' || methodRaw === 'paper' || methodRaw === 'none'
      ? methodRaw
      : 'spreadsheet';

  if (monthlyRevenue === 0) {
    flags.push('ZERO_OR_MISSING_REVENUE');
  }
  if (monthlyOperatingExpenses === 0) {
    flags.push('ZERO_OPERATING_EXPENSES_REPORTED');
  }
  if (recordKeepingMethod === 'none' || recordKeepingMethod === 'paper') {
    flags.push('INFORMAL_RECORD_KEEPING');
  }

  return {
    input: {
      monthlyRevenue,
      monthlyOperatingExpenses,
      monthlyDebtService,
      cashOnHand,
      accountsReceivable,
      accountsPayable,
      recordKeepingMethod,
    },
    flags,
  };
}

export function calculateSmeAssessment(
  raw: Record<string, unknown>,
  currency = 'NGN'
): AssessmentCalculationOutput {
  const { input, flags } = validateSmeInput(raw);
  const {
    monthlyRevenue,
    monthlyOperatingExpenses,
    monthlyDebtService,
    cashOnHand,
    accountsReceivable,
    accountsPayable,
  } = input;

  const hasRevenue = monthlyRevenue > 0;
  const operatingCashMovement = round2(monthlyRevenue - monthlyOperatingExpenses);
  const netCashMovementAfterDebt = round2(operatingCashMovement - monthlyDebtService);
  const operatingExpenseRatio = hasRevenue
    ? round2((monthlyOperatingExpenses / monthlyRevenue) * 100)
    : null;
  const debtRepaymentBurden = hasRevenue
    ? round2((monthlyDebtService / monthlyRevenue) * 100)
    : null;
  const cashRunwayMonths =
    monthlyOperatingExpenses > 0 ? round2(cashOnHand / monthlyOperatingExpenses) : null;
  const netWorkingCashPosition = round2(cashOnHand + accountsReceivable - accountsPayable);

  if (operatingCashMovement < 0) {
    flags.push('NEGATIVE_OPERATING_CASH_MOVEMENT');
  }
  if (netCashMovementAfterDebt < 0) {
    flags.push('NEGATIVE_NET_CASH_AFTER_DEBT');
  }
  if (netWorkingCashPosition < 0) {
    flags.push('PAYABLES_EXCEED_CASH_AND_RECEIVABLES');
  }
  if (cashRunwayMonths !== null && cashRunwayMonths < 1) {
    flags.push('LOW_CASH_RUNWAY_UNDER_1_MONTH');
  }

  const cashMovementBand: MetricBand =
    !hasRevenue && operatingCashMovement === 0
      ? 'Insufficient Data'
      : netCashMovementAfterDebt > 0
        ? 'Strong'
        : operatingCashMovement >= 0
          ? 'Watch'
          : 'Critical';

  const opexBand: MetricBand =
    operatingExpenseRatio === null
      ? 'Insufficient Data'
      : operatingExpenseRatio <= 65
        ? 'Strong'
        : operatingExpenseRatio <= 80
          ? 'Stable'
          : operatingExpenseRatio <= 95
            ? 'Watch'
            : 'Critical';

  const debtBurdenBand: MetricBand =
    debtRepaymentBurden === null
      ? 'Insufficient Data'
      : debtRepaymentBurden <= 12
        ? 'Strong'
        : debtRepaymentBurden <= 25
          ? 'Stable'
          : debtRepaymentBurden <= 35
            ? 'Watch'
            : 'Critical';

  const cashPositionBand: MetricBand =
    cashRunwayMonths === null
      ? netWorkingCashPosition >= 0
        ? 'Stable'
        : 'Watch'
      : cashRunwayMonths >= 3 && netWorkingCashPosition >= 0
        ? 'Strong'
        : cashRunwayMonths >= 1.5 && netWorkingCashPosition >= 0
          ? 'Stable'
          : cashRunwayMonths >= 0.5
            ? 'Watch'
            : 'Critical';

  const formulas: FormulaExplanation[] = [
    {
      key: 'operatingCashMovement',
      label: 'Operating Cash Movement (Monthly)',
      formula: 'Monthly Revenue − Monthly Operating Expenses',
      inputsUsed: { monthlyRevenue, monthlyOperatingExpenses, monthlyDebtService },
      value: operatingCashMovement,
      formattedValue: `${currency} ${operatingCashMovement.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      unit: 'currency',
      band: cashMovementBand,
      explanation:
        'Measures monthly cash generated by core business operations before financing obligations. Net cash after debt service is also tracked.',
    },
    {
      key: 'operatingExpenseRatio',
      label: 'Operating Expense Ratio',
      formula: '(Monthly Operating Expenses / Monthly Revenue) × 100',
      inputsUsed: { monthlyOperatingExpenses, monthlyRevenue },
      value: operatingExpenseRatio,
      formattedValue:
        operatingExpenseRatio !== null ? `${operatingExpenseRatio.toFixed(1)}%` : 'N/A (zero revenue)',
      unit: '%',
      band: opexBand,
      explanation:
        'Indicates the share of monthly revenue consumed by direct operating costs (rent, inventory, payroll, utilities).',
    },
    {
      key: 'debtRepaymentBurden',
      label: 'Debt Repayment Burden',
      formula: '(Monthly Debt Service / Monthly Revenue) × 100',
      inputsUsed: { monthlyDebtService, monthlyRevenue },
      value: debtRepaymentBurden,
      formattedValue:
        debtRepaymentBurden !== null ? `${debtRepaymentBurden.toFixed(1)}%` : 'N/A (zero revenue)',
      unit: '%',
      band: debtBurdenBand,
      explanation:
        'Proportion of gross monthly business revenue committed to scheduled debt repayments.',
    },
    {
      key: 'cashRunwayMonths',
      label: 'Cash Position Runway',
      formula: 'Cash on Hand / Monthly Operating Expenses',
      inputsUsed: { cashOnHand, monthlyOperatingExpenses },
      value: cashRunwayMonths,
      formattedValue:
        cashRunwayMonths !== null ? `${cashRunwayMonths.toFixed(1)} mo` : 'N/A (zero expenses)',
      unit: 'months',
      band: cashPositionBand,
      explanation:
        'Number of months the business can cover operating expenses strictly from liquid cash reserves if revenue pauses.',
    },
    {
      key: 'netWorkingCashPosition',
      label: 'Net Short-Term Cash Position',
      formula: 'Cash on Hand + Accounts Receivable − Accounts Payable',
      inputsUsed: { cashOnHand, accountsReceivable, accountsPayable },
      value: netWorkingCashPosition,
      formattedValue: `${currency} ${netWorkingCashPosition.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      unit: 'currency',
      band: netWorkingCashPosition >= 0 ? 'Stable' : 'Critical',
      explanation:
        'Shows whether liquid cash plus expected customer receivables cover near-term supplier payables.',
    },
  ];

  let readinessTier: AssessmentCalculationOutput['readinessTier'] = 'Developing';
  if (!hasRevenue) {
    readinessTier = 'Needs Data';
  } else if (
    netCashMovementAfterDebt > 0 &&
    (operatingExpenseRatio ?? 100) <= 75 &&
    (debtRepaymentBurden ?? 100) <= 20 &&
    (cashRunwayMonths ?? 0) >= 2 &&
    netWorkingCashPosition >= 0
  ) {
    readinessTier = 'Resilient';
  } else if (
    operatingCashMovement < 0 ||
    netWorkingCashPosition < 0 ||
    (debtRepaymentBurden ?? 0) > 35
  ) {
    readinessTier = 'Vulnerable';
  }

  const summaryStatement = !hasRevenue
    ? 'Monthly business revenue is zero or unrecorded; revenue-based ratios cannot be calculated reliably.'
    : `Calculated across 5 SME formulas (${SME_CALCULATION_VERSION}): operating cash movement is ${currency} ${operatingCashMovement.toLocaleString('en-US')}, operating expense ratio is ${operatingExpenseRatio?.toFixed(1)}%, debt burden is ${debtRepaymentBurden?.toFixed(1)}%, and cash runway is ${cashRunwayMonths !== null ? `${cashRunwayMonths.toFixed(1)} months` : 'N/A'}.`;

  return {
    audience: 'sme',
    calculationVersion: SME_CALCULATION_VERSION,
    compositeScore: null,
    compositeScorePolicy: 'DISABLED_UNVALIDATED_COMPOSITE',
    readinessTier,
    summaryStatement,
    metrics: {
      monthlyRevenue,
      monthlyOperatingExpenses,
      monthlyDebtService,
      cashOnHand,
      accountsReceivable,
      accountsPayable,
      operatingCashMovement,
      netCashMovementAfterDebt,
      operatingExpenseRatio,
      debtRepaymentBurden,
      cashRunwayMonths,
      netWorkingCashPosition,
    },
    formulas,
    dataQualityFlags: Array.from(new Set(flags)),
  };
}
