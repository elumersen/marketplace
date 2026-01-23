import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DatePicker } from "@/components/ui/date-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Plus,
  Eye,
  Edit,
  MoreHorizontal,
  Trash2,
  Calendar,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Deposit, BankAccount } from "@/types/api.types";
import { depositAPI, bankAccountAPI, getErrorMessage } from "@/lib/api";
import { format } from "date-fns";
interface DepositListProps {
  onView?: (deposit: Deposit) => void;
  onEdit?: (deposit: Deposit) => void;
  onCreateNew?: () => void;
  refreshSignal?: number;
}

interface Filters {
  bankAccountId?: string;
  startDate?: string;
  endDate?: string;
}

export const DepositList: React.FC<DepositListProps> = ({
  onView,
  onEdit,
  onCreateNew,
  refreshSignal = 0,
}) => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Filters>({
    bankAccountId: undefined,
    startDate: "",
    endDate: "",
  });
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [depositToDelete, setDepositToDelete] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      startDate: startDate ? startDate.toISOString().split("T")[0] : "",
      endDate: endDate ? endDate.toISOString().split("T")[0] : "",
    }));
  }, [startDate, endDate]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadDeposits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, refreshSignal]);

  const loadFilterOptions = async () => {
    try {
      const bankAccountRes = await bankAccountAPI.getAll();
      setBankAccounts(bankAccountRes ?? []);
    } catch (err) {
      console.error("Failed to load filter options:", err);
    }
  };

  const loadDeposits = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {};
      if (filters.bankAccountId) {
        params.bankAccountId = filters.bankAccountId;
      }
      if (filters.startDate) {
        params.startDate = filters.startDate;
      }
      if (filters.endDate) {
        params.endDate = filters.endDate;
      }

      const response = await depositAPI.getAll(
        Object.keys(params).length > 0 ? params : undefined
      );
      setDeposits(response.deposits ?? []);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error("Failed to load deposits:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setDepositToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!depositToDelete) return;

    try {
      await depositAPI.delete(depositToDelete);
      loadDeposits();
    } catch (err) {
      console.error("Failed to delete deposit:", getErrorMessage(err));
    } finally {
      setDepositToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const filteredDeposits = useMemo(() => {
    if (!searchTerm) return deposits;

    const lower = searchTerm.toLowerCase();
    return deposits.filter((deposit) => {
      const bankAccountName = deposit.bankAccount?.name?.toLowerCase() ?? "";
      const reference = deposit.referenceNumber?.toLowerCase() ?? "";
      return bankAccountName.includes(lower) || reference.includes(lower);
    });
  }, [deposits, searchTerm]);

  const clearDates = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Deposits
            </CardTitle>
            <Button onClick={onCreateNew} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Deposit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder={isDesktop ? "Bank account or reference..." : "Search deposits..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-xs sm:text-sm placeholder:text-xs sm:placeholder:text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankAccountId">Bank Account</Label>
              <Select
                value={filters.bankAccountId ?? "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    bankAccountId: value === "all" ? undefined : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All bank accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All bank accounts</SelectItem>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <DatePicker
                date={startDate}
                setDate={setStartDate}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <DatePicker
                date={endDate}
                setDate={setEndDate}
                className="w-full"
              />
              {(startDate || endDate) && (
                <Button
                  type="button"
                  variant="link"
                  className="px-0 text-xs"
                  onClick={clearDates}
                >
                  Clear dates
                </Button>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : filteredDeposits.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No deposits found</p>
              <p className="text-sm">
                Create your first deposit to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead className="whitespace-nowrap">
                      Bank Account
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Amount
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Reference
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeposits.map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(deposit.depositDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {deposit.bankAccount?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono whitespace-nowrap">
                        {formatCurrency(deposit.amount)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {deposit.referenceNumber || "—"}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onView?.(deposit)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit?.(deposit)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(deposit.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deposit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this deposit? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
