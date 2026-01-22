import { useState, useEffect } from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  MoreVertical,
  Tag,
  AlertCircle,
  Check,
  Link2,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import type { Transaction, TransactionType, Account } from "@/types/api.types";
import {
  TransactionType as TransactionTypeEnum,
  AccountType,
} from "@/types/api.types";
import { transactionAPI, getErrorMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SmartTransactionRowProps {
  transaction: Transaction;
  accounts?: Account[]; // Chart of Accounts accounts (expense/income)
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onUpdate?: (id: string, updates: Partial<Transaction>) => void;
  onCategorize?: (
    id: string,
    type: TransactionType,
    accountId?: string
  ) => void;
  onMatch?: () => void; // Callback when a match is accepted
  showCheckbox?: boolean;
}

export const SmartTransactionRow = ({
  transaction,
  accounts = [],
  isSelected,
  onSelect,
  onUpdate,
  onCategorize,
  onMatch,
  showCheckbox = true,
}: SmartTransactionRowProps) => {
  const { toast } = useToast();
  const [categorizeOpen, setCategorizeOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [categorizePayee, setCategorizePayee] = useState(
    transaction.payee || ""
  );
  const [accountSelectOpen, setAccountSelectOpen] = useState(false);
  const [matchesOpen, setMatchesOpen] = useState(false);
  const [potentialMatches, setPotentialMatches] = useState<Transaction[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Determine transaction type based on amount if not set
  // Negative amounts are expenses, positive are deposits
  const inferredType =
    transaction.type ||
    (transaction.amount < 0
      ? TransactionTypeEnum.EXPENSE
      : TransactionTypeEnum.DEPOSIT);

  // Reset categorize form when popover opens
  useEffect(() => {
    if (categorizeOpen) {
      setCategorizePayee(transaction.payee || "");
      setSelectedAccount("");
    }
  }, [categorizeOpen, transaction.payee]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  const getTypeBadgeVariant = (type: TransactionType) => {
    switch (type) {
      case "DEPOSIT":
      case "RECEIVE_PAYMENT":
        return "default";
      case "EXPENSE":
      case "BILL_PAYMENT":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const handleCategorize = () => {
    if (onCategorize) {
      const typeToUse = transaction.type || inferredType;
      // Require account for expense, deposit, and receive payment types
      if (
        (typeToUse === TransactionTypeEnum.EXPENSE ||
          typeToUse === TransactionTypeEnum.DEPOSIT ||
          typeToUse === TransactionTypeEnum.RECEIVE_PAYMENT) &&
        !selectedAccount
      ) {
        return; // Don't close if account is required but not selected
      }

      // Update payee if changed
      if (categorizePayee !== transaction.payee && onUpdate) {
        onUpdate(transaction.id, { payee: categorizePayee });
      }

      onCategorize(transaction.id, typeToUse, selectedAccount || undefined);
    }
    setCategorizeOpen(false);
    setDropdownOpen(false);
  };

  const isUncategorized =
    (transaction.type === TransactionTypeEnum.EXPENSE &&
      !transaction.expenseAccountId) ||
    ((transaction.type === TransactionTypeEnum.DEPOSIT ||
      transaction.type === TransactionTypeEnum.RECEIVE_PAYMENT) &&
      !transaction.incomeAccountId) ||
    !transaction.type ||
    transaction.type === TransactionTypeEnum.JOURNAL_ENTRY;
  const needsAttention = isUncategorized || !transaction.isReconciled;

  // Get available accounts based on transaction type
  const availableAccounts = accounts.filter((acc) => {
    if (!acc.isActive) return false;
    // For expenses, show expense accounts
    if (inferredType === TransactionTypeEnum.EXPENSE) {
      return (
        acc.type === AccountType.Expense ||
        acc.type === AccountType.Other_Expense ||
        acc.type === AccountType.Cost_of_Goods_Sold
      );
    }
    // For deposits/receive payments, show income accounts
    if (
      inferredType === TransactionTypeEnum.DEPOSIT ||
      inferredType === TransactionTypeEnum.RECEIVE_PAYMENT
    ) {
      return (
        acc.type === AccountType.Income || acc.type === AccountType.Other_Income
      );
    }
    return false;
  });

  // Get current account ID
  const currentAccountId =
    transaction.type === TransactionTypeEnum.EXPENSE
      ? transaction.expenseAccountId
      : transaction.type === TransactionTypeEnum.DEPOSIT ||
        transaction.type === TransactionTypeEnum.RECEIVE_PAYMENT
      ? transaction.incomeAccountId
      : null;

  // Handle account selection
  const handleAccountSelect = async (accountId: string) => {
    if (onCategorize) {
      const typeToUse = transaction.type || inferredType;
      await onCategorize(transaction.id, typeToUse, accountId);
    }
    setAccountSelectOpen(false);
  };

  // Check if transaction is from bank feed (has Plaid referenceNumber)
  // Plaid transaction IDs are typically 20+ character alphanumeric strings
  const isFromBankFeed =
    transaction.referenceNumber &&
    transaction.referenceNumber.length >= 20 &&
    /^[a-zA-Z0-9_-]+$/.test(transaction.referenceNumber);

  // Load potential matches
  const loadMatches = async () => {
    setLoadingMatches(true);
    try {
      const response = await transactionAPI.findMatches(transaction.id);
      setPotentialMatches(response.matches);
      setMatchesOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoadingMatches(false);
    }
  };

  // Accept a match
  const handleAcceptMatch = async (manualTransactionId: string) => {
    try {
      await transactionAPI.acceptMatch(transaction.id, manualTransactionId);
      toast({
        title: "Success",
        description: "Transactions matched successfully",
      });
      setMatchesOpen(false);
      setPotentialMatches([]);
      onMatch?.(); // Notify parent to refresh
    } catch (error: any) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  return (
    <TableRow
      className={cn(
        "group hover:bg-muted/50 transition-colors",
        isSelected && "bg-muted",
        needsAttention && "border-l-4 border-l-orange-500"
      )}
    >
      {showCheckbox && (
        <TableCell className="w-12">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) =>
              onSelect(transaction.id, checked as boolean)
            }
          />
        </TableCell>
      )}
      <TableCell className="font-medium whitespace-nowrap">
        {format(new Date(transaction.transactionDate), "MMM dd, yyyy")}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <Badge variant={getTypeBadgeVariant(transaction.type)}>
          {transaction.type.replace("_", " ")}
        </Badge>
      </TableCell>
      <TableCell className="w-32 max-w-32">
        <div className="flex items-center gap-2">
          {transaction.description && transaction.description.length > 0 ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="truncate block cursor-help">
                    {transaction.description}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs break-words">
                    {transaction.description}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span>-</span>
          )}
          {isUncategorized && (
            <AlertCircle className="h-3 w-3 text-orange-500 flex-shrink-0" />
          )}
          {potentialMatches.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link2 className="h-3 w-3 text-blue-500 flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {potentialMatches.length} potential match
                    {potentialMatches.length !== 1 ? "es" : ""} found
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      <TableCell className="w-32 max-w-32">
        {transaction.payee && transaction.payee.length > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate block cursor-help">
                  {transaction.payee}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs break-words">{transaction.payee}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span>-</span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {transaction.bankAccount?.name || "-"}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {inferredType === TransactionTypeEnum.EXPENSE ||
        inferredType === TransactionTypeEnum.DEPOSIT ||
        inferredType === TransactionTypeEnum.RECEIVE_PAYMENT ? (
          <Popover open={accountSelectOpen} onOpenChange={setAccountSelectOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "text-sm text-left w-full hover:bg-muted/50 rounded px-2 py-1 transition-colors cursor-pointer",
                  isUncategorized && "text-muted-foreground italic",
                  !isUncategorized && "font-medium"
                )}
              >
                {transaction.type === TransactionTypeEnum.EXPENSE ? (
                  transaction.expenseAccount ? (
                    <span>
                      {transaction.expenseAccount.code} -{" "}
                      {transaction.expenseAccount.name}
                    </span>
                  ) : (
                    <span>Uncategorized</span>
                  )
                ) : transaction.type === TransactionTypeEnum.DEPOSIT ||
                  transaction.type === TransactionTypeEnum.RECEIVE_PAYMENT ? (
                  transaction.incomeAccount ? (
                    <span>
                      {transaction.incomeAccount.code} -{" "}
                      {transaction.incomeAccount.name}
                    </span>
                  ) : (
                    <span>Uncategorized</span>
                  )
                ) : (
                  <span>-</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search accounts..." />
                <CommandList>
                  <CommandEmpty>No accounts found.</CommandEmpty>
                  <CommandGroup>
                    {availableAccounts.map((account) => (
                      <CommandItem
                        key={account.id}
                        value={`${account.code} ${account.name}`}
                        onSelect={() => handleAccountSelect(account.id)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            currentAccountId === account.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <span className="font-medium">{account.code}</span>
                        <span className="ml-2">{account.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : (
          <span>-</span>
        )}
      </TableCell>
      <TableCell
        className={cn(
          "text-right font-medium whitespace-nowrap",
          transaction.type === "DEPOSIT" ||
            transaction.type === "RECEIVE_PAYMENT"
            ? "text-green-600"
            : "text-red-600"
        )}
      >
        {formatCurrency(transaction.amount)}
      </TableCell>
      <TableCell className="w-32 max-w-32">
        {transaction.referenceNumber &&
        transaction.referenceNumber.length > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate block cursor-help">
                  {transaction.referenceNumber}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs break-words">
                  {transaction.referenceNumber}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span>-</span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
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
      <TableCell className="whitespace-nowrap">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
              {(isFromBankFeed || potentialMatches.length > 0) && (
                <>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      loadMatches();
                    }}
                    disabled={loadingMatches}
                  >
                    {loadingMatches ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="mr-2 h-4 w-4" />
                    )}
                    {potentialMatches.length > 0
                      ? `Match (${potentialMatches.length})`
                      : "Find Match"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <Popover
                open={categorizeOpen}
                onOpenChange={(open) => {
                  setCategorizeOpen(open);
                  if (!open) {
                    setDropdownOpen(false);
                  }
                }}
                modal={false}
              >
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
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <div className="p-2 bg-muted rounded-md text-sm">
                        <Badge variant={getTypeBadgeVariant(inferredType)}>
                          {inferredType.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <div className="p-2 bg-muted rounded-md text-sm text-muted-foreground">
                        {transaction.description || "-"}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Payee</Label>
                      <Input
                        value={categorizePayee}
                        onChange={(e) => setCategorizePayee(e.target.value)}
                        placeholder="Enter payee"
                      />
                    </div>
                    {(inferredType === TransactionTypeEnum.EXPENSE ||
                      inferredType === TransactionTypeEnum.DEPOSIT ||
                      inferredType === TransactionTypeEnum.RECEIVE_PAYMENT) && (
                      <div className="space-y-2">
                        <Label>Account</Label>
                        <Select
                          value={selectedAccount}
                          onValueChange={setSelectedAccount}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select account from Chart of Accounts" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts
                              .filter((acc) => {
                                // For expenses, show expense accounts
                                if (
                                  inferredType === TransactionTypeEnum.EXPENSE
                                ) {
                                  return (
                                    acc.type === AccountType.Expense ||
                                    acc.type === AccountType.Other_Expense ||
                                    acc.type === AccountType.Cost_of_Goods_Sold
                                  );
                                }
                                // For deposits/receive payments, show income accounts
                                if (
                                  inferredType ===
                                    TransactionTypeEnum.DEPOSIT ||
                                  inferredType ===
                                    TransactionTypeEnum.RECEIVE_PAYMENT
                                ) {
                                  return (
                                    acc.type === AccountType.Income ||
                                    acc.type === AccountType.Other_Income
                                  );
                                }
                                return false;
                              })
                              .filter((acc) => acc.isActive)
                              .map((acc) => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button
                      onClick={handleCategorize}
                      className="w-full"
                      disabled={
                        (inferredType === TransactionTypeEnum.EXPENSE ||
                          inferredType === TransactionTypeEnum.DEPOSIT ||
                          inferredType ===
                            TransactionTypeEnum.RECEIVE_PAYMENT) &&
                        !selectedAccount
                      }
                    >
                      <Tag className="mr-2 h-4 w-4" />
                      Categorize
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>

      {/* Match Dialog */}
      <Dialog open={matchesOpen} onOpenChange={setMatchesOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Match Transaction</DialogTitle>
            <DialogDescription>
              {isFromBankFeed
                ? "This transaction is from your bank feed. Select a manually entered transaction to match it with."
                : "This transaction was manually entered. Select a bank feed transaction to match it with."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-2">
                Current Transaction
              </div>
              <div className="text-sm space-y-1">
                <div>
                  <span className="font-medium">Amount:</span>{" "}
                  {formatCurrency(transaction.amount)}
                </div>
                <div>
                  <span className="font-medium">Date:</span>{" "}
                  {format(
                    new Date(transaction.transactionDate),
                    "MMM dd, yyyy"
                  )}
                </div>
                <div>
                  <span className="font-medium">Description:</span>{" "}
                  {transaction.description || "-"}
                </div>
                <div>
                  <span className="font-medium">Payee:</span>{" "}
                  {transaction.payee || "-"}
                </div>
              </div>
            </div>

            {potentialMatches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No potential matches found</p>
                <p className="text-sm mt-2">
                  Make sure you have a transaction with the same amount on the
                  same bank account.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Potential Matches ({potentialMatches.length})
                </div>
                {potentialMatches.map((match) => (
                  <div
                    key={match.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleAcceptMatch(match.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="text-sm font-medium">
                          {format(
                            new Date(match.transactionDate),
                            "MMM dd, yyyy"
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Description:</span>{" "}
                            {match.description || "-"}
                          </div>
                          <div>
                            <span className="font-medium">Payee:</span>{" "}
                            {match.payee || "-"}
                          </div>
                          {match.expenseAccount && (
                            <div>
                              <span className="font-medium">
                                Expense Account:
                              </span>{" "}
                              {match.expenseAccount.code} -{" "}
                              {match.expenseAccount.name}
                            </div>
                          )}
                          {match.incomeAccount && (
                            <div>
                              <span className="font-medium">
                                Income Account:
                              </span>{" "}
                              {match.incomeAccount.code} -{" "}
                              {match.incomeAccount.name}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptMatch(match.id);
                        }}
                      >
                        Match
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TableRow>
  );
};
