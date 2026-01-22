import React, { useState, useEffect, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
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
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bill, BillStatus, BillQueryParams } from "@/types/api.types";
import { billAPI, getErrorMessage } from "@/lib/api";
import { format } from "date-fns";

interface BillListProps {
  onView?: (bill: Bill) => void;
  onEdit?: (bill: Bill) => void;
  onCreateNew?: () => void;
  refreshSignal?: number;
}

const statusConfig = {
  [BillStatus.DRAFT]: {
    label: "Draft",
    variant: "secondary" as const,
    icon: FileText,
  },
  [BillStatus.OPEN]: {
    label: "Open",
    variant: "default" as const,
    icon: FileText,
  },
  [BillStatus.PARTIALLY_PAID]: {
    label: "Partially Paid",
    variant: "default" as const,
    icon: DollarSign,
  },
  [BillStatus.PAID]: {
    label: "Paid",
    variant: "default" as const,
    icon: CheckCircle,
  },
  [BillStatus.OVERDUE]: {
    label: "Overdue",
    variant: "destructive" as const,
    icon: AlertCircle,
  },
  [BillStatus.VOID]: {
    label: "Void",
    variant: "destructive" as const,
    icon: XCircle,
  },
};

export const BillList: React.FC<BillListProps> = ({
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

  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BillQueryParams>({
    startDate: "",
    endDate: "",
    status: undefined,
    vendorId: undefined,
  });
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      startDate: startDate ? startDate.toISOString().split("T")[0] : "",
      endDate: endDate ? endDate.toISOString().split("T")[0] : "",
    }));
  }, [startDate, endDate]);

  useEffect(() => {
    loadBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, refreshSignal]);

  const loadBills = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await billAPI.getAll(filters);
      setBills(response.bills || []);
    } catch (error) {
      setError(getErrorMessage(error));
      console.error("Failed to load bills:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBillToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!billToDelete) return;

    try {
      await billAPI.delete(billToDelete);
      loadBills();
    } catch (error) {
      console.error("Failed to delete bill:", getErrorMessage(error));
    } finally {
      setDeleteDialogOpen(false);
      setBillToDelete(null);
    }
  };

  const filteredBills = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return bills.filter((bill) => {
      const number = bill.billNumber.toLowerCase();
      const vendor = bill.vendor?.name?.toLowerCase() ?? "";
      const note = bill.notes?.toLowerCase() ?? "";
      return (
        number.includes(lower) || vendor.includes(lower) || note.includes(lower)
      );
    });
  }, [bills, searchTerm]);

  const getStatusBadge = (status: BillStatus) => {
    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const clearDates = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
              Bills
            </CardTitle>
            <Button onClick={onCreateNew} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Bill
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder={isDesktop ? "Search by bill number or vendor..." : "Search bills..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-xs sm:text-sm placeholder:text-xs sm:placeholder:text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <DatePicker
                date={startDate}
                setDate={(date) => setStartDate(date ?? undefined)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <DatePicker
                date={endDate}
                setDate={(date) => setEndDate(date ?? undefined)}
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

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    status: value === "all" ? undefined : (value as BillStatus),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value={BillStatus.DRAFT}>Draft</SelectItem>
                  <SelectItem value={BillStatus.OPEN}>Open</SelectItem>
                  <SelectItem value={BillStatus.PARTIALLY_PAID}>
                    Partially Paid
                  </SelectItem>
                  <SelectItem value={BillStatus.PAID}>Paid</SelectItem>
                  <SelectItem value={BillStatus.OVERDUE}>Overdue</SelectItem>
                  <SelectItem value={BillStatus.VOID}>Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bills found</p>
              <p className="text-sm">Create your first bill to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Bill #</TableHead>
                    <TableHead className="whitespace-nowrap">Vendor</TableHead>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead className="whitespace-nowrap">
                      Due Date
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Total
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Paid
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Balance
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.map((bill) => {
                    const balanceDue = bill.totalAmount - bill.paidAmount;
                    return (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {bill.billNumber}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {bill.vendor?.name || "Unknown"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(bill.billDate), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-red-600 whitespace-nowrap">
                          {format(new Date(bill.dueDate), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {getStatusBadge(bill.status)}
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap">
                          {formatCurrency(bill.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap">
                          {formatCurrency(bill.paidAmount)}
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap">
                          {formatCurrency(balanceDue)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onView?.(bill)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              {bill.status === BillStatus.DRAFT && (
                                <DropdownMenuItem
                                  onClick={() => onEdit?.(bill)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDelete(bill.id)}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this bill?
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
