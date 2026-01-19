import { AccountType } from '@/types/api.types';

// Account type order (as specified by user)
export const ACCOUNT_TYPE_ORDER: AccountType[] = [
  AccountType.Fixed_Assets,
  AccountType.Current_Assets,
  AccountType.Current_Liabilities,
  AccountType.Long_Term_Liabilities,
  AccountType.Equity,
  AccountType.Income,
  AccountType.Other_Income,
  AccountType.Cost_of_Goods_Sold,
  AccountType.Expense,
  AccountType.Other_Expense,
];

// Sub type order (as specified by user)
export const SUB_TYPE_ORDER: string[] = [
  'Cash_Cash_Equivalents',
  'Accounts_Receivable',
  'Property_Plant_Equipment',
  'Accumulated_Amortization',
  'Accumulated_Depreciation',
  'Other_Fixed_Assets',
  'Other_Current_Assets',
  'Undeposited_Funds',
  'Intangible_Assets',
  'Accounts_Payable',
  'Credit_Card',
  'Other_Current_Liabilities',
  'Long_Term_Liabilities',
  'Other_Equity',
  'Retained_Earnings',
  'Contributions',
  'Distributions',
  'Income',
  'Other_Income',
  'Gain_or_Loss_on_Sale',
  'Cost_of_Goods_Sold',
  'Expense',
  'Other_Expense',
];

/**
 * Get the sort order index for an account type
 * Returns -1 if not found (should be sorted last)
 */
export const getAccountTypeOrder = (type: AccountType): number => {
  const index = ACCOUNT_TYPE_ORDER.indexOf(type);
  return index === -1 ? 999 : index;
};

/**
 * Get the sort order index for a sub type
 * Returns -1 if not found (should be sorted last)
 */
export const getSubTypeOrder = (subType: string): number => {
  const index = SUB_TYPE_ORDER.indexOf(subType);
  return index === -1 ? 999 : index;
};

/**
 * Sort account types by the specified order
 */
export const sortAccountTypes = (types: AccountType[]): AccountType[] => {
  return [...types].sort((a, b) => {
    const aOrder = getAccountTypeOrder(a);
    const bOrder = getAccountTypeOrder(b);
    return aOrder - bOrder;
  });
};

/**
 * Sort sub types by the specified order
 */
export const sortSubTypes = (subTypes: string[]): string[] => {
  return [...subTypes].sort((a, b) => {
    const aOrder = getSubTypeOrder(a);
    const bOrder = getSubTypeOrder(b);
    if (aOrder === bOrder) {
      // If both have same order (or both not found), sort alphabetically
      return a.localeCompare(b);
    }
    return aOrder - bOrder;
  });
};

