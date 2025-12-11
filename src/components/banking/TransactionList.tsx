import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { TransactionForm } from './TransactionForm';
import { transactionAPI, bankAccountAPI, getErrorMessage } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2 } from 'lucide-react';
import type { Transaction, BankAccount, TransactionType } from '@/types/api.types';
import { format } from 'date-fns';

export const TransactionList = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [refreshSignal, setRefreshSignal] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadBankAccounts();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [selectedBankAccount, selectedType, startDate, endDate, refreshSignal]);

  const loadBankAccounts = async () => {
    try {
      const accounts = await bankAccountAPI.getAll();
      setBankAccounts(accounts);
    } catch (error) {
      console.error('Failed to load bank accounts:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (selectedBankAccount !== 'all') {
        params.bankAccountId = selectedBankAccount;
      }
      
      if (selectedType !== 'all') {
        params.type = selectedType;
      }
      
      if (startDate) {
        params.startDate = format(startDate, 'yyyy-MM-dd');
      }
      
      if (endDate) {
        params.endDate = format(endDate, 'yyyy-MM-dd');
      }

      const response = await transactionAPI.getAll(params);
      // Backend returns { transactions: Transaction[] }
      setTransactions(response.transactions);
    } catch (error) {
      const message = getErrorMessage(error);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return transactions;
    const lower = searchTerm.toLowerCase();
    return transactions.filter((t) => {
      const description = t.description?.toLowerCase() || '';
      const payee = t.payee?.toLowerCase() || '';
      const refNumber = t.referenceNumber?.toLowerCase() || '';
      return description.includes(lower) || payee.includes(lower) || refNumber.includes(lower);
    });
  }, [transactions, searchTerm]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  const getTypeBadgeVariant = (type: TransactionType) => {
    switch (type) {
      case 'DEPOSIT':
      case 'RECEIVE_PAYMENT':
        return 'default';
      case 'EXPENSE':
      case 'BILL_PAYMENT':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const handleTransactionCreated = () => {
    setRefreshSignal((prev) => prev + 1);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transactions</CardTitle>
            <TransactionForm onTransactionCreated={handleTransactionCreated} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                <SelectTrigger>
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
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="DEPOSIT">Deposit</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                  <SelectItem value="BILL_PAYMENT">Bill Payment</SelectItem>
                  <SelectItem value="RECEIVE_PAYMENT">Receive Payment</SelectItem>
                </SelectContent>
              </Select>
              <DatePicker
                date={startDate}
                setDate={(date) => setStartDate(date ?? undefined)}
                className="w-full"
              />
              <DatePicker
                date={endDate}
                setDate={(date) => setEndDate(date ?? undefined)}
                className="w-full"
              />
            </div>

            {/* Transactions Table */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Payee</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {format(new Date(transaction.transactionDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTypeBadgeVariant(transaction.type)}>
                            {transaction.type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.description || '-'}</TableCell>
                        <TableCell>{transaction.payee || '-'}</TableCell>
                        <TableCell>{transaction.bankAccount?.name || '-'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell>{transaction.referenceNumber || '-'}</TableCell>
                        <TableCell>
                          {transaction.isReconciled ? (
                            <Badge variant="outline" className="bg-green-50">
                              Reconciled
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Unreconciled</Badge>
                          )}
                        </TableCell>
                      </TableRow>
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

