import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
// import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { accountAPI, getErrorMessage } from '@/lib/api';
import { Account, AccountType } from '@/types/api.types';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
// import { format } from 'date-fns';

interface AccountGroup {
  type: AccountType;
  accounts: Account[];
  total: number;
}

interface SubTypeGroup {
  subType: string;
  accounts: Account[];
  total: number;
}

// Balance Sheet account types
const BALANCE_SHEET_TYPES: AccountType[] = [
  AccountType.Current_Assets,
  AccountType.Fixed_Assets,
  AccountType.Current_Liabilities,
  AccountType.Equity,
];

// Subtype mappings for Balance Sheet organization
const SUBTYPE_MAPPING: Record<string, string[]> = {
  [AccountType.Current_Assets]: [
    'Cash_Cash_Equivalents',
    'Accounts_Receivable',
    'Other_Current_Assets',
  ],
  [AccountType.Fixed_Assets]: [
    'Property_Plant_Equipment',
    'Accumulated_Depreciation',
    'Intangible_Assets',
    'Accumulated_Amortization',
    'Other_Fixed_Assets',
  ],
  [AccountType.Current_Liabilities]: [
    'Accounts_Payable',
    'Credit_Card',
    'Other_Current_Liabilities',
    'Long_Term_Liabilities',
  ],
  [AccountType.Equity]: [
    'Equity',
    'Retained_Earnings',
    'Net_Income',
  ],
};

export const BalanceSheet = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  // const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [expandedTypes, setExpandedTypes] = useState<Set<AccountType>>(
    new Set(BALANCE_SHEET_TYPES)
  );
  const [expandedSubTypes, setExpandedSubTypes] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const allAccounts: Account[] = [];
      
      // Fetch accounts for each type
      for (const type of BALANCE_SHEET_TYPES) {
        const response = await accountAPI.getAll({ 
          type, 
          isActive: true,
          all: 'true'
        });
        if (response.data) {
          allAccounts.push(...response.data);
        }
      }
      
      setAccounts(allAccounts);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  // Group accounts by type
  const groupedAccounts = useMemo(() => {
    const groups: Record<string, AccountGroup> = {};
    
    BALANCE_SHEET_TYPES.forEach(type => {
      const typeAccounts = accounts.filter(acc => acc.type === type);
      if (typeAccounts.length > 0) {
        const total = typeAccounts.reduce((sum, acc) => sum + acc.balance, 0);
        groups[type] = {
          type,
          accounts: typeAccounts,
          total,
        };
      }
    });
    
    return groups;
  }, [accounts]);

  // Group by subtype within each type
  const getSubTypeGroups = (type: AccountType, accounts: Account[]): SubTypeGroup[] => {
    const subTypeMap = new Map<string, Account[]>();
    const expectedSubTypes = SUBTYPE_MAPPING[type] || [];
    
    // First, add expected subtypes (even if empty)
    expectedSubTypes.forEach(subType => {
      subTypeMap.set(subType, []);
    });
    
    // Then, add accounts to their subtypes
    accounts.forEach(acc => {
      const subType = acc.subType || 'Other';
      if (!subTypeMap.has(subType)) {
        subTypeMap.set(subType, []);
      }
      subTypeMap.get(subType)!.push(acc);
    });
    
    // Filter out empty subtypes and sort by expected order
    return Array.from(subTypeMap.entries())
      .filter(([_, accs]) => accs.length > 0)
      .sort((a, b) => {
        const aIndex = expectedSubTypes.indexOf(a[0]);
        const bIndex = expectedSubTypes.indexOf(b[0]);
        if (aIndex === -1 && bIndex === -1) return a[0].localeCompare(b[0]);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      })
      .map(([subType, accs]) => ({
        subType,
        accounts: accs,
        total: accs.reduce((sum, acc) => sum + acc.balance, 0),
      }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatAccountType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const toggleType = (type: AccountType) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedTypes(newExpanded);
  };

  const toggleSubType = (key: string) => {
    const newExpanded = new Set(expandedSubTypes);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSubTypes(newExpanded);
  };

  // Calculate totals
  const totalAssets = useMemo(() => {
    const currentAssets = groupedAccounts[AccountType.Current_Assets]?.total || 0;
    const fixedAssets = groupedAccounts[AccountType.Fixed_Assets]?.total || 0;
    return currentAssets + fixedAssets;
  }, [groupedAccounts]);

  const totalLiabilities = useMemo(() => {
    return groupedAccounts[AccountType.Current_Liabilities]?.total || 0;
  }, [groupedAccounts]);

  const totalEquity = useMemo(() => {
    return groupedAccounts[AccountType.Equity]?.total || 0;
  }, [groupedAccounts]);

  const totalLiabilitiesAndEquity = useMemo(() => {
    return totalLiabilities + totalEquity;
  }, [totalLiabilities, totalEquity]);

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Spinner size="lg" />
              <span className="text-sm text-muted-foreground">Loading report...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <FileText className="h-6 w-6" />
                Balance Sheet
              </CardTitle>
              {/* <p className="text-sm text-muted-foreground mt-1">
                As of {format(asOfDate, 'MMMM d, yyyy')}
              </p> */}
            </div>
            {/* <div className="flex items-center gap-2">
              <Input
                type="date"
                value={format(asOfDate, 'yyyy-MM-dd')}
                onChange={(e) => setAsOfDate(new Date(e.target.value))}
                className="w-40"
              />
            </div> */}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Assets */}
            <div className="space-y-1">
              <h2 className="text-lg font-bold mb-4 pb-2 border-b">Assets</h2>
              
              {/* Current Assets */}
              {groupedAccounts[AccountType.Current_Assets] && (
                <Collapsible
                  open={expandedTypes.has(AccountType.Current_Assets)}
                  onOpenChange={() => toggleType(AccountType.Current_Assets)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-2">
                        {expandedTypes.has(AccountType.Current_Assets) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-semibold text-base">Current Assets</span>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(groupedAccounts[AccountType.Current_Assets].total)}
                      </span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 space-y-1">
                      {getSubTypeGroups(AccountType.Current_Assets, groupedAccounts[AccountType.Current_Assets].accounts).map((subGroup) => {
                        const subTypeKey = `${AccountType.Current_Assets}-${subGroup.subType}`;
                        const isSubExpanded = expandedSubTypes.has(subTypeKey);
                        
                        return (
                          <Collapsible
                            key={subTypeKey}
                            open={isSubExpanded}
                            onOpenChange={() => toggleSubType(subTypeKey)}
                          >
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-center justify-between w-full p-2 pl-4 hover:bg-muted/30 rounded transition-colors">
                                <div className="flex items-center gap-2">
                                  {isSubExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                  <span className="text-sm font-medium">
                                    {formatAccountType(subGroup.subType)}
                                  </span>
                                </div>
                                <span className="text-sm font-medium">
                                  {formatCurrency(subGroup.total)}
                                </span>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="ml-6 space-y-0">
                                {subGroup.accounts.map((account) => (
                                  <div
                                    key={account.id}
                                    className="flex items-center justify-between p-2 pl-6 hover:bg-muted/20 rounded text-sm"
                                  >
                                    <span className="text-muted-foreground">{account.name}</span>
                                    <span className="font-mono text-sm">
                                      {formatCurrency(account.balance)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Total Current Assets */}
              {groupedAccounts[AccountType.Current_Assets] && (
                <div className="flex items-center justify-between p-2 pl-6">
                  <span className="font-semibold text-sm">
                    Total Current Assets
                  </span>
                  <span className="font-semibold text-sm">
                    {formatCurrency(groupedAccounts[AccountType.Current_Assets].total)}
                  </span>
                </div>
              )}

              {/* Fixed Assets */}
              {groupedAccounts[AccountType.Fixed_Assets] && (
                <Collapsible
                  open={expandedTypes.has(AccountType.Fixed_Assets)}
                  onOpenChange={() => toggleType(AccountType.Fixed_Assets)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-2">
                        {expandedTypes.has(AccountType.Fixed_Assets) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-semibold text-base">Fixed Assets</span>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(groupedAccounts[AccountType.Fixed_Assets].total)}
                      </span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 space-y-1">
                      {getSubTypeGroups(AccountType.Fixed_Assets, groupedAccounts[AccountType.Fixed_Assets].accounts).map((subGroup) => {
                        const subTypeKey = `${AccountType.Fixed_Assets}-${subGroup.subType}`;
                        const isSubExpanded = expandedSubTypes.has(subTypeKey);
                        
                        return (
                          <Collapsible
                            key={subTypeKey}
                            open={isSubExpanded}
                            onOpenChange={() => toggleSubType(subTypeKey)}
                          >
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-center justify-between w-full p-2 pl-4 hover:bg-muted/30 rounded transition-colors">
                                <div className="flex items-center gap-2">
                                  {isSubExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                  <span className="text-sm font-medium">
                                    {formatAccountType(subGroup.subType)}
                                  </span>
                                </div>
                                <span className="text-sm font-medium">
                                  {formatCurrency(subGroup.total)}
                                </span>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="ml-6 space-y-0">
                                {subGroup.accounts.map((account) => (
                                  <div
                                    key={account.id}
                                    className="flex items-center justify-between p-2 pl-6 hover:bg-muted/20 rounded text-sm"
                                  >
                                    <span className="text-muted-foreground">{account.name}</span>
                                    <span className="font-mono text-sm">
                                      {formatCurrency(account.balance)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Total Fixed Assets */}
              {groupedAccounts[AccountType.Fixed_Assets] && (
                <div className="flex items-center justify-between p-2 pl-6">
                  <span className="font-semibold text-sm">
                    Total Fixed Assets
                  </span>
                  <span className="font-semibold text-sm">
                    {formatCurrency(groupedAccounts[AccountType.Fixed_Assets].total)}
                  </span>
                </div>
              )}

              {/* Total Assets */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border-t-2 border-b-2 my-2">
                <span className="font-bold text-base">Total Assets</span>
                <span className="font-bold">{formatCurrency(totalAssets)}</span>
              </div>
            </div>

            {/* Right Column: Liabilities and Equity */}
            <div className="space-y-1">
              <h2 className="text-lg font-bold mb-4 pb-2 border-b">Liabilities & Equity</h2>
              
              {/* Current Liabilities */}
              {groupedAccounts[AccountType.Current_Liabilities] && (
                <Collapsible
                  open={expandedTypes.has(AccountType.Current_Liabilities)}
                  onOpenChange={() => toggleType(AccountType.Current_Liabilities)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-2">
                        {expandedTypes.has(AccountType.Current_Liabilities) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-semibold text-base">Current Liabilities</span>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(groupedAccounts[AccountType.Current_Liabilities].total)}
                      </span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 space-y-1">
                      {getSubTypeGroups(AccountType.Current_Liabilities, groupedAccounts[AccountType.Current_Liabilities].accounts).map((subGroup) => {
                        const subTypeKey = `${AccountType.Current_Liabilities}-${subGroup.subType}`;
                        const isSubExpanded = expandedSubTypes.has(subTypeKey);
                        
                        return (
                          <Collapsible
                            key={subTypeKey}
                            open={isSubExpanded}
                            onOpenChange={() => toggleSubType(subTypeKey)}
                          >
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-center justify-between w-full p-2 pl-4 hover:bg-muted/30 rounded transition-colors">
                                <div className="flex items-center gap-2">
                                  {isSubExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                  <span className="text-sm font-medium">
                                    {formatAccountType(subGroup.subType)}
                                  </span>
                                </div>
                                <span className="text-sm font-medium">
                                  {formatCurrency(subGroup.total)}
                                </span>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="ml-6 space-y-0">
                                {subGroup.accounts.map((account) => (
                                  <div
                                    key={account.id}
                                    className="flex items-center justify-between p-2 pl-6 hover:bg-muted/20 rounded text-sm"
                                  >
                                    <span className="text-muted-foreground">{account.name}</span>
                                    <span className="font-mono text-sm">
                                      {formatCurrency(account.balance)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Total Current Liabilities */}
              {groupedAccounts[AccountType.Current_Liabilities] && (
                <div className="flex items-center justify-between p-2 pl-6">
                  <span className="font-semibold text-sm">
                    Total Current Liabilities
                  </span>
                  <span className="font-semibold text-sm">
                    {formatCurrency(groupedAccounts[AccountType.Current_Liabilities].total)}
                  </span>
                </div>
              )}

              {/* Equity */}
              {groupedAccounts[AccountType.Equity] && (
                <Collapsible
                  open={expandedTypes.has(AccountType.Equity)}
                  onOpenChange={() => toggleType(AccountType.Equity)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-2">
                        {expandedTypes.has(AccountType.Equity) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-semibold text-base">Equity</span>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(groupedAccounts[AccountType.Equity].total)}
                      </span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 space-y-1">
                      {getSubTypeGroups(AccountType.Equity, groupedAccounts[AccountType.Equity].accounts).map((subGroup) => {
                        const subTypeKey = `${AccountType.Equity}-${subGroup.subType}`;
                        const isSubExpanded = expandedSubTypes.has(subTypeKey);
                        
                        return (
                          <Collapsible
                            key={subTypeKey}
                            open={isSubExpanded}
                            onOpenChange={() => toggleSubType(subTypeKey)}
                          >
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-center justify-between w-full p-2 pl-4 hover:bg-muted/30 rounded transition-colors">
                                <div className="flex items-center gap-2">
                                  {isSubExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                  <span className="text-sm font-medium">
                                    {formatAccountType(subGroup.subType)}
                                  </span>
                                </div>
                                <span className="text-sm font-medium">
                                  {formatCurrency(subGroup.total)}
                                </span>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="ml-6 space-y-0">
                                {subGroup.accounts.map((account) => (
                                  <div
                                    key={account.id}
                                    className="flex items-center justify-between p-2 pl-6 hover:bg-muted/20 rounded text-sm"
                                  >
                                    <span className="text-muted-foreground">{account.name}</span>
                                    <span className="font-mono text-sm">
                                      {formatCurrency(account.balance)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Total Equity */}
              {groupedAccounts[AccountType.Equity] && (
                <div className="flex items-center justify-between p-2 pl-6">
                  <span className="font-semibold text-sm">
                    Total Equity
                  </span>
                  <span className="font-semibold text-sm">
                    {formatCurrency(groupedAccounts[AccountType.Equity].total)}
                  </span>
                </div>
              )}

              {/* Total Liabilities and Equity */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border-t-2 border-b-2 my-2">
                <span className="font-bold text-base">Total Liabilities & Equity</span>
                <span className="font-bold">{formatCurrency(totalLiabilitiesAndEquity)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
