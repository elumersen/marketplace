import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { plaidAPI, bankAccountAPI, transactionAPI, accountAPI, journalEntryAPI, getErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Link2, RefreshCw, CheckCircle2, XCircle, SearchIcon } from 'lucide-react';
import type { PlaidItem, BankAccount, Transaction, TransactionType, Account } from '@/types/api.types';
import { TransactionType as TransactionTypeEnum, JournalEntryStatus } from '@/types/api.types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SmartTransactionRow } from './SmartTransactionRow';
import { cn } from '@/lib/utils';

export const SmartBankFeed = () => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [items, setItems] = useState<PlaidItem[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]); // Chart of Accounts
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [selectedBankItem, setSelectedBankItem] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('uncategorized');
  const [datePreset, setDatePreset] = useState<string>('all');
  const { toast } = useToast();

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [itemsResponse, bankAccountsResponse, transactionsResponse, accountsResponse] = await Promise.all([
        plaidAPI.getItems(),
        bankAccountAPI.getAll(),
        transactionAPI.getAll({}),
        accountAPI.getAll({ isActive: true, all: 'true' }),
      ]);
      setItems(itemsResponse.items);
      setBankAccounts(bankAccountsResponse);
      // Backend returns { transactions: Transaction[] }
      setTransactions(transactionsResponse.transactions);
      // Backend returns { data: Account[] }
      setAccounts(accountsResponse.data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Plaid Link handlers
  const onSuccess = useCallback(
    async (publicToken: string) => {
      try {
        setLoading(true);
        await plaidAPI.exchangePublicToken({ public_token: publicToken });
        toast({
          title: 'Success',
          description: 'Bank account connected successfully',
        });
        await fetchData();
        setLinkToken(null);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to connect bank account',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [toast, fetchData]
  );

  const config = {
    token: linkToken,
    onSuccess,
    onExit: (err: any) => {
      if (err) {
        toast({
          title: 'Error',
          description: err.error_message || 'Failed to connect bank account',
          variant: 'destructive',
        });
      }
      setLinkToken(null);
    },
  };

  const { open, ready } = usePlaidLink(config);

  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const response = await plaidAPI.createLinkToken();
      setLinkToken(response.link_token);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create link token',
        variant: 'destructive',
      });
      setLinkToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncTransactions = async (itemId?: string) => {
    try {
      setSyncing(itemId || 'transactions');
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const response = await plaidAPI.syncTransactions({ itemId, startDate, endDate });
      
      if (response.syncedCount > 0) {
        toast({
          title: 'Success',
          description: `Synced ${response.syncedCount} transactions`,
        });
        await fetchData();
      } else {
        toast({
          title: 'Info',
          description: 'No new transactions found',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sync transactions',
        variant: 'destructive',
      });
    } finally {
      setSyncing(null);
    }
  };

  // Transaction selection
  const handleSelectTransaction = (id: string, selected: boolean) => {
    setSelectedTransactions((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransactions(new Set(filteredTransactions.map((t) => t.id)));
    } else {
      setSelectedTransactions(new Set());
    }
  };

  // Transaction update handler
  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      // Convert null to undefined for account IDs
      const updateData: any = { ...updates };
      if (updateData.expenseAccountId === null) {
        updateData.expenseAccountId = undefined;
      }
      if (updateData.incomeAccountId === null) {
        updateData.incomeAccountId = undefined;
      }
      await transactionAPI.update(id, updateData);
      toast({
        title: 'Success',
        description: 'Transaction updated successfully',
      });
      await fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  // Categorize handler - creates journal entry with debit/credit
  const handleCategorize = async (id: string, type: TransactionType, accountId?: string) => {
    try {
      const transaction = transactions.find(t => t.id === id);
      if (!transaction) {
        toast({
          title: 'Error',
          description: 'Transaction not found',
          variant: 'destructive',
        });
        return;
      }

      // For expense transactions, require an expense account
      if (type === TransactionTypeEnum.EXPENSE && !accountId) {
        toast({
          title: 'Error',
          description: 'Please select an expense account',
          variant: 'destructive',
        });
        return;
      }

      // For deposit/receive payment transactions, require an income account
      if ((type === TransactionTypeEnum.DEPOSIT || type === TransactionTypeEnum.RECEIVE_PAYMENT) && !accountId) {
        toast({
          title: 'Error',
          description: 'Please select an income account',
          variant: 'destructive',
        });
        return;
      }

      // Find the selected account and bank account
      const selectedAccount = accounts.find(a => a.id === accountId);
      const bankAccount = bankAccounts.find(ba => ba.id === transaction.bankAccountId);

      if (!bankAccount) {
        toast({
          title: 'Error',
          description: 'Bank account not found',
          variant: 'destructive',
        });
        return;
      }

      // Find the Chart of Accounts account that corresponds to the bank account
      // Try to find by name match first, then by account type
      let bankAccountChartAccount = accounts.find(a => 
        a.name.toLowerCase() === bankAccount.name.toLowerCase() ||
        (a.subType === 'Credit_Card' && bankAccount.accountType?.toLowerCase().includes('credit'))
      );

      // If not found, try to find a Cash or Credit Card account
      if (!bankAccountChartAccount) {
        bankAccountChartAccount = accounts.find(a => 
          a.subType === 'Credit_Card' || a.subType === 'Cash_Cash_Equivalents'
        );
      }

      if (!bankAccountChartAccount) {
        toast({
          title: 'Error',
          description: 'Could not find corresponding Chart of Accounts account for the bank account',
          variant: 'destructive',
        });
        return;
      }

      // Determine debit and credit based on transaction type
      let debitAccountId: string;
      let creditAccountId: string;

      if (type === TransactionTypeEnum.EXPENSE) {
        // Expense: Debit expense account, Credit bank account (Chart of Accounts)
        if (!selectedAccount) {
          toast({
            title: 'Error',
            description: 'Please select an expense account',
            variant: 'destructive',
          });
          return;
        }
        debitAccountId = selectedAccount.id;
        creditAccountId = bankAccountChartAccount.id;
      } else if (type === TransactionTypeEnum.DEPOSIT || type === TransactionTypeEnum.RECEIVE_PAYMENT) {
        // Deposit/Receive Payment: Debit bank account (Chart of Accounts), Credit income account
        if (!selectedAccount) {
          toast({
            title: 'Error',
            description: 'Please select an income account',
            variant: 'destructive',
          });
          return;
        }
        debitAccountId = bankAccountChartAccount.id;
        creditAccountId = selectedAccount.id;
      } else {
        // For other types, just update the transaction type without creating journal entry
        await transactionAPI.update(id, { type });
        toast({
          title: 'Success',
          description: 'Transaction categorized successfully',
        });
        await fetchData();
        return;
      }

      // Create journal entry with two lines
      const journalEntryData = {
        entryDate: transaction.transactionDate,
        description: transaction.description || 'Transaction categorization',
        status: JournalEntryStatus.POSTED,
        lines: [
          {
            accountId: debitAccountId,
            description: transaction.description || '',
            debit: transaction.amount,
            credit: 0,
          },
          {
            accountId: creditAccountId,
            description: transaction.description || '',
            debit: 0,
            credit: transaction.amount,
          },
        ],
      };

      // Create the journal entry
      await journalEntryAPI.create(journalEntryData);

      // Update the transaction to link it to the journal entry and set the type
      const updateData: any = { type };
      if (type === TransactionTypeEnum.EXPENSE) {
        updateData.expenseAccountId = accountId;
      } else if (type === TransactionTypeEnum.DEPOSIT || type === TransactionTypeEnum.RECEIVE_PAYMENT) {
        updateData.incomeAccountId = accountId;
      }
      await transactionAPI.update(id, updateData);

      toast({
        title: 'Success',
        description: 'Transaction categorized successfully',
      });
      await fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  // Bulk actions
  const handleBulkCategorize = async (type: TransactionType) => {
    try {
      const promises = Array.from(selectedTransactions).map((id) =>
        transactionAPI.update(id, { type })
      );
      await Promise.all(promises);
      toast({
        title: 'Success',
        description: `Categorized ${selectedTransactions.size} transactions as ${type}`,
      });
      setSelectedTransactions(new Set());
      await fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  // Get bank account IDs for selected Plaid item
  const selectedBankAccountIds = useMemo(() => {
    if (!selectedBankItem) return null;
    
    const item = items.find((i) => i.id === selectedBankItem);
    if (!item) return null;
    
    // Get all bank account IDs linked to this Plaid item's accounts
    const bankAccountIds = new Set<string>();
    item.plaidAccounts.forEach((plaidAccount) => {
      if (plaidAccount.bankAccountId) {
        bankAccountIds.add(plaidAccount.bankAccountId);
      }
    });
    
    return bankAccountIds.size > 0 ? bankAccountIds : null;
  }, [selectedBankItem, items]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Filter by selected bank item
    if (selectedBankAccountIds) {
      filtered = filtered.filter((t) => selectedBankAccountIds.has(t.bankAccountId));
    }

    // Search filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter((t) => {
        const description = t.description?.toLowerCase() || '';
        const payee = t.payee?.toLowerCase() || '';
        const refNumber = t.referenceNumber?.toLowerCase() || '';
        return description.includes(lower) || payee.includes(lower) || refNumber.includes(lower);
      });
    }

    // Account filter (only if no bank item is selected)
    if (filterAccount !== 'all' && !selectedBankItem) {
      filtered = filtered.filter((t) => t.bankAccountId === filterAccount);
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((t) => t.type === filterType);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((t) => 
        filterStatus === 'reconciled' ? t.isReconciled : !t.isReconciled
      );
    }

    // Category filter (Uncategorized vs Categorized)
    if (filterCategory !== 'all') {
      if (filterCategory === 'uncategorized') {
        // Show transactions that don't have an account assigned
        filtered = filtered.filter((t) => {
          if (t.type === TransactionTypeEnum.EXPENSE) {
            return !t.expenseAccountId;
          }
          if (t.type === TransactionTypeEnum.DEPOSIT || t.type === TransactionTypeEnum.RECEIVE_PAYMENT) {
            return !t.incomeAccountId;
          }
          // For other types, consider them uncategorized if they don't have a type set
          return !t.type || t.type === TransactionTypeEnum.JOURNAL_ENTRY;
        });
      } else if (filterCategory === 'categorized') {
        // Show transactions that have an account assigned
        filtered = filtered.filter((t) => {
          if (t.type === TransactionTypeEnum.EXPENSE) {
            return !!t.expenseAccountId;
          }
          if (t.type === TransactionTypeEnum.DEPOSIT || t.type === TransactionTypeEnum.RECEIVE_PAYMENT) {
            return !!t.incomeAccountId;
          }
          // For other types, consider them categorized if they have a proper type set
          return t.type && t.type !== TransactionTypeEnum.JOURNAL_ENTRY;
        });
      }
    }

    // Date preset filter
    if (datePreset !== 'all') {
      const now = new Date();
      let startDate: Date;
      switch (datePreset) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'last7':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last30':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'last90':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      filtered = filtered.filter((t) => new Date(t.transactionDate) >= startDate);
    }

    return filtered.sort((a, b) => 
      new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
    );
  }, [transactions, searchTerm, filterAccount, filterType, filterStatus, filterCategory, datePreset, selectedBankAccountIds, selectedBankItem]);

  const uncategorizedCount = useMemo(() => 
    filteredTransactions.filter((t) => {
      if (t.type === TransactionTypeEnum.EXPENSE) {
        return !t.expenseAccountId;
      }
      if (t.type === TransactionTypeEnum.DEPOSIT || t.type === TransactionTypeEnum.RECEIVE_PAYMENT) {
        return !t.incomeAccountId;
      }
      return !t.type || t.type === TransactionTypeEnum.JOURNAL_ENTRY;
    }).length,
    [filteredTransactions]
  );

  const allSelected = selectedTransactions.size > 0 && selectedTransactions.size === filteredTransactions.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bank Feed</h2>
          <p className="text-muted-foreground">
            Connect accounts, sync transactions, and categorize automatically
          </p>
        </div>
        <div className="flex gap-2">
          {items.length > 0 && (
            <Button
              variant="outline"
              onClick={() => handleSyncTransactions()}
              disabled={syncing === 'transactions'}
            >
              {syncing === 'transactions' ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync All
                </>
              )}
            </Button>
          )}
          <Button onClick={handleConnect} disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Connecting...
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                Connect Bank
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Connected Accounts Summary */}
      {items.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {items.map((item) => {
              const isSelected = selectedBankItem === item.id;
              const linkedAccountsCount = item.plaidAccounts.filter((acc) => acc.bankAccountId).length;
              
              // Calculate transaction count for this item
              const itemBankAccountIds = new Set(
                item.plaidAccounts
                  .filter((pa) => pa.bankAccountId)
                  .map((pa) => pa.bankAccountId!)
              );
              const transactionCount = isSelected
                ? filteredTransactions.length
                : transactions.filter((t) => itemBankAccountIds.has(t.bankAccountId)).length;

              return (
                <Card
                  key={item.id}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    isSelected && 'ring-2 ring-primary shadow-md'
                  )}
                  onClick={() => setSelectedBankItem(isSelected ? null : item.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{item.institutionName || 'Bank'}</CardTitle>
                      {item.isActive ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        {item.plaidAccounts.length} account{item.plaidAccounts.length !== 1 ? 's' : ''}
                        {linkedAccountsCount > 0 && (
                          <span className="ml-2">
                            • {linkedAccountsCount} linked
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <div className="text-sm font-medium text-primary">
                          {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSyncTransactions(item.itemId);
                        }}
                        disabled={syncing === item.itemId}
                        className="w-full"
                      >
                        {syncing === item.itemId ? (
                          <>
                            <Spinner size="sm" className="mr-2" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-3 w-3" />
                            Sync Now
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>Transactions</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              {selectedBankItem && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedBankItem(null)}
                >
                  View All
                </Button>
              )}
              {uncategorizedCount > 0 && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700">
                  {uncategorizedCount} need attention
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
                <SearchIcon className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
              </div>
              <Select value={datePreset} onValueChange={setDatePreset}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last7">Last 7 days</SelectItem>
                  <SelectItem value="last30">Last 30 days</SelectItem>
                  <SelectItem value="last90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterAccount} onValueChange={setFilterAccount}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {bankAccounts
                    .filter((ba) => ba.isActive)
                    .map((ba) => (
                      <SelectItem key={ba.id} value={ba.id}>
                        {ba.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="DEPOSIT">Deposit</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                  <SelectItem value="BILL_PAYMENT">Bill Payment</SelectItem>
                  <SelectItem value="RECEIVE_PAYMENT">Receive Payment</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="reconciled">Reconciled</SelectItem>
                  <SelectItem value="unreconciled">Unreconciled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  <SelectItem value="categorized">Categorized</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions Bar */}
            {selectedTransactions.size > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {selectedTransactions.size} selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Categorize
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Quick Categories</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleBulkCategorize(TransactionTypeEnum.EXPENSE)}>
                        Expense
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkCategorize(TransactionTypeEnum.DEPOSIT)}>
                        Deposit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkCategorize(TransactionTypeEnum.TRANSFER)}>
                        Transfer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTransactions(new Set())}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}

            {/* Transactions Table */}
            {loading && transactions.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg font-medium mb-2">No transactions found</p>
                <p className="text-sm">
                  {items.length === 0
                    ? 'Connect a bank account to get started'
                    : 'Try adjusting your filters'}
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-32">Description</TableHead>
                      <TableHead className="w-32">Payee</TableHead>
                      <TableHead>Bank Account</TableHead>
                      <TableHead>Chart Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-32">Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <SmartTransactionRow
                        key={transaction.id}
                        transaction={transaction}
                        accounts={accounts}
                        isSelected={selectedTransactions.has(transaction.id)}
                        onSelect={handleSelectTransaction}
                        onUpdate={handleUpdateTransaction}
                        onCategorize={handleCategorize}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

