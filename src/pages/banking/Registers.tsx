import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DatePicker } from '@/components/ui/date-picker';
import { Spinner } from '@/components/ui/spinner';
import { format } from 'date-fns';
import { accountAPI, transactionAPI } from '@/lib/api';
import type { Account, AccountRegister, RegisterTransaction } from '@/types/api.types';
import { QBOTransactionForm } from '@/components/banking/QBOTransactionForm';

export const Registers = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [register, setRegister] = useState<AccountRegister | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Load accounts on component mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // Load register when account changes
  useEffect(() => {
    if (selectedAccount) {
      loadRegister(selectedAccount.id);
    }
  }, [selectedAccount, startDate, endDate]);

  // Set selected account from URL params
  useEffect(() => {
    if (accountId && accounts.length > 0) {
      const account = accounts.find(acc => acc.id === accountId);
      if (account) {
        setSelectedAccount(account);
      }
    }
  }, [accountId, accounts]);

  const loadAccounts = async () => {
    try {
      const response = await accountAPI.getAll( { all: 'true', isActive: true });
      setAccounts(response.data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadRegister = async (accountId: string) => {
    setLoading(true);
    try {
      const params: { startDate?: string; endDate?: string } = {};
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();
      
      const registerData = await transactionAPI.getAccountRegister(accountId, params);
      setRegister(registerData);
    } catch (error) {
      console.error('Failed to load register:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountChange = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
      setSelectedAccount(account);
      navigate(`/registers/${accountId}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const dateOnly = dateString.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, 'MM/dd/yyyy');
  };

  const getTransactionTypeDisplay = (transaction: RegisterTransaction) => {
    const typeMap: Record<string, string> = {
      'CHECK': 'Check',
      'DEPOSIT': 'Deposit',
      'EXPENSE': 'Expense',
      'REFUND': 'Refund',
      'INVOICE': 'Invoice',
      'RECEIVE_PAYMENT': 'Receive Payment',
      'BILL': 'Bill',
      'BILL_PAYMENT': 'Bill Payment',
      'TRANSFER': 'Transfer',
      'CREDIT_CARD_PAYMENT': 'Credit Card Payment',
      'JOURNAL_ENTRY': 'Journal Entry',
    };
    
    return typeMap[transaction.type] || transaction.type;
  };

  const getPayeeDisplay = (transaction: RegisterTransaction) => {
    if (transaction.payee) {
      return transaction.payee;
    }
    if (transaction.journalEntry?.createdByUser) {
      const user = transaction.journalEntry.createdByUser;
      return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    }
    return '-';
  };

  const getAccountNameDisplay = (transaction: RegisterTransaction) => {
    // Use pairedAccount if available (from journal entries or expense account)
    if (transaction.pairedAccount) {
      return transaction.pairedAccount;
    }
    return '-';
  };

  const getReconciliationStatus = (transaction: RegisterTransaction) => {
    return transaction.isReconciled ? 'Reconciled' : 'Unreconciled';
  };

  const getReconciliationColor = (transaction: RegisterTransaction) => {
    return transaction.isReconciled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // Show loading state while accounts are being loaded
  if (accounts.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Account Registers</h1>
          <div className="flex items-center gap-2 mt-4">
            <Spinner size="sm" />
            <p className="text-muted-foreground">Loading accounts...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show account selection only if no accountId in URL and accounts are loaded
  if (!accountId) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Account Registers</h1>
          <p className="text-muted-foreground">Select an account to view its register</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Select Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Select onValueChange={handleAccountChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an account to view register" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.code} - {account.name}{account.subType ? ` (${account.subType})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state while register is being loaded
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Account Register</h1>
          <p className="text-muted-foreground">
            {selectedAccount?.code} - {selectedAccount?.name}
          </p>
          <div className="flex items-center gap-2 mt-4">
            <Spinner size="sm" />
            <p className="text-muted-foreground">Loading register...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Account Register</h1>
            {selectedAccount && (
              <p className="text-muted-foreground">
                {selectedAccount.code} - {selectedAccount.name} {selectedAccount.subType ? `(${selectedAccount.subType})` : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 py-4">
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="account-select">Account</Label>
              <Select value={selectedAccount?.id || ''} onValueChange={handleAccountChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {/* {account.code} - {account.name}{account.subType ? ` (${account.subType})` : ''} */}
                      {account.code} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Start Date</Label>
              <DatePicker
                date={startDate}
                setDate={setStartDate}
                className="w-full"
              />
            </div>
            
            <div>
              <Label>End Date</Label>
              <DatePicker
                date={endDate}
                setDate={setEndDate}
                className="w-full"
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QBO Transaction Form */}
      {selectedAccount && (
        <QBOTransactionForm
          registerAccountId={selectedAccount.id}
          onSuccess={() => {
            if (selectedAccount) {
              loadRegister(selectedAccount.id);
            }
          }}
        />
      )}

      {/* Register Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transaction Register</CardTitle>
            {register && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(register.currentBalance)}</p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : register ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Customer/Vendor</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {register.transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No transactions found for the selected period
                      </TableCell>
                    </TableRow>
                  ) : (
                    register.transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{formatDate(transaction.transactionDate)}</TableCell>
                        <TableCell>{getTransactionTypeDisplay(transaction)}</TableCell>
                        <TableCell>{getPayeeDisplay(transaction)}</TableCell>
                        <TableCell>{getAccountNameDisplay(transaction)}</TableCell>
                        <TableCell className="text-right">
                          {transaction.debitAmount > 0 ? formatCurrency(transaction.debitAmount) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.creditAmount > 0 ? formatCurrency(transaction.creditAmount) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(transaction.runningBalance)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getReconciliationColor(transaction)}>
                            {getReconciliationStatus(transaction)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Select an account to view its register
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

