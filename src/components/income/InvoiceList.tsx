import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Invoice, InvoiceStatus, InvoiceQueryParams } from '@/types/api.types';
import { invoiceAPI, getErrorMessage } from '@/lib/api';
import { format } from 'date-fns';

interface InvoiceListProps {
  onView?: (invoice: Invoice) => void;
  onEdit?: (invoice: Invoice) => void;
  onCreateNew?: () => void;
  refreshSignal?: number;
}

const statusConfig = {
  [InvoiceStatus.DRAFT]: {
    label: 'Draft',
    variant: 'secondary' as const,
    icon: FileText,
  },
  [InvoiceStatus.SENT]: {
    label: 'Sent',
    variant: 'default' as const,
    icon: FileText,
  },
  [InvoiceStatus.PARTIALLY_PAID]: {
    label: 'Partially Paid',
    variant: 'default' as const,
    icon: DollarSign,
  },
  [InvoiceStatus.PAID]: {
    label: 'Paid',
    variant: 'default' as const,
    icon: CheckCircle,
  },
  [InvoiceStatus.OVERDUE]: {
    label: 'Overdue',
    variant: 'destructive' as const,
    icon: AlertCircle,
  },
  [InvoiceStatus.VOID]: {
    label: 'Void',
    variant: 'destructive' as const,
    icon: XCircle,
  },
};

export const InvoiceList: React.FC<InvoiceListProps> = ({
  onView,
  onEdit,
  onCreateNew,
  refreshSignal = 0,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InvoiceQueryParams>({
    startDate: '',
    endDate: '',
    status: undefined,
    customerId: undefined,
  });
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      startDate: startDate ? startDate.toISOString().split('T')[0] : '',
      endDate: endDate ? endDate.toISOString().split('T')[0] : '',
    }));
  }, [startDate, endDate]);

  useEffect(() => {
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, refreshSignal]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await invoiceAPI.getAll(filters);
      setInvoices(response.invoices || []);
    } catch (error) {
      setError(getErrorMessage(error));
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setInvoiceToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!invoiceToDelete) return;
    
    try {
      await invoiceAPI.delete(invoiceToDelete);
      loadInvoices();
    } catch (error) {
      console.error('Failed to delete invoice:', getErrorMessage(error));
    } finally {
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const filteredInvoices = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return invoices.filter((invoice) => {
      const number = invoice.invoiceNumber.toLowerCase();
      const customer = invoice.customer?.name?.toLowerCase() ?? '';
      const note = invoice.notes?.toLowerCase() ?? '';
      return (
        number.includes(lower) ||
        customer.includes(lower) ||
        note.includes(lower)
      );
    });
  }, [invoices, searchTerm]);

  const getStatusBadge = (status: InvoiceStatus) => {
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoices
            </CardTitle>
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by invoice number or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
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
                value={filters.status || 'all'}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    status:
                      value === 'all' ? undefined : (value as InvoiceStatus),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value={InvoiceStatus.DRAFT}>Draft</SelectItem>
                  <SelectItem value={InvoiceStatus.SENT}>Sent</SelectItem>
                  <SelectItem value={InvoiceStatus.PARTIALLY_PAID}>Partially Paid</SelectItem>
                  <SelectItem value={InvoiceStatus.PAID}>Paid</SelectItem>
                  <SelectItem value={InvoiceStatus.OVERDUE}>Overdue</SelectItem>
                  <SelectItem value={InvoiceStatus.VOID}>Void</SelectItem>
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
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found</p>
              <p className="text-sm">Create your first invoice to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => {
                    const balanceDue = invoice.balanceDue ?? (invoice.totalAmount - invoice.paidAmount);
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.customer?.name || 'Unknown'}</TableCell>
                        <TableCell>{format(new Date(invoice.invoiceDate), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(invoice.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(invoice.paidAmount)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(balanceDue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onView?.(invoice)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              {invoice.status === InvoiceStatus.DRAFT && (
                                <DropdownMenuItem onClick={() => onEdit?.(invoice)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleDelete(invoice.id)}
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
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

