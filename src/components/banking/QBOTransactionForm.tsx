import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Account,
  Customer,
  Vendor,
  JournalEntryStatus,
  TransactionType,
} from "@/types/api.types";
import {
  accountAPI,
  customerAPI,
  vendorAPI,
  journalEntryAPI,
  getErrorMessage,
} from "@/lib/api";
import { getPostingRule, describeRule } from "@/lib/postingRules";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronsUpDown, Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface QBOTransactionFormProps {
  registerAccountId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Transaction type label mapping
const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.CHECK]: "Check",
  [TransactionType.DEPOSIT]: "Deposit",
  [TransactionType.EXPENSE]: "Expense",
  [TransactionType.REFUND]: "Refund",
  [TransactionType.INVOICE]: "Invoice",
  [TransactionType.RECEIVE_PAYMENT]: "Receive Payment",
  [TransactionType.BILL]: "Bill",
  [TransactionType.BILL_PAYMENT]: "Bill Payment",
  [TransactionType.TRANSFER]: "Transfer",
  [TransactionType.CREDIT_CARD_PAYMENT]: "Credit Card Payment",
  [TransactionType.JOURNAL_ENTRY]: "Journal Entry",
};

const TRANSACTION_TYPES_RAW = [
  {
    value: TransactionType.BILL,
    label: TRANSACTION_TYPE_LABELS[TransactionType.BILL],
  },
  {
    value: TransactionType.BILL_PAYMENT,
    label: TRANSACTION_TYPE_LABELS[TransactionType.BILL_PAYMENT],
  },
  {
    value: TransactionType.CHECK,
    label: TRANSACTION_TYPE_LABELS[TransactionType.CHECK],
  },
  {
    value: TransactionType.CREDIT_CARD_PAYMENT,
    label: TRANSACTION_TYPE_LABELS[TransactionType.CREDIT_CARD_PAYMENT],
  },
  {
    value: TransactionType.DEPOSIT,
    label: TRANSACTION_TYPE_LABELS[TransactionType.DEPOSIT],
  },
  {
    value: TransactionType.EXPENSE,
    label: TRANSACTION_TYPE_LABELS[TransactionType.EXPENSE],
  },
  {
    value: TransactionType.INVOICE,
    label: TRANSACTION_TYPE_LABELS[TransactionType.INVOICE],
  },
  {
    value: TransactionType.JOURNAL_ENTRY,
    label: TRANSACTION_TYPE_LABELS[TransactionType.JOURNAL_ENTRY],
  },
  {
    value: TransactionType.RECEIVE_PAYMENT,
    label: TRANSACTION_TYPE_LABELS[TransactionType.RECEIVE_PAYMENT],
  },
  {
    value: TransactionType.REFUND,
    label: TRANSACTION_TYPE_LABELS[TransactionType.REFUND],
  },
  {
    value: TransactionType.TRANSFER,
    label: TRANSACTION_TYPE_LABELS[TransactionType.TRANSFER],
  },
];
const TRANSACTION_TYPES = [...TRANSACTION_TYPES_RAW].sort((a, b) =>
  a.label.localeCompare(b.label),
);

export const QBOTransactionForm: React.FC<QBOTransactionFormProps> = ({
  registerAccountId,
  onSuccess,
  onCancel,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [entryDate, setEntryDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  // Transaction fields
  const [transactionType, setTransactionType] = useState<TransactionType>(
    TransactionType.EXPENSE,
  );
  const [refNo, setRefNo] = useState("");
  const [payee, setPayee] = useState("");
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [debitCredit, setDebitCredit] = useState<"debit" | "credit">("debit");
  const [ruleLock, setRuleLock] = useState<
    "debit" | "credit" | "both" | "none"
  >("both");
  const [memo, setMemo] = useState("");

  // Autocomplete data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Autocomplete open states
  const [accountOpen, setAccountOpen] = useState(false);
  const [payeeOpen, setPayeeOpen] = useState(false);
  const [payeeSearchQuery, setPayeeSearchQuery] = useState("");

  // Refs for fields
  const dateInputRef = useRef<HTMLInputElement>(null);
  const refNoInputRef = useRef<HTMLInputElement>(null);
  const payeeInputRef = useRef<HTMLButtonElement>(null);
  const accountInputRef = useRef<HTMLButtonElement>(null);
  const debitCreditRef = useRef<HTMLButtonElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const memoInputRef = useRef<HTMLInputElement>(null);
  const payeeCommandListRef = useRef<HTMLDivElement>(null);
  const accountCommandListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAutocompleteData();
  }, []);

  // Recompute posting rule whenever register account, accounts, or transaction type changes
  useEffect(() => {
    if (!accounts.length) return;
    const register = accounts.find((a) => a.id === registerAccountId);
    const rule = getPostingRule(register?.subType, transactionType);
    setRuleLock(rule);
    if (rule === "debit" || rule === "credit") {
      setDebitCredit(rule);
    }
  }, [accounts, registerAccountId, transactionType]);

  // Reset transaction type if current selection is not allowed for the register account
  useEffect(() => {
    if (!accounts.length) return;
    const register = accounts.find((a) => a.id === registerAccountId);
    const rule = getPostingRule(register?.subType, transactionType);
    if (rule === "none") {
      // Find first allowed transaction type
      const allowedType = TRANSACTION_TYPES.find((type) => {
        const typeRule = getPostingRule(register?.subType, type.value);
        return typeRule !== "none";
      });
      if (allowedType) {
        setTransactionType(allowedType.value);
      }
    }
  }, [accounts, registerAccountId]);

  const loadAutocompleteData = async () => {
    try {
      const [accountsResponse, customersResponse, vendorsResponse] =
        await Promise.all([
          accountAPI.getAll({ isActive: true, all: "true" }),
          customerAPI.getAll(),
          vendorAPI.getAll(),
        ]);
      setAccounts(accountsResponse.data || []);
      setCustomers(customersResponse.data || []);
      setVendors(vendorsResponse.data || []);
    } catch (error) {
      console.error("Failed to load autocomplete data:", error);
    }
  };

  const getFilteredPayees = (query: string) => {
    const allPayees = [
      ...customers.map((c) => ({ type: "Customer", name: c.name })),
      ...vendors.map((v) => ({ type: "Vendor", name: v.name })),
    ];

    if (!query) {
      return allPayees.slice(0, 10);
    }

    const lowerQuery = query.toLowerCase();
    return allPayees
      .filter((p) => p.name.toLowerCase().includes(lowerQuery))
      .slice(0, 10);
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
    if (ruleLock === "none") {
      toast({
        variant: "destructive",
        title: "Not Allowed",
        description: describeRule(ruleLock),
      });
      return;
    }
    if (ruleLock === "debit" || ruleLock === "credit") {
      // Lock side to rule
      if (debitCredit !== ruleLock) setDebitCredit(ruleLock);
    }

    setLoading(true);
    try {
      const amountValue = Number(amount);
      const regSide = ruleLock === "both" ? debitCredit : ruleLock;
      let lines;
      if (regSide === "debit") {
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
          },
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
          },
        ];
      }

      const data = {
        entryDate,
        description: memo,
        status: "POSTED" as JournalEntryStatus,
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
    setEntryDate(new Date().toISOString().split("T")[0]);
    setRefNo("");
    setPayee("");
    setAccountId("");
    setAmount("");
    setDebitCredit("debit");
    setMemo("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentField: string) => {
    if (e.key === "Enter" && !e.shiftKey && !loading) {
      e.preventDefault();

      if (currentField === "memo") {
        handleSave();
        return;
      }

      // Move to next field or save
      const fieldSequence = [
        "date",
        "refNo",
        "payee",
        "account",
        "amount",
        "memo",
      ];
      const currentIndex = fieldSequence.indexOf(currentField);
      const nextField = fieldSequence[currentIndex + 1];

      if (nextField === "refNo" && refNoInputRef.current) {
        refNoInputRef.current.focus();
        refNoInputRef.current.select();
      } else if (nextField === "payee") {
        setPayeeOpen(true);
        if (payeeInputRef.current) {
          setTimeout(() => payeeInputRef.current?.click(), 100);
        }
      } else if (nextField === "account") {
        setAccountOpen(true);
        if (accountInputRef.current) {
          setTimeout(() => accountInputRef.current?.click(), 100);
        }
      } else if (nextField === "amount" && amountInputRef.current) {
        amountInputRef.current.focus();
        amountInputRef.current.select();
      } else if (nextField === "memo" && memoInputRef.current) {
        memoInputRef.current.focus();
        memoInputRef.current.select();
      } else if (!nextField) {
        handleSave();
      }
    }
  };

  const toggleDebitCredit = () => {
    if (ruleLock !== "both") return; // locked
    setDebitCredit((prev) => (prev === "debit" ? "credit" : "debit"));
  };

  const adjustDateByDays = (delta: number) => {
    const d = new Date(entryDate + "T12:00:00");
    if (isNaN(d.getTime())) return;
    d.setDate(d.getDate() + delta);
    setEntryDate(d.toISOString().split("T")[0]);
  };

  const handleDateKeyDown = (e: React.KeyboardEvent, currentField: string) => {
    if (e.key === "+" || e.key === "=" || e.key === "Add") {
      e.preventDefault();
      adjustDateByDays(1);
      return;
    }
    if (e.key === "-" || e.key === "Subtract") {
      e.preventDefault();
      adjustDateByDays(-1);
      return;
    }
    handleKeyDown(e, currentField);
  };

  const selectedAccount = accounts.find((acc) => acc.id === accountId);
  const registerAccount = accounts.find((acc) => acc.id === registerAccountId);

  const allowedTransactionTypes = registerAccount
    ? TRANSACTION_TYPES.filter((type) => {
        const rule = getPostingRule(registerAccount.subType, type.value);
        return rule !== "none";
      })
    : TRANSACTION_TYPES;

  if (registerAccount && allowedTransactionTypes.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg mb-2">
      {/* New Transaction Header */}
      <div className="px-3 py-2 bg-blue-100 border-b border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-900">
              Add Transaction
            </span>
            <Select
              value={transactionType}
              onValueChange={(value) =>
                setTransactionType(value as TransactionType)
              }
              disabled={loading}
            >
              <SelectTrigger className="h-8 min-w-[8rem] w-max max-w-[20rem] text-sm whitespace-nowrap">
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
            onClick={() => {
              onCancel?.();
            }}
            className="h-6 px-2 text-xs"
            disabled={loading}
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        </div>
      </div>

      {/* Transaction Entry Row */}
      <div className="flex flex-wrap items-end gap-3 p-3">
        {/* Date with +/- buttons (top row & 10-key) */}
        <div className="flex flex-none items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => adjustDateByDays(-1)}
            disabled={loading}
            aria-label="Previous day"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            ref={dateInputRef}
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="h-9 w-28 text-sm"
            onKeyDown={(e) => handleDateKeyDown(e, "date")}
            disabled={loading}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => adjustDateByDays(1)}
            disabled={loading}
            aria-label="Next day"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Ref No */}
        <div className="flex-1 min-w-[7rem] max-w-[12rem]">
          <Tooltip>
            <TooltipTrigger asChild>
              <Input
                ref={refNoInputRef}
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                placeholder="Ref No"
                className="h-9 w-full text-sm truncate"
                onKeyDown={(e) => handleKeyDown(e, "refNo")}
                disabled={loading}
              />
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="max-w-[20rem] px-3 py-2 text-left text-sm font-normal leading-snug"
            >
              {refNo || "Ref No"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Payee */}
        <div className="flex-1 min-w-[140px]">
          <Popover
            open={payeeOpen}
            onOpenChange={(open) => {
              setPayeeOpen(open);
              if (open) setPayeeSearchQuery("");
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    ref={payeeInputRef}
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full h-9 justify-start text-left text-sm font-normal overflow-hidden",
                      !payee && "text-muted-foreground",
                    )}
                    disabled={loading}
                  >
                    <span className="min-w-0 truncate block">
                      {payee || "Customer/Vendor"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-[20rem] px-3 py-2 text-left text-sm font-normal leading-snug"
              >
                {payee || "Customer/Vendor"}
              </TooltipContent>
            </Tooltip>
            <PopoverContent className="w-[20rem] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search customer/vendor..."
                  value={payeeSearchQuery}
                  onValueChange={setPayeeSearchQuery}
                  onKeyDown={(e) => {
                    if (e.key === "Tab" && !e.shiftKey) {
                      const filteredPayees = getFilteredPayees(payeeSearchQuery);
                      if (filteredPayees.length > 0) {
                        e.preventDefault();
                        const highlightedItem =
                          payeeCommandListRef.current?.querySelector(
                            '[cmdk-item][aria-selected="true"]',
                          ) as HTMLElement | null;

                        let selectedPayee: {
                          type: string;
                          name: string;
                        } | null = null;

                        if (highlightedItem) {
                          const spans =
                            highlightedItem.querySelectorAll("span");
                          const payeeName = spans[0]?.textContent?.trim() || "";
                          selectedPayee =
                            filteredPayees.find((p) => p.name === payeeName) ||
                            null;
                        }

                        if (!selectedPayee) {
                          selectedPayee = filteredPayees[0];
                        }

                        setPayee(selectedPayee.name);
                        setPayeeOpen(false);
                        setTimeout(() => {
                          if (accountInputRef.current) {
                            accountInputRef.current.click();
                          }
                        }, 50);
                      }
                    }
                  }}
                />
                <CommandList ref={payeeCommandListRef}>
                  <CommandEmpty>No customer/vendor found.</CommandEmpty>
                  <CommandGroup>
                    {getFilteredPayees(payeeSearchQuery).map((p, idx) => (
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
                        <span className="ml-2 text-xs text-muted-foreground">
                          {p.type}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Account */}
        <div className="flex-1 min-w-[140px]">
          <Popover open={accountOpen} onOpenChange={setAccountOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    ref={accountInputRef}
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full h-9 justify-start text-left text-sm font-normal overflow-hidden",
                      !accountId && "text-muted-foreground",
                    )}
                    disabled={loading}
                  >
                    <span className="min-w-0 truncate block">
                      {selectedAccount
                        ? `${selectedAccount.code} - ${selectedAccount.name}`
                        : "Account"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-[20rem] px-3 py-2 text-left text-sm font-normal leading-snug"
              >
                {selectedAccount
                  ? `${selectedAccount.code} - ${selectedAccount.name}`
                  : "Account"}
              </TooltipContent>
            </Tooltip>
            <PopoverContent className="w-[30rem] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search account..."
                  onKeyDown={(e) => {
                    if (e.key === "Tab" && !e.shiftKey) {
                      const filteredAccounts = accounts.filter(
                        (account) => account.id !== registerAccountId,
                      );
                      if (filteredAccounts.length > 0) {
                        e.preventDefault();
                        const highlightedItem =
                          accountCommandListRef.current?.querySelector(
                            '[cmdk-item][aria-selected="true"]',
                          ) as HTMLElement | null;

                        let selectedAccount: Account | null = null;

                        if (highlightedItem) {
                          const spans =
                            highlightedItem.querySelectorAll("span");
                          const accountCode =
                            spans[0]?.textContent?.trim() || "";
                          selectedAccount =
                            filteredAccounts.find(
                              (a) => a.code === accountCode,
                            ) || null;
                        }

                        if (!selectedAccount) {
                          selectedAccount = filteredAccounts[0];
                        }

                        setAccountId(selectedAccount.id);
                        setAccountOpen(false);
                        setTimeout(() => {
                          if (amountInputRef.current) {
                            amountInputRef.current.focus();
                            amountInputRef.current.select();
                          }
                        }, 50);
                      }
                    }
                  }}
                />
                <CommandList ref={accountCommandListRef}>
                  <CommandEmpty>No account found.</CommandEmpty>
                  <CommandGroup>
                    {accounts
                      .filter((account) => account.id !== registerAccountId)
                      .map((account) => (
                        <CommandItem
                          key={account.id}
                          value={`${account.code} ${account.name}`}
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
                          <span className="font-mono text-xs">
                            {account.code}
                          </span>
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
        <div className="w-24 flex-none">
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} style={{ display: "inline-block" }}>
                <Button
                  ref={debitCreditRef}
                  variant={debitCredit === "debit" ? "destructive" : "default"}
                  onClick={toggleDebitCredit}
                  className="h-9 w-full"
                  disabled={loading || ruleLock !== "both"}
                  tabIndex={-1}
                >
                  {debitCredit === "debit" ? "Debit" : "Credit"}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{describeRule(ruleLock)}</TooltipContent>
          </Tooltip>
        </div>

        {/* Amount */}
        <div className="w-28 flex-none">
          <Tooltip>
            <TooltipTrigger asChild>
              <Input
                ref={amountInputRef}
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value ? parseFloat(e.target.value) : "")
                }
                placeholder="0.00"
                className="h-9 text-sm truncate"
                onKeyDown={(e) => handleKeyDown(e, "amount")}
                disabled={loading}
              />
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="max-w-[20rem] px-3 py-2 text-left text-sm font-normal leading-snug"
            >
              {amount !== "" ? String(Number(amount).toFixed(2)) : "0.00"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Memo */}
        <div className="flex-1 min-w-[100px] min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Input
                ref={memoInputRef}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Memo"
                className="h-9 w-full text-sm truncate"
                onKeyDown={(e) => handleKeyDown(e, "memo")}
                disabled={loading}
              />
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="max-w-[20rem] px-3 py-2 text-left text-sm font-normal leading-snug"
            >
              {memo || "Memo"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Save Button - same line as filters */}
        <div className="flex-none shrink-0">
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || ruleLock === "none"}
            className="h-9 min-w-[5rem]"
            size="sm"
          >
            {loading ? "..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
};
