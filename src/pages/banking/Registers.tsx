import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { format } from "date-fns";
import { accountAPI, transactionAPI } from "@/lib/api";
import { formatCurrency as formatCurrencyUtil } from "@/lib/formatCurrency";
import type {
  Account,
  AccountRegister,
  RegisterTransaction,
} from "@/types/api.types";
import { QBOTransactionForm } from "@/components/banking/QBOTransactionForm";

export const Registers = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [register, setRegister] = useState<AccountRegister | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [memoDialogOpen, setMemoDialogOpen] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState<string>("");
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [addFormExpanded, setAddFormExpanded] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      loadRegister(selectedAccount.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount, startDate, endDate, page, sortOrder]);

  useEffect(() => {
    setPage(1);
  }, [selectedAccount?.id, startDate, endDate]);

  useEffect(() => {
    if (accountId && accounts.length > 0) {
      const account = accounts.find((acc) => acc.id === accountId);
      if (account && account.subType !== "Net_Income") {
        setSelectedAccount(account);
      } else if (account && account.subType === "Net_Income") {
        navigate("/registers");
      }
    }
  }, [accountId, accounts, navigate]);

  const loadAccounts = async () => {
    try {
      const response = await accountAPI.getAll({ all: "true", isActive: true });
      const filteredAccounts = response.data.filter(
        (acc) => acc.subType !== "Net_Income",
      );
      setAccounts(filteredAccounts);
    } catch (error) {
      console.error("Failed to load accounts:", error);
    }
  };

  const loadRegister = async (acctId: string) => {
    setLoading(true);
    try {
      const params: {
        startDate?: string;
        endDate?: string;
        page?: number;
        pageSize?: number;
        sortOrder?: "asc" | "desc";
      } = { page, pageSize: 25, sortOrder };

      if (startDate) params.startDate = startDate.toISOString().split("T")[0];
      if (endDate) params.endDate = endDate.toISOString().split("T")[0];

      const registerData = await transactionAPI.getAccountRegister(
        acctId,
        params,
      );
      setRegister(registerData);
    } catch (error) {
      console.error("Failed to load register:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountChange = (acctId: string) => {
    const account = accounts.find((acc) => acc.id === acctId);
    if (account) {
      setSelectedAccount(account);
      navigate(`/registers/${acctId}`);
    }
  };

  const formatCurrency = (amount: number, signedParenthesis = false) =>
    formatCurrencyUtil(amount, { signedParenthesis });

  const formatDate = (dateString: string) => {
    const dateOnly = dateString.split("T")[0];
    const [year, month, day] = dateOnly.split("-").map(Number);
    // keeping your logic (though +1 day is usually a timezone bug workaround)
    const date = new Date(year, month - 1, day + 1);
    return format(date, "MM/dd/yyyy");
  };

  const getTransactionTypeDisplay = (transaction: RegisterTransaction) => {
    const typeMap: Record<string, string> = {
      CHECK: "Check",
      DEPOSIT: "Deposit",
      EXPENSE: "Expense",
      REFUND: "Refund",
      INVOICE: "Invoice",
      RECEIVE_PAYMENT: "Receive Payment",
      BILL: "Bill",
      BILL_PAYMENT: "Bill Payment",
      TRANSFER: "Transfer",
      CREDIT_CARD_PAYMENT: "Credit Card Payment",
      JOURNAL_ENTRY: "Journal Entry",
    };

    return typeMap[transaction.type] || transaction.type;
  };

  const getPayeeDisplay = (transaction: RegisterTransaction) => {
    if (transaction.payee) return transaction.payee;

    if (transaction.journalEntry?.createdByUser) {
      const user = transaction.journalEntry.createdByUser;
      return (
        `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
      );
    }

    return "-";
  };

  const getAccountNameDisplay = (transaction: RegisterTransaction) => {
    if (transaction.pairedAccount) return transaction.pairedAccount;
    return "-";
  };

  const getReconciliationStatus = (transaction: RegisterTransaction) => {
    return transaction.isReconciled ? "Yes" : "No";
  };

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handleMemoClick = (description: string | undefined) => {
    setSelectedMemo(description || "");
    setMemoDialogOpen(true);
  };

  const hasMemo = (transaction: RegisterTransaction) => {
    return !!transaction.description && transaction.description.trim() !== "";
  };

  const handleDateSortClick = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    setPage(1);
  };

  const pagination = register?.pagination;

  // Min width so table is at least this wide on small screens; table fills available space on larger screens
  const TABLE_MIN_WIDTH = 960;

  if (accounts.length === 0) {
    return (
      <div className="w-full max-w-full">
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

  if (!accountId) {
    return (
      <div className="w-full max-w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Account Registers</h1>
          <p className="text-muted-foreground">
            Select an account to view its register
          </p>
        </div>

        <Card className="w-full">
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
                    {account.code} - {account.name}
                    {account.subType ? ` (${account.subType})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading && !register) {
    return (
      <div className="w-full max-w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Account Register</h1>
          <div className="flex items-center gap-2 mt-4">
            <Spinner size="sm" />
            <p className="text-muted-foreground">Loading register...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-0 w-full max-w-full flex-col overflow-hidden py-2 sm:py-3"
      style={{ height: "calc(100vh - 6rem)", maxHeight: "calc(100vh - 6rem)" }}
    >
      <div className="shrink-0">
        <h1 className="text-3xl font-bold">Account Register</h1>
      </div>

      {/* Filters */}
      <Card className="mt-2 shrink-0 py-1.5 sm:py-2">
        <CardContent className="py-1.5 sm:py-2">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[220px]">
              <Label htmlFor="account-select">Account</Label>
              <Select
                value={selectedAccount?.id || ""}
                onValueChange={handleAccountChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label>Start Date</Label>
              <DatePicker
                date={startDate}
                setDate={setStartDate}
                className="w-full"
              />
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label>End Date</Label>
              <DatePicker
                date={endDate}
                setDate={setEndDate}
                className="w-full"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
              {selectedAccount && (
                <Button
                  size="sm"
                  onClick={() => setAddFormExpanded(true)}
                  className={addFormExpanded ? "hidden" : ""}
                >
                  Add Transaction
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QBO Transaction Form */}
      {selectedAccount && addFormExpanded && (
        <QBOTransactionForm
          registerAccountId={selectedAccount.id}
          onSuccess={() => {
            if (selectedAccount) loadRegister(selectedAccount.id);
          }}
          onCancel={() => setAddFormExpanded(false)}
        />
      )}

      <Card className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          {loading ? (
            <div className="min-h-0 flex-1 w-full overflow-auto overflow-x-auto">
              <table
                className="w-full border-collapse text-sm [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap"
                style={{ minWidth: TABLE_MIN_WIDTH }}
              >
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Ref No</TableHead>
                    <TableHead>Customer/Vendor</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-center">Memo</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Reconciled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-28" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Skeleton className="h-8 w-8 mx-auto rounded" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-5 w-16 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-5 w-16 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-5 w-20 ml-auto" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-10" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </table>
            </div>
          ) : register ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 min-w-0 flex-1 w-full overflow-auto overflow-x-auto">
                <table
                  className="w-full border-collapse text-sm [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap"
                  style={{ minWidth: TABLE_MIN_WIDTH }}
                >
                  <TableHeader className="sticky top-0 z-10 border-b bg-muted [&_th]:bg-muted [&_th]:shadow-[0_1px_0_0_hsl(var(--border))]">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>
                        <button
                          type="button"
                          onClick={handleDateSortClick}
                          className="inline-flex items-center gap-1 font-medium focus:outline-none text-left"
                        >
                          Date
                          {sortOrder === "desc" ? (
                            <ChevronDown
                              className="h-4 w-4"
                              aria-label="Newest first"
                            />
                          ) : (
                            <ChevronUp
                              className="h-4 w-4"
                              aria-label="Oldest first"
                            />
                          )}
                        </button>
                      </TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Ref No</TableHead>
                      <TableHead>Customer/Vendor</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-center">Memo</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Reconciled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {register.transactions.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No transactions found for the selected period
                        </TableCell>
                      </TableRow>
                    ) : (
                      register.transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {formatDate(transaction.transactionDate)}
                          </TableCell>
                          <TableCell>
                            {getTransactionTypeDisplay(transaction)}
                          </TableCell>
                          <TableCell>
                            {transaction.referenceNumber || "-"}
                          </TableCell>
                          <TableCell>{getPayeeDisplay(transaction)}</TableCell>
                          <TableCell>
                            {getAccountNameDisplay(transaction)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 relative"
                              onClick={() =>
                                handleMemoClick(transaction.description)
                              }
                            >
                              <MessageCircle
                                className={`h-4 w-4 ${
                                  hasMemo(transaction)
                                    ? "text-blue-600"
                                    : "text-gray-400"
                                }`}
                              />
                              {hasMemo(transaction) && (
                                <span className="absolute top-0 right-0 h-2 w-2 bg-blue-600 rounded-full border-2 border-white" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            {transaction.debitAmount !== 0
                              ? formatCurrency(transaction.debitAmount, true)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {transaction.creditAmount !== 0
                              ? formatCurrency(transaction.creditAmount, true)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(transaction.runningBalance, true)}
                          </TableCell>
                          <TableCell>
                            {getReconciliationStatus(transaction)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </table>
              </div>

              {pagination && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2 shrink-0">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                    {pagination.totalCount !== undefined && (
                      <> ({pagination.totalCount} transactions)</>
                    )}
                    {pagination.pageSize !== undefined && (
                      <> · {pagination.pageSize} per page</>
                    )}
                  </p>
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.totalCount}
                    itemsPerPage={pagination.pageSize ?? 25}
                    onPageChange={setPage}
                    showResultsInfo={false}
                    className="shrink-0"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Select an account to view its register
            </div>
          )}
        </CardContent>
      </Card>

      {/* Memo Dialog */}
      <Dialog open={memoDialogOpen} onOpenChange={setMemoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Memo</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedMemo ? (
              <p className="text-sm whitespace-pre-wrap">{selectedMemo}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No memo available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
