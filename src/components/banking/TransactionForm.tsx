import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { Plus, Loader2 } from 'lucide-react';
import { transactionAPI, bankAccountAPI, accountAPI, getErrorMessage } from '@/lib/api';
import type { TransactionType, BankAccount, CreateTransactionData, Account } from '@/types/api.types';
import { useToast } from '@/hooks/use-toast';

interface TransactionFormProps {
  accountId?: string;
  onTransactionCreated?: () => void;
  trigger?: React.ReactNode;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  accountId,
  onTransactionCreated,
  trigger
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  const [formData, setFormData] = useState<CreateTransactionData>({
    bankAccountId: '',
    transactionDate: new Date().toISOString().split('T')[0],
    type: 'DEPOSIT' as TransactionType,
    amount: 0,
    description: '',
    payee: '',
    referenceNumber: '',
    checkNumber: '',
    expenseAccountId: '',
    toBankAccountId: '',
    invoiceId: '',
    billId: '',
  });

  useEffect(() => {
    loadBankAccounts();
    loadAccounts();
  }, []);

  // Sync selectedDate with formData.transactionDate
  useEffect(() => {
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        transactionDate: selectedDate.toISOString().split('T')[0]
      }));
    }
  }, [selectedDate]);

  const loadBankAccounts = async () => {
    try {
      const accounts = await bankAccountAPI.getAll();
      setBankAccounts(accounts);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: getErrorMessage(error),
      });
      console.error('Error loading bank accounts:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await accountAPI.getAll();
      setAccounts(response.data || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await transactionAPI.create(formData);
      toast({
        variant: "success",
        title: "Success",
        description: "Transaction created successfully",
      });
      setOpen(false);
      resetForm();
      onTransactionCreated?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    const today = new Date();
    setSelectedDate(today);
    setFormData({
      bankAccountId: accountId || '',
      transactionDate: today.toISOString().split('T')[0],
      type: 'DEPOSIT' as TransactionType,
      amount: 0,
      description: '',
      payee: '',
      referenceNumber: '',
      checkNumber: '',
      expenseAccountId: '',
      toBankAccountId: '',
      invoiceId: '',
      billId: '',
    });
  };

  const handleInputChange = (field: keyof CreateTransactionData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const defaultTrigger = (
    <Button size="sm">
      <Plus className="h-4 w-4 mr-2" />
      New Transaction
    </Button>
  );

  const showCheckNumber = formData.type === 'CHECK' || formData.type === 'BILL_PAYMENT';
  const showExpenseAccount = formData.type === 'EXPENSE' || formData.type === 'CHECK';
  const showToBankAccount = formData.type === 'TRANSFER' || formData.type === 'CREDIT_CARD_PAYMENT';

  // Reset form when dialog closes
  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Transaction</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankAccountId">Bank Account <span className="text-red-500">*</span></Label>
              <Select
                value={formData.bankAccountId}
                onValueChange={(value) => handleInputChange('bankAccountId', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No bank accounts available</div>
                  ) : (
                    bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.accountNumber})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transactionDate">Date <span className="text-red-500">*</span></Label>
              <DatePicker
                date={selectedDate}
                setDate={setSelectedDate}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Transaction Type <span className="text-red-500">*</span></Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleInputChange('type', value as TransactionType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select transaction type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="REFUND">Refund</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="DEPOSIT">Deposit</SelectItem>
                  <SelectItem value="INVOICE">Invoice</SelectItem>
                  <SelectItem value="RECEIVE_PAYMENT">Receive Payment</SelectItem>
                  <SelectItem value="BILL">Bill</SelectItem>
                  <SelectItem value="BILL_PAYMENT">Bill Payment</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                  <SelectItem value="CREDIT_CARD_PAYMENT">Credit Card Payment</SelectItem>
                  <SelectItem value="JOURNAL_ENTRY">Journal Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount <span className="text-red-500">*</span></Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount || ''}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                required
                className="w-full"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payee">Payee/Vendor/Customer</Label>
            <Input
              id="payee"
              value={formData.payee}
              onChange={(e) => handleInputChange('payee', e.target.value)}
              placeholder="Enter payee name"
              className="w-full"
            />
          </div>

          {showCheckNumber && (
            <div className="space-y-2">
              <Label htmlFor="checkNumber">Check Number</Label>
              <Input
                id="checkNumber"
                value={formData.checkNumber}
                onChange={(e) => handleInputChange('checkNumber', e.target.value)}
                placeholder="Enter check number"
                className="w-full"
              />
            </div>
          )}

          {showExpenseAccount && (
            <div className="space-y-2">
              <Label htmlFor="expenseAccountId">Expense Account</Label>
              <Select
                value={formData.expenseAccountId}
                onValueChange={(value) => handleInputChange('expenseAccountId', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select expense account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter(acc => acc.type === 'Expense').length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No expense accounts available</div>
                  ) : (
                    accounts.filter(acc => acc.type === 'Expense').map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {showToBankAccount && (
            <div className="space-y-2">
              <Label htmlFor="toBankAccountId">To Bank Account</Label>
              <Select
                value={formData.toBankAccountId}
                onValueChange={(value) => handleInputChange('toBankAccountId', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No bank accounts available</div>
                  ) : (
                    bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.accountNumber})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter transaction description"
              rows={3}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="referenceNumber">Reference Number</Label>
            <Input
              id="referenceNumber"
              value={formData.referenceNumber}
              onChange={(e) => handleInputChange('referenceNumber', e.target.value)}
              placeholder="Enter reference number"
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Transaction'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
