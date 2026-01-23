import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BillPayment,
  Bill,
} from '@/types/api.types';
import {
  billPaymentAPI,
  billAPI,
  getErrorMessage,
} from '@/lib/api';
import { format } from 'date-fns';

interface BillPaymentListProps {
  onView?: (payment: BillPayment) => void;
  onEdit?: (payment: BillPayment) => void;
  onCreateNew?: () => void;
  refreshSignal?: number;
}

interface Filters {
  billId?: string;
  startDate?: string;
  endDate?: string;
}

type BillOption = Pick<Bill, 'id' | 'billNumber' | 'vendor'> & {
  balanceDue?: number;
};

export const BillPaymentList: React.FC<BillPaymentListProps> = ({
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

  const [billPayments, setBillPayments] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Filters>({
    billId: undefined,
    startDate: '',
    endDate: '',
  });
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [bills, setBills] = useState<BillOption[]>([]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      startDate: startDate ? startDate.toISOString().split('T')[0] : '',
      endDate: endDate ? endDate.toISOString().split('T')[0] : '',
    }));
  }, [startDate, endDate]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadBillPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, refreshSignal]);

  const loadFilterOptions = async () => {
    try {
      const billRes = await billAPI.getAll();

      const billOptions =
        billRes.bills
          ?.filter((bill) => String(bill.status).trim() !== 'PAID')
          .map((bill) => ({
            id: bill.id,
            billNumber: bill.billNumber,
            vendor: bill.vendor,
            balanceDue:
              bill.totalAmount - bill.paidAmount,
          })) ?? [];

      setBills(billOptions);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  const loadBillPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {};
      if (filters.billId) {
        params.billId = filters.billId;
      }
      if (filters.startDate) {
        params.startDate = filters.startDate;
      }
      if (filters.endDate) {
        params.endDate = filters.endDate;
      }

      const response = await billPaymentAPI.getAll(
        Object.keys(params).length > 0 ? params : undefined
      );
      setBillPayments(response.billPayments ?? []);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Failed to load bill payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setPaymentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!paymentToDelete) return;

    try {
      await billPaymentAPI.delete(paymentToDelete);
      loadBillPayments();
    } catch (err) {
      console.error('Failed to delete bill payment:', getErrorMessage(err));
    } finally {
      setPaymentToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const filteredPayments = useMemo(() => {
    if (!searchTerm) return billPayments;

    const lower = searchTerm.toLowerCase();
    return billPayments.filter((payment) => {
      // Check billPaymentBills first, then fallback to bill for backward compatibility
      const bills = payment.billPaymentBills || (payment.bill ? [{ bill: payment.bill }] : []);
      const billNumbers = bills.map(b => b.bill?.billNumber?.toLowerCase() ?? '').join(' ');
      const vendorNames = bills.map(b => b.bill?.vendor?.name?.toLowerCase() ?? '').join(' ');
      const reference = payment.referenceNumber?.toLowerCase() ?? '';
      const checkNumber = payment.checkNumber?.toLowerCase() ?? '';
      return (
        billNumbers.includes(lower) ||
        vendorNames.includes(lower) ||
        reference.includes(lower) ||
        checkNumber.includes(lower)
      );
    });
  }, [billPayments, searchTerm]);

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
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
              Bill Payments
            </CardTitle>
            <Button onClick={onCreateNew} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Payment
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
                  placeholder={isDesktop ? "Bill, vendor, or reference..." : "Search payments..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-xs sm:text-sm placeholder:text-xs sm:placeholder:text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billId">Bill</Label>
              <Select
                value={filters.billId ?? 'all'}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    billId: value === 'all' ? undefined : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All bills" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All bills</SelectItem>
                  {bills.map((bill) => (
                    <SelectItem key={bill.id} value={bill.id}>
                      {bill.billNumber}
                      {bill.vendor?.name
                        ? ` — ${bill.vendor.name}`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <DatePicker date={startDate} setDate={setStartDate} className="w-full" />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <DatePicker date={endDate} setDate={setEndDate} className="w-full" />
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
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bill payments found</p>
              <p className="text-sm">
                Create your first payment to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead className="whitespace-nowrap">Bills</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
                    <TableHead className="whitespace-nowrap">Reference</TableHead>
                    <TableHead className="whitespace-nowrap">Check #</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="space-y-1">
                          {payment.billPaymentBills && payment.billPaymentBills.length > 0 ? (
                            payment.billPaymentBills.map((bpb, idx) => (
                              <div key={bpb.id || idx} className="text-sm">
                                <span className="font-medium">
                                  {bpb.bill?.billNumber ?? '—'}
                                </span>
                                {bpb.bill?.vendor?.name && (
                                  <span className="text-muted-foreground ml-2">
                                    — {bpb.bill.vendor.name}
                                  </span>
                                )}
                                <span className="text-muted-foreground ml-2">
                                  ({formatCurrency(bpb.amount)})
                                </span>
                              </div>
                            ))
                          ) : payment.bill ? (
                            <div className="text-sm">
                              <span className="font-medium">
                                {payment.bill.billNumber}
                              </span>
                              {payment.bill.vendor?.name && (
                                <span className="text-muted-foreground ml-2">
                                  — {payment.bill.vendor.name}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono whitespace-nowrap">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{payment.referenceNumber || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">{payment.checkNumber || '—'}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => onView?.(payment)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onEdit?.(payment)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(payment.id)}
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
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment?
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

