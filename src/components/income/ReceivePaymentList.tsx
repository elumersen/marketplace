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
import { Badge } from '@/components/ui/badge';
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
  ReceivePayment,
  Invoice,
  BankAccount,
} from '@/types/api.types';
import {
  receivePaymentAPI,
  invoiceAPI,
  bankAccountAPI,
  getErrorMessage,
} from '@/lib/api';
import { format } from 'date-fns';

interface ReceivePaymentListProps {
  onView?: (payment: ReceivePayment) => void;
  onEdit?: (payment: ReceivePayment) => void;
  onCreateNew?: () => void;
  refreshSignal?: number;
}

type StatusFilter = 'all' | 'active' | 'inactive';

interface Filters {
  status: StatusFilter;
  invoiceId?: string;
  bankAccountId?: string;
  startDate?: string;
  endDate?: string;
}

type InvoiceOption = Pick<Invoice, 'id' | 'invoiceNumber' | 'customer'> & {
  balanceDue?: number;
};

export const ReceivePaymentList: React.FC<ReceivePaymentListProps> = ({
  onView,
  onEdit,
  onCreateNew,
  refreshSignal = 0,
}) => {
  const [receivePayments, setReceivePayments] = useState<ReceivePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Filters>({
    status: 'active',
    invoiceId: undefined,
    bankAccountId: undefined,
    startDate: '',
    endDate: '',
  });
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

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
    loadReceivePayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, refreshSignal]);

  const loadFilterOptions = async () => {
    try {
      const [invoiceRes, bankAccountRes] = await Promise.all([
        invoiceAPI.getAll(),
        bankAccountAPI.getAll(),
      ]);

      const invoiceOptions =
        invoiceRes.invoices?.map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customer: invoice.customer,
          balanceDue:
            invoice.balanceDue ?? invoice.totalAmount - invoice.paidAmount,
        })) ?? [];

      setInvoices(invoiceOptions);
      setBankAccounts(bankAccountRes);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  const loadReceivePayments = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string | boolean> = {};
      if (filters.status !== 'all') {
        params.isActive = filters.status === 'active';
      }
      if (filters.invoiceId) {
        params.invoiceId = filters.invoiceId;
      }
      if (filters.bankAccountId) {
        params.bankAccountId = filters.bankAccountId;
      }
      if (filters.startDate) {
        params.startDate = filters.startDate;
      }
      if (filters.endDate) {
        params.endDate = filters.endDate;
      }

      const response = await receivePaymentAPI.getAll(
        Object.keys(params).length > 0 ? params : undefined
      );
      setReceivePayments(response.receivePayments ?? []);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Failed to load receive payments:', err);
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
      await receivePaymentAPI.delete(paymentToDelete);
      loadReceivePayments();
    } catch (err) {
      console.error('Failed to delete receive payment:', getErrorMessage(err));
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

  const statusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? 'default' : 'secondary'}>
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );

  const filteredPayments = useMemo(() => {
    if (!searchTerm) return receivePayments;

    const lower = searchTerm.toLowerCase();
    return receivePayments.filter((payment) => {
      const invoiceNumber =
        payment.invoice?.invoiceNumber?.toLowerCase() ?? '';
      const customerName =
        payment.invoice?.customer?.name?.toLowerCase() ?? '';
      const reference = payment.referenceNumber?.toLowerCase() ?? '';
      return (
        invoiceNumber.includes(lower) ||
        customerName.includes(lower) ||
        reference.includes(lower)
      );
    });
  }, [receivePayments, searchTerm]);

  const clearDates = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Receive Payments
            </CardTitle>
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              New Payment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Invoice, customer, or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceId">Invoice</Label>
              <Select
                value={filters.invoiceId ?? 'all'}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    invoiceId: value === 'all' ? undefined : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All invoices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All invoices</SelectItem>
                  {invoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber}
                      {invoice.customer?.name
                        ? ` — ${invoice.customer.name}`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankAccountId">Bank Account</Label>
              <Select
                value={filters.bankAccountId ?? 'all'}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    bankAccountId: value === 'all' ? undefined : value,
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
                      {account.accountNumber
                        ? ` (${account.accountNumber})`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value: StatusFilter) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <DatePicker date={startDate} setDate={setStartDate} />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <DatePicker date={endDate} setDate={setEndDate} />
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
              <p>No receive payments found</p>
              <p className="text-sm">
                Create your first payment to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Bank Account</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {payment.invoice?.invoiceNumber ?? '—'}
                      </TableCell>
                      <TableCell>
                        {payment.invoice?.customer?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        {payment.bankAccount
                          ? `${payment.bankAccount.name}${
                              payment.bankAccount.accountNumber
                                ? ` (${payment.bankAccount.accountNumber})`
                                : ''
                            }`
                          : '—'}
                      </TableCell>
                      <TableCell>{payment.referenceNumber || '—'}</TableCell>
                      <TableCell>{statusBadge(payment.isActive)}</TableCell>
                      <TableCell className="text-right">
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
              Are you sure you want to delete this payment? This action cannot
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

