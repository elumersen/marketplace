import { TransactionType } from '@/types/api.types';

// Posting side refers to the side applied to the REGISTER account (the one whose register you are in / left column in the chart)
// The counter account takes the opposite side.
export type PostingRule = 'debit' | 'credit' | 'both' | 'none';

// Keys match backend AccountSubType enum string values (as sent to the frontend)
// Example: Cash_Cash_Equivalents, Accounts_Receivable, Accounts_Payable, Credit_Card, etc.
// NOTE: Where business rules are still being finalized, default to 'both'.
const RULES: Record<string, Partial<Record<TransactionType, PostingRule>>> = {
  // Current Assets
  Cash_Cash_Equivalents: {
    [TransactionType.EXPENSE]: 'credit', // Register must be credited for Expense
    [TransactionType.CHECK]: 'credit',
    [TransactionType.DEPOSIT]: 'debit', // Register must be debited for Deposit
    [TransactionType.REFUND]: 'credit',
    [TransactionType.TRANSFER]: 'both',
    [TransactionType.CREDIT_CARD_PAYMENT]: 'credit',
    [TransactionType.JOURNAL_ENTRY]: 'both',
    // [TransactionType.INVOICE]: 'none',
    // [TransactionType.RECEIVE_PAYMENT]: 'none',
    // [TransactionType.BILL]: 'none',
    // [TransactionType.BILL_PAYMENT]: 'none',
  },
  Accounts_Receivable: {},
  Other_Current_Assets: {
    [TransactionType.DEPOSIT]: 'debit',
    [TransactionType.REFUND]: 'credit',
    [TransactionType.JOURNAL_ENTRY]: 'both',
    [TransactionType.TRANSFER]: 'both',
  },
  // Fixed Assets
  Property_Plant_Equipment: {
    [TransactionType.JOURNAL_ENTRY]: 'both',
    [TransactionType.TRANSFER]: 'both',
  },
  Accumulated_Depreciation: {
    [TransactionType.JOURNAL_ENTRY]: 'both',
    [TransactionType.TRANSFER]: 'both',
  },
  Intangible_Assets: {
    [TransactionType.JOURNAL_ENTRY]: 'both',
    [TransactionType.TRANSFER]: 'both',
  },
  Accumulated_Amortization: {
    [TransactionType.JOURNAL_ENTRY]: 'both',
    [TransactionType.TRANSFER]: 'both',
  },
  Other_Fixed_Assets: {
    [TransactionType.JOURNAL_ENTRY]: 'both',
    [TransactionType.TRANSFER]: 'both',
  },
  // Current Liabilities
  Accounts_Payable: {},
  Credit_Card: {
    [TransactionType.EXPENSE]: 'debit', // Expense increases CC liability (debit register)
    [TransactionType.REFUND]: 'debit',
    [TransactionType.CREDIT_CARD_PAYMENT]: 'credit', // Payment reduces CC liability (credit register)
    [TransactionType.JOURNAL_ENTRY]: 'both',
  },
  Other_Current_Liabilities: {
    [TransactionType.JOURNAL_ENTRY]: 'both',
    [TransactionType.TRANSFER]: 'both',
  },
  Long_Term_Liabilities: {
    [TransactionType.JOURNAL_ENTRY]: 'both',
    [TransactionType.TRANSFER]: 'both',
  },
  // Equity
  Equity: {
    [TransactionType.JOURNAL_ENTRY]: 'both',
    [TransactionType.TRANSFER]: 'both',
  },
  Retained_Earnings: {
    [TransactionType.JOURNAL_ENTRY]: 'both',
  },
  Net_Income: {},
  // P&L
  Income: {
    [TransactionType.EXPENSE]: 'both',
    [TransactionType.CHECK]: 'both',
    [TransactionType.DEPOSIT]: 'both',
    [TransactionType.REFUND]: 'both',
    [TransactionType.TRANSFER]: 'both',
    [TransactionType.CREDIT_CARD_PAYMENT]: 'both',
    [TransactionType.JOURNAL_ENTRY]: 'both',
    [TransactionType.INVOICE]: 'both',
    [TransactionType.RECEIVE_PAYMENT]: 'both',
    [TransactionType.BILL]: 'both',
    [TransactionType.BILL_PAYMENT]: 'both',
  },
  Other_Income: {
    [TransactionType.EXPENSE]: 'both',
    [TransactionType.CHECK]: 'both',
    [TransactionType.DEPOSIT]: 'both',
    [TransactionType.REFUND]: 'both',
    [TransactionType.TRANSFER]: 'both',
    [TransactionType.CREDIT_CARD_PAYMENT]: 'both',
    [TransactionType.JOURNAL_ENTRY]: 'both',
    [TransactionType.INVOICE]: 'both',
    [TransactionType.RECEIVE_PAYMENT]: 'both',
    [TransactionType.BILL]: 'both',
    [TransactionType.BILL_PAYMENT]: 'both',
  },
  Expense: {
    [TransactionType.EXPENSE]: 'both',
    [TransactionType.CHECK]: 'both',
    [TransactionType.DEPOSIT]: 'both',
    [TransactionType.REFUND]: 'both',
    [TransactionType.TRANSFER]: 'both',
    [TransactionType.CREDIT_CARD_PAYMENT]: 'both',
    [TransactionType.JOURNAL_ENTRY]: 'both',
    [TransactionType.INVOICE]: 'both',
    [TransactionType.RECEIVE_PAYMENT]: 'both',
    [TransactionType.BILL]: 'both',
    [TransactionType.BILL_PAYMENT]: 'both',
  },
  Other_Expense: {
    [TransactionType.EXPENSE]: 'both',
    [TransactionType.CHECK]: 'both',
    [TransactionType.DEPOSIT]: 'both',
    [TransactionType.REFUND]: 'both',
    [TransactionType.TRANSFER]: 'both',
    [TransactionType.CREDIT_CARD_PAYMENT]: 'both',
    [TransactionType.JOURNAL_ENTRY]: 'both',
    [TransactionType.INVOICE]: 'both',
    [TransactionType.RECEIVE_PAYMENT]: 'both',
    [TransactionType.BILL]: 'both',
    [TransactionType.BILL_PAYMENT]: 'both',
  },
  Cost_of_Goods_Sold: {
    [TransactionType.EXPENSE]: 'both',
    [TransactionType.CHECK]: 'both',
    [TransactionType.DEPOSIT]: 'both',
    [TransactionType.REFUND]: 'both',
    [TransactionType.TRANSFER]: 'both',
    [TransactionType.CREDIT_CARD_PAYMENT]: 'both',
    [TransactionType.JOURNAL_ENTRY]: 'both',
    [TransactionType.INVOICE]: 'both',
    [TransactionType.RECEIVE_PAYMENT]: 'both',
    [TransactionType.BILL]: 'both',
    [TransactionType.BILL_PAYMENT]: 'both',
  },
};

export function getPostingRule(registerAccountSubType: string | undefined, transactionType: TransactionType): PostingRule {
  if (!registerAccountSubType) return 'none'; // if no subtype, none allowed
  const map = RULES[registerAccountSubType];
  if (!map) return 'none'; // if no rule for subtype, none allowed
  // If transactionType value is missing, return 'none'
  return (transactionType in map) ? map[transactionType]! : 'none';
}

export function describeRule(rule: PostingRule): string {
  switch (rule) {
    case 'debit':
      return 'Register account will be Debited';
    case 'credit':
      return 'Register account will be Credited';
    case 'both':
      return 'Debit or credit allowed';
    case 'none':
      return 'This transaction type is not allowed for this register';
  }
}


