import { useState } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoreVertical, Edit2, Tag, X, Check, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Transaction, TransactionType, BankAccount } from '@/types/api.types';
import { TransactionType as TransactionTypeEnum } from '@/types/api.types';
import { cn } from '@/lib/utils';

interface SmartTransactionRowProps {
  transaction: Transaction;
  bankAccounts: BankAccount[];
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onUpdate?: (id: string, updates: Partial<Transaction>) => void;
  onCategorize?: (id: string, type: TransactionType, accountId?: string) => void;
  showCheckbox?: boolean;
}

const TRANSACTION_TYPE_OPTIONS: { value: TransactionType; label: string; color: string }[] = [
  { value: TransactionTypeEnum.EXPENSE, label: 'Expense', color: 'destructive' },
  { value: TransactionTypeEnum.DEPOSIT, label: 'Deposit', color: 'default' },
  { value: TransactionTypeEnum.TRANSFER, label: 'Transfer', color: 'secondary' },
  { value: TransactionTypeEnum.BILL_PAYMENT, label: 'Bill Payment', color: 'destructive' },
  { value: TransactionTypeEnum.RECEIVE_PAYMENT, label: 'Receive Payment', color: 'default' },
  { value: TransactionTypeEnum.CHECK, label: 'Check', color: 'secondary' },
];

export const SmartTransactionRow = ({
  transaction,
  bankAccounts,
  isSelected,
  onSelect,
  onUpdate,
  onCategorize,
  showCheckbox = true,
}: SmartTransactionRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState(transaction.description || '');
  const [editPayee, setEditPayee] = useState(transaction.payee || '');
  const [editType, setEditType] = useState<TransactionType>(transaction.type);
  const [categorizeOpen, setCategorizeOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('');

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

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(transaction.id, {
        description: editDescription,
        payee: editPayee,
        type: editType,
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditDescription(transaction.description || '');
    setEditPayee(transaction.payee || '');
    setEditType(transaction.type);
    setIsEditing(false);
  };

  const handleQuickCategorize = (type: TransactionType) => {
    if (onCategorize) {
      onCategorize(transaction.id, type);
    }
    setCategorizeOpen(false);
    setDropdownOpen(false);
  };

  const handleCategorize = () => {
    if (onCategorize) {
      // Only require account for certain types
      if ((editType === TransactionTypeEnum.EXPENSE || editType === TransactionTypeEnum.TRANSFER) && !selectedAccount) {
        return; // Don't close if account is required but not selected
      }
      onCategorize(transaction.id, editType, selectedAccount || undefined);
    }
    setCategorizeOpen(false);
    setDropdownOpen(false);
  };

  const isUncategorized = !transaction.type || transaction.type === TransactionTypeEnum.JOURNAL_ENTRY;
  const needsAttention = isUncategorized || !transaction.isReconciled;

  return (
    <TableRow
      className={cn(
        'group hover:bg-muted/50 transition-colors',
        isSelected && 'bg-muted',
        needsAttention && 'border-l-4 border-l-orange-500'
      )}
    >
      {showCheckbox && (
        <TableCell className="w-12">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(transaction.id, checked as boolean)}
          />
        </TableCell>
      )}
      <TableCell className="font-medium">
        {format(new Date(transaction.transactionDate), 'MMM dd, yyyy')}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Select value={editType} onValueChange={(value) => setEditType(value as TransactionType)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSACTION_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant={getTypeBadgeVariant(transaction.type)}>
            {transaction.type.replace('_', ' ')}
          </Badge>
        )}
      </TableCell>
      <TableCell className="max-w-xs">
        {isEditing ? (
          <Input
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="h-8"
            placeholder="Description"
          />
        ) : (
          <div className="flex items-center gap-2">
            <span className="truncate">{transaction.description || '-'}</span>
            {isUncategorized && (
              <AlertCircle className="h-3 w-3 text-orange-500 flex-shrink-0" />
            )}
          </div>
        )}
      </TableCell>
      <TableCell className="max-w-xs">
        {isEditing ? (
          <Input
            value={editPayee}
            onChange={(e) => setEditPayee(e.target.value)}
            className="h-8"
            placeholder="Payee"
          />
        ) : (
          <span className="truncate">{transaction.payee || '-'}</span>
        )}
      </TableCell>
      <TableCell>{transaction.bankAccount?.name || '-'}</TableCell>
      <TableCell className={cn(
        'text-right font-medium',
        transaction.type === 'DEPOSIT' || transaction.type === 'RECEIVE_PAYMENT'
          ? 'text-green-600'
          : 'text-red-600'
      )}>
        {formatCurrency(transaction.amount)}
      </TableCell>
      <TableCell className="w-32 max-w-32">
        {transaction.referenceNumber && transaction.referenceNumber.length > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate block cursor-help">{transaction.referenceNumber}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs break-words">{transaction.referenceNumber}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span>-</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {transaction.isReconciled ? (
            <Badge variant="outline" className="bg-green-50">
              Reconciled
            </Badge>
          ) : (
            <Badge variant="secondary">Unreconciled</Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isEditing ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSave}
                className="h-7 w-7 p-0"
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                className="h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <DropdownMenu 
              open={dropdownOpen || categorizeOpen} 
              onOpenChange={(open) => {
                if (!categorizeOpen) {
                  setDropdownOpen(open);
                }
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <Popover open={categorizeOpen} onOpenChange={(open) => {
                  setCategorizeOpen(open);
                  if (!open) {
                    setDropdownOpen(false);
                  }
                }} modal={false}>
                  <PopoverTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Tag className="mr-2 h-4 w-4" />
                      Categorize
                    </DropdownMenuItem>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-80" 
                    align="end"
                    sideOffset={5}
                    onPointerDownOutside={(e) => {
                      // Prevent closing when clicking inside the dropdown
                      const target = e.target as HTMLElement;
                      if (target.closest('[role="menu"]')) {
                        e.preventDefault();
                      }
                    }}
                    onInteractOutside={(e) => {
                      // Prevent closing when interacting with the dropdown
                      const target = e.target as HTMLElement;
                      if (target.closest('[role="menu"]')) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-semibold">Quick Categories</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {TRANSACTION_TYPE_OPTIONS.slice(0, 4).map((opt) => (
                            <Button
                              key={opt.value}
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuickCategorize(opt.value)}
                              className="justify-start"
                            >
                              {opt.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={editType} onValueChange={(value) => setEditType(value as TransactionType)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TRANSACTION_TYPE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {(editType === 'EXPENSE' || editType === 'TRANSFER') && (
                        <div className="space-y-2">
                          <Label>Account</Label>
                          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {bankAccounts
                                .filter((ba) => ba.isActive)
                                .map((ba) => (
                                  <SelectItem key={ba.id} value={ba.id}>
                                    {ba.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <Button 
                        onClick={handleCategorize} 
                        className="w-full" 
                        disabled={(editType === TransactionTypeEnum.EXPENSE || editType === TransactionTypeEnum.TRANSFER) && !selectedAccount}
                      >
                        <Tag className="mr-2 h-4 w-4" />
                        Apply Category
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

