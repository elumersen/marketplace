import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Account, Customer, Vendor, JournalEntryStatus, TransactionType } from '@/types/api.types';
import { accountAPI, customerAPI, vendorAPI, journalEntryAPI, getErrorMessage } from '@/lib/api';
import { getPostingRule, describeRule } from '@/lib/postingRules';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface QBOTransactionFormProps {
  registerAccountId: string;
  onSuccess?: () => void;
}

// Transaction type label mapping
const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.CHECK]: 'Check',
  [TransactionType.DEPOSIT]: 'Deposit',
  [TransactionType.EXPENSE]: 'Expense',
  [TransactionType.REFUND]: 'Refund',
  [TransactionType.INVOICE]: 'Invoice',
  [TransactionType.RECEIVE_PAYMENT]: 'Receive Payment',
  [TransactionType.BILL]: 'Bill',
  [TransactionType.BILL_PAYMENT]: 'Bill Payment',
  [TransactionType.TRANSFER]: 'Transfer',
  [TransactionType.CREDIT_CARD_PAYMENT]: 'Credit Card Payment',
  [TransactionType.JOURNAL_ENTRY]: 'Journal Entry',
};

const TRANSACTION_TYPES = [
  { value: TransactionType.EXPENSE, label: TRANSACTION_TYPE_LABELS[TransactionType.EXPENSE] },
  { value: TransactionType.REFUND, label: TRANSACTION_TYPE_LABELS[TransactionType.REFUND] },
  { value: TransactionType.CHECK, label: TRANSACTION_TYPE_LABELS[TransactionType.CHECK] },
  { value: TransactionType.DEPOSIT, label: TRANSACTION_TYPE_LABELS[TransactionType.DEPOSIT] },
  { value: TransactionType.INVOICE, label: TRANSACTION_TYPE_LABELS[TransactionType.INVOICE] },
  { value: TransactionType.RECEIVE_PAYMENT, label: TRANSACTION_TYPE_LABELS[TransactionType.RECEIVE_PAYMENT] },
  { value: TransactionType.BILL, label: TRANSACTION_TYPE_LABELS[TransactionType.BILL] },
  { value: TransactionType.BILL_PAYMENT, label: TRANSACTION_TYPE_LABELS[TransactionType.BILL_PAYMENT] },
  { value: TransactionType.TRANSFER, label: TRANSACTION_TYPE_LABELS[TransactionType.TRANSFER] },
  { value: TransactionType.CREDIT_CARD_PAYMENT, label: TRANSACTION_TYPE_LABELS[TransactionType.CREDIT_CARD_PAYMENT] },
  { value: TransactionType.JOURNAL_ENTRY, label: TRANSACTION_TYPE_LABELS[TransactionType.JOURNAL_ENTRY] },
];

export const QBOTransactionForm: React.FC<QBOTransactionFormProps> = ({
  registerAccountId,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Transaction fields
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [refNo, setRefNo] = useState('');
  const [payee, setPayee] = useState('');
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [debitCredit, setDebitCredit] = useState<'debit' | 'credit'>('debit');
  const [ruleLock, setRuleLock] = useState<'debit' | 'credit' | 'both' | 'none'>('both');
  const [memo, setMemo] = useState('');

  // Autocomplete data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Autocomplete open states
  const [accountOpen, setAccountOpen] = useState(false);
  const [payeeOpen, setPayeeOpen] = useState(false);

  // Refs for fields
  const dateInputRef = useRef<HTMLInputElement>(null);
  const refNoInputRef = useRef<HTMLInputElement>(null);
  const payeeInputRef = useRef<HTMLButtonElement>(null);
  const accountInputRef = useRef<HTMLButtonElement>(null);
  const debitCreditRef = useRef<HTMLButtonElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const memoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAutocompleteData();
  }, []);

  // Recompute posting rule whenever register account, accounts, or transaction type changes
  useEffect(() => {
    if (!accounts.length) return;
    const register = accounts.find(a => a.id === registerAccountId);
    const rule = getPostingRule(register?.subType, transactionType);
    setRuleLock(rule);
    if (rule === 'debit' || rule === 'credit') {
      setDebitCredit(rule);
    }
  }, [accounts, registerAccountId, transactionType]);

  // Reset transaction type if current selection is not allowed for the register account
  useEffect(() => {
    if (!accounts.length) return;
    const register = accounts.find(a => a.id === registerAccountId);
    const rule = getPostingRule(register?.subType, transactionType);
    if (rule === 'none') {
      // Find first allowed transaction type
      const allowedType = TRANSACTION_TYPES.find((type) => {
        const typeRule = getPostingRule(register?.subType, type.value);
        return typeRule !== 'none';
      });
      if (allowedType) {
        setTransactionType(allowedType.value);
      }
    }
  }, [accounts, registerAccountId]);

  // Auto-focus on date field when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (dateInputRef.current) {
        dateInputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const loadAutocompleteData = async () => {
    try {
      const [accountsResponse, customersResponse, vendorsResponse] = await Promise.all([
        accountAPI.getAll({ isActive: true, all: 'true' }),
        customerAPI.getAll(),
        vendorAPI.getAll(),
      ]);
      setAccounts(accountsResponse.data || []);
      setCustomers(customersResponse.data || []);
      setVendors(vendorsResponse.data || []);
    } catch (error) {
      console.error('Failed to load autocomplete data:', error);
    }
  };

  const getFilteredPayees = (query: string) => {
    const allPayees = [
      ...customers.map(c => ({ type: 'Customer', name: c.name })),
      ...vendors.map(v => ({ type: 'Vendor', name: v.name })),
    ];
    
    if (!query) {
      return allPayees.slice(0, 10);
    }
    
    const lowerQuery = query.toLowerCase();
    return allPayees.filter(p => p.name.toLowerCase().includes(lowerQuery)).slice(0, 10);
  };

  const handleSave = async () => {
    // Validate required fields
    if (!accountId || !amount || amount <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in account and amount fields",
      });
      return;
    }

    // Prevent selecting the same account as the register account
    if (accountId === registerAccountId) {
      toast({
        variant: "destructive",
        title: "Invalid Account",
        description: "Cannot select the same account as the register account",
      });
      return;
    }

    // Enforce rule
    if (ruleLock === 'none') {
      toast({
        variant: "destructive",
        title: "Not Allowed",
        description: describeRule(ruleLock),
      });
      return;
    }
    if (ruleLock === 'debit' || ruleLock === 'credit') {
      // Lock side to rule
      if (debitCredit !== ruleLock) setDebitCredit(ruleLock);
    }

    setLoading(true);
    try {
      const amountValue = Number(amount);
      const regSide = ruleLock === 'both' ? debitCredit : ruleLock;
      let lines;
      if (regSide === 'debit') {
        lines = [
          {
            accountId: registerAccountId,
            description: memo,
            debit: amountValue,
            credit: 0,
          },
          {
            accountId: accountId,
            description: memo,
            debit: 0,
            credit: amountValue,
          }
        ];
      } else {
        // credit
        lines = [
          {
            accountId: registerAccountId,
            description: memo,
            debit: 0,
            credit: amountValue,
          },
          {
            accountId: accountId,
            description: memo,
            debit: amountValue,
            credit: 0,
          }
        ];
      }

      const data = {
        entryDate,
        description: memo,
        status: 'POSTED' as JournalEntryStatus,
        transactionType: transactionType,
        payee: payee,
        entryNumber: refNo || undefined,
        lines,
      };

      await journalEntryAPI.create(data);
      
      toast({
        title: "Success",
        description: "Transaction created successfully",
      });

      resetForm();
      onSuccess?.();
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
    setEntryDate(new Date().toISOString().split('T')[0]);
    setRefNo('');
    setPayee('');
    setAccountId('');
    setAmount('');
    setDebitCredit('debit');
    setMemo('');
    
    setTimeout(() => {
      if (dateInputRef.current) {
        dateInputRef.current.focus();
      }
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentField: string) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault();
      
      if (currentField === 'memo') {
        handleSave();
        return;
      }

      // Move to next field or save
      const fieldSequence = ['date', 'refNo', 'payee', 'account', 'amount', 'memo'];
      const currentIndex = fieldSequence.indexOf(currentField);
      const nextField = fieldSequence[currentIndex + 1];
      
      if (nextField === 'refNo' && refNoInputRef.current) {
        refNoInputRef.current.focus();
        refNoInputRef.current.select();
      } else if (nextField === 'payee') {
        setPayeeOpen(true);
        if (payeeInputRef.current) {
          setTimeout(() => payeeInputRef.current?.click(), 100);
        }
      } else if (nextField === 'account') {
        setAccountOpen(true);
        if (accountInputRef.current) {
          setTimeout(() => accountInputRef.current?.click(), 100);
        }
      } else if (nextField === 'amount' && amountInputRef.current) {
        amountInputRef.current.focus();
        amountInputRef.current.select();
      } else if (nextField === 'memo' && memoInputRef.current) {
        memoInputRef.current.focus();
        memoInputRef.current.select();
      } else if (!nextField) {
        handleSave();
      }
    }
  };

  const toggleDebitCredit = () => {
    if (ruleLock !== 'both') return; // locked
    setDebitCredit(prev => prev === 'debit' ? 'credit' : 'debit');
  };

  const selectedAccount = accounts.find(acc => acc.id === accountId);
  const registerAccount = accounts.find(acc => acc.id === registerAccountId);

  // Filter transaction types based on posting rules for the register account
  // If register account is not loaded yet, show all types temporarily
  const allowedTransactionTypes = registerAccount
    ? TRANSACTION_TYPES.filter((type) => {
        const rule = getPostingRule(registerAccount.subType, type.value);
        return rule !== 'none';
      })
    : TRANSACTION_TYPES;

  // Don't show form if there are no allowed transaction types (and register account is loaded)
  if (registerAccount && allowedTransactionTypes.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg mb-2">
      {/* New Transaction Header */}
      <div className="px-3 py-2 bg-blue-100 border-b border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-900">Add Transaction</span>
            <Select 
              value={transactionType} 
              onValueChange={(value) => setTransactionType(value as TransactionType)} 
              disabled={loading}
            >
              <SelectTrigger className="h-8 w-40 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedTransactionTypes.map((type) => {
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetForm}
            className="h-6 px-2 text-xs"
            disabled={loading}
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        </div>
      </div>

      {/* Transaction Entry Row */}
      <div className="flex flex-wrap gap-2 p-3 items-center">
        {/* Date */}
        <div className="w-36 flex-none">
          <Input
            ref={dateInputRef}
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="h-9 text-sm"
            onKeyDown={(e) => handleKeyDown(e, 'date')}
            disabled={loading}
          />
        </div>

        {/* Ref No */}
        <div className="w-20 flex-none">
          <Input
            ref={refNoInputRef}
            value={refNo}
            onChange={(e) => setRefNo(e.target.value)}
            placeholder="Ref No"
            className="h-9 text-sm"
            onKeyDown={(e) => handleKeyDown(e, 'refNo')}
            disabled={loading}
          />
        </div>

        {/* Payee */}
        <div className="flex-1 min-w-0">
          <Popover open={payeeOpen} onOpenChange={setPayeeOpen}>
            <PopoverTrigger asChild>
              <Button
                ref={payeeInputRef}
                variant="outline"
                role="combobox"
                className={cn(
                  "w-full h-9 justify-start text-sm font-normal",
                  !payee && "text-muted-foreground"
                )}
                disabled={loading}
              >
                {payee || "Customer/Vendor"}
                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[20rem] p-0" align="start">
              <Command>
                <CommandInput 
                  placeholder="Search customer/vendor..." 
                  value={payee}
                  onValueChange={setPayee}
                />
                <CommandList>
                  <CommandEmpty>No customer/vendor found.</CommandEmpty>
                  <CommandGroup>
                    {getFilteredPayees(payee).map((p, idx) => (
                      <CommandItem
                        key={`${p.type}-${p.name}-${idx}`}
                        value={p.name}
                        onSelect={() => {
                          setPayee(p.name);
                          setPayeeOpen(false);
                          setTimeout(() => {
                            if (accountInputRef.current) {
                              accountInputRef.current.click();
                            }
                          }, 50);
                        }}
                      >
                        <Check className="mr-2 h-4 w-4 opacity-0 data-[selected=true]:opacity-100" />
                        <span>{p.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{p.type}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Account */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <Popover open={accountOpen} onOpenChange={setAccountOpen}>
            <PopoverTrigger asChild>
              <Button
                ref={accountInputRef}
                variant="outline"
                role="combobox"
                className={cn(
                  "w-full h-9 justify-start text-sm font-normal",
                  !accountId && "text-muted-foreground"
                )}
                disabled={loading}
              >
                {selectedAccount ? `${selectedAccount.code} - ${selectedAccount.name}` : "Account"}
                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[30rem] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search account..." />
                <CommandList>
                  <CommandEmpty>No account found.</CommandEmpty>
                  <CommandGroup>
                    {accounts
                      .filter((account) => account.id !== registerAccountId)
                      .map((account) => (
                        <CommandItem
                          key={account.id}
                          value={account.id}
                          onSelect={() => {
                            setAccountId(account.id);
                            setAccountOpen(false);
                            setTimeout(() => {
                              if (amountInputRef.current) {
                                amountInputRef.current.focus();
                                amountInputRef.current.select();
                              }
                            }, 50);
                          }}
                        >
                          <Check className="mr-2 h-4 w-4 opacity-0 data-[selected=true]:opacity-100" />
                          <span className="font-mono text-xs">{account.code}</span>
                          <span className="ml-2 text-sm">{account.name}</span>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Debit/Credit Toggle */}
        <div className="w-18 flex-none">
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} style={{ display: 'inline-block' }}>
                <Button
                  ref={debitCreditRef}
                  variant={debitCredit === 'debit' ? 'destructive' : 'default'}
                  onClick={toggleDebitCredit}
                  className="h-9 w-full"
                  disabled={loading || ruleLock !== 'both'}
                  tabIndex={-1}
                >
                  {debitCredit === 'debit' ? 'Debit' : 'Credit'}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {describeRule(ruleLock)}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Amount */}
        <div className="w-28 flex-none">
          <Input
            ref={amountInputRef}
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value ? parseFloat(e.target.value) : '')}
            placeholder="0.00"
            className="h-9 text-sm"
            onKeyDown={(e) => handleKeyDown(e, 'amount')}
            disabled={loading}
          />
        </div>

        {/* Memo */}
        <div className="flex-1 min-w-0">
          <Input
            ref={memoInputRef}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Memo"
            className="h-9 text-sm"
            onKeyDown={(e) => handleKeyDown(e, 'memo')}
            disabled={loading}
          />
        </div>

        {/* Save Button */}
        <div className="w-20 flex-none">
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || ruleLock === 'none'}
            className="h-9 w-full"
            size="sm"
          >
            {loading ? '...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
};
