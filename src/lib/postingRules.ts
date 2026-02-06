import { TransactionType } from '@/types/api.types';


export type PostingRule = 'debit' | 'credit' | 'both' | 'none';

const RULES: Record<string, Partial<Record<TransactionType, PostingRule>>> = {
  
  Cash_Cash_Equivalents: {
    [TransactionType.EXPENSE]: 'credit', 
    [TransactionType.CHECK]: 'credit',
    [TransactionType.DEPOSIT]: 'debit', 
    [TransactionType.REFUND]: 'credit',
    [TransactionType.TRANSFER]: 'both',
    [TransactionType.CREDIT_CARD_PAYMENT]: 'credit',
    [TransactionType.JOURNAL_ENTRY]: 'both',

  },
  Accounts_Receivable: {},
  Other_Current_Assets: {
    [TransactionType.DEPOSIT]: 'debit',
    [TransactionType.REFUND]: 'credit',
    [TransactionType.JOURNAL_ENTRY]: 'both',
    [TransactionType.TRANSFER]: 'both',
  },
 
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
 
  Accounts_Payable: {},
  Credit_Card: {
    [TransactionType.EXPENSE]: 'debit', 
    [TransactionType.REFUND]: 'debit',
    [TransactionType.CREDIT_CARD_PAYMENT]: 'credit', 
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
  
  Equity: {
    [TransactionType.JOURNAL_ENTRY]: 'both',
    [TransactionType.TRANSFER]: 'both',
  },
  Retained_Earnings: {
    [TransactionType.JOURNAL_ENTRY]: 'both',
  },
  Net_Income: {},
  
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
  if (!registerAccountSubType) return 'none'; 
  const map = RULES[registerAccountSubType];
  if (!map) return 'none'; 
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


