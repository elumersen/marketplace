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
import { ChevronDown, ChevronRight, TrendingUp } from 'lucide-react';
// import { format } from 'date-fns';s

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

// Profit & Loss account types
const PROFIT_LOSS_TYPES: AccountType[] = [
  AccountType.Income,
  AccountType.Other_Income,
  AccountType.Expense,
  AccountType.Other_Expense,
  AccountType.Cost_of_Goods_Sold,
];

export const ProfitLoss = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  // const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), 0, 1));
  // const [endDate, setEndDate] = useState<Date>(new Date());
  const [expandedTypes, setExpandedTypes] = useState<Set<AccountType>>(
    new Set(PROFIT_LOSS_TYPES)
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
      for (const type of PROFIT_LOSS_TYPES) {
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

  // Group accounts by type and subtype
  const groupedAccounts = useMemo(() => {
    const groups: Record<string, AccountGroup> = {};
    
    PROFIT_LOSS_TYPES.forEach(type => {
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
  const getSubTypeGroups = (accounts: Account[]): SubTypeGroup[] => {
    const subTypeMap = new Map<string, Account[]>();
    
    accounts.forEach(acc => {
      const subType = acc.subType || 'Other';
      if (!subTypeMap.has(subType)) {
        subTypeMap.set(subType, []);
      }
      subTypeMap.get(subType)!.push(acc);
    });
    
    return Array.from(subTypeMap.entries()).map(([subType, accs]) => ({
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
  const totalIncome = useMemo(() => {
    const income = (groupedAccounts[AccountType.Income]?.total || 0);
    const otherIncome = (groupedAccounts[AccountType.Other_Income]?.total || 0);
    return income + otherIncome;
  }, [groupedAccounts]);

  const totalExpenses = useMemo(() => {
    const expense = (groupedAccounts[AccountType.Expense]?.total || 0);
    const otherExpense = (groupedAccounts[AccountType.Other_Expense]?.total || 0);
    const cogs = (groupedAccounts[AccountType.Cost_of_Goods_Sold]?.total || 0);
    return expense + otherExpense + cogs;
  }, [groupedAccounts]);

  const netIncome = useMemo(() => {
    return totalIncome - totalExpenses;
  }, [totalIncome, totalExpenses]);

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
                <TrendingUp className="h-6 w-6" />
                Profit and Loss
              </CardTitle>
              {/* <p className="text-sm text-muted-foreground mt-1">
                {format(startDate, 'MMMM d')} - {format(endDate, 'MMMM d, yyyy')}
              </p> */}
            </div>
            {/* <div className="flex items-center gap-2">
              <Input
                type="date"
                value={format(startDate, 'yyyy-MM-dd')}
                onChange={(e) => setStartDate(new Date(e.target.value))}
                className="w-40"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={format(endDate, 'yyyy-MM-dd')}
                onChange={(e) => setEndDate(new Date(e.target.value))}
                className="w-40"
              />
            </div> */}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {/* Income Section */}
            {groupedAccounts[AccountType.Income] && (
              <Collapsible
                open={expandedTypes.has(AccountType.Income)}
                onOpenChange={() => toggleType(AccountType.Income)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-lg transition-colors">
                    <div className="flex items-center gap-2">
                      {expandedTypes.has(AccountType.Income) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-semibold text-base">
                        {formatAccountType(AccountType.Income)}
                      </span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(groupedAccounts[AccountType.Income].total)}
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 space-y-1">
                    {getSubTypeGroups(groupedAccounts[AccountType.Income].accounts).map((subGroup) => {
                      const subTypeKey = `${AccountType.Income}-${subGroup.subType}`;
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

            {/* Other Income Section */}
            {groupedAccounts[AccountType.Other_Income] && (
              <Collapsible
                open={expandedTypes.has(AccountType.Other_Income)}
                onOpenChange={() => toggleType(AccountType.Other_Income)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-lg transition-colors">
                    <div className="flex items-center gap-2">
                      {expandedTypes.has(AccountType.Other_Income) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-semibold text-base">
                        {formatAccountType(AccountType.Other_Income)}
                      </span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(groupedAccounts[AccountType.Other_Income].total)}
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 space-y-1">
                    {getSubTypeGroups(groupedAccounts[AccountType.Other_Income].accounts).map((subGroup) => {
                      const subTypeKey = `${AccountType.Other_Income}-${subGroup.subType}`;
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

            {/* Total Income */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border-t-2 border-b-2 my-2">
              <span className="font-bold text-base">Total Income</span>
              <span className="font-bold">{formatCurrency(totalIncome)}</span>
            </div>

            {/* Cost of Goods Sold Section */}
            {groupedAccounts[AccountType.Cost_of_Goods_Sold] && (
              <Collapsible
                open={expandedTypes.has(AccountType.Cost_of_Goods_Sold)}
                onOpenChange={() => toggleType(AccountType.Cost_of_Goods_Sold)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-lg transition-colors">
                    <div className="flex items-center gap-2">
                      {expandedTypes.has(AccountType.Cost_of_Goods_Sold) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-semibold text-base">
                        {formatAccountType(AccountType.Cost_of_Goods_Sold)}
                      </span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(groupedAccounts[AccountType.Cost_of_Goods_Sold].total)}
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 space-y-1">
                    {getSubTypeGroups(groupedAccounts[AccountType.Cost_of_Goods_Sold].accounts).map((subGroup) => {
                      const subTypeKey = `${AccountType.Cost_of_Goods_Sold}-${subGroup.subType}`;
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

            {/* Total COGS */}
            {groupedAccounts[AccountType.Cost_of_Goods_Sold] && (
              <div className="flex items-center justify-between p-2 pl-6">
                <span className="font-semibold text-sm">
                  Total for {formatAccountType(AccountType.Cost_of_Goods_Sold)}
                </span>
                <span className="font-semibold text-sm">
                  {formatCurrency(groupedAccounts[AccountType.Cost_of_Goods_Sold].total)}
                </span>
              </div>
            )}

            {/* Gross Profit */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border-t-2 border-b-2 my-2">
              <span className="font-bold text-base">Gross Profit</span>
              <span className="font-bold">
                {formatCurrency(totalIncome - (groupedAccounts[AccountType.Cost_of_Goods_Sold]?.total || 0))}
              </span>
            </div>

            {/* Expense Section */}
            {groupedAccounts[AccountType.Expense] && (
              <Collapsible
                open={expandedTypes.has(AccountType.Expense)}
                onOpenChange={() => toggleType(AccountType.Expense)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-lg transition-colors">
                    <div className="flex items-center gap-2">
                      {expandedTypes.has(AccountType.Expense) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-semibold text-base">
                        {formatAccountType(AccountType.Expense)}
                      </span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(groupedAccounts[AccountType.Expense].total)}
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 space-y-1">
                    {getSubTypeGroups(groupedAccounts[AccountType.Expense].accounts).map((subGroup) => {
                      const subTypeKey = `${AccountType.Expense}-${subGroup.subType}`;
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

            {/* Other Expense Section */}
            {groupedAccounts[AccountType.Other_Expense] && (
              <Collapsible
                open={expandedTypes.has(AccountType.Other_Expense)}
                onOpenChange={() => toggleType(AccountType.Other_Expense)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-lg transition-colors">
                    <div className="flex items-center gap-2">
                      {expandedTypes.has(AccountType.Other_Expense) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-semibold text-base">
                        {formatAccountType(AccountType.Other_Expense)}
                      </span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(groupedAccounts[AccountType.Other_Expense].total)}
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 space-y-1">
                    {getSubTypeGroups(groupedAccounts[AccountType.Other_Expense].accounts).map((subGroup) => {
                      const subTypeKey = `${AccountType.Other_Expense}-${subGroup.subType}`;
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

            {/* Total Expenses */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border-t-2 border-b-2 my-2">
              <span className="font-bold text-base">Total Expenses</span>
              <span className="font-bold">{formatCurrency(totalExpenses)}</span>
            </div>

            {/* Net Income */}
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border-2 border-primary/20 my-2">
              <span className="font-bold text-lg">Net Income</span>
              <span className="font-bold text-lg">
                {formatCurrency(netIncome)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
