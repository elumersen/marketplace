import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Edit,
  FileText,
  CalendarDays,
  CalendarRange,
  User,
  DollarSign,
  Hash,
  Mail,
  Phone,
  AlertCircle,
  Receipt,
} from 'lucide-react';
import { Invoice, InvoiceStatus } from '@/types/api.types';
import { invoiceAPI, getErrorMessage } from '@/lib/api';
import { format } from 'date-fns';

interface InvoiceDetailProps {
  invoiceId: string;
  onBack?: () => void;
  onEdit?: (invoice: Invoice) => void;
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
    icon: Receipt,
  },
  [InvoiceStatus.PARTIALLY_PAID]: {
    label: 'Partially Paid',
    variant: 'default' as const,
    icon: DollarSign,
  },
  [InvoiceStatus.PAID]: {
    label: 'Paid',
    variant: 'default' as const,
    icon: DollarSign,
  },
  [InvoiceStatus.OVERDUE]: {
    label: 'Overdue',
    variant: 'destructive' as const,
    icon: AlertCircle,
  },
  [InvoiceStatus.VOID]: {
    label: 'Void',
    variant: 'destructive' as const,
    icon: AlertCircle,
  },
};

export const InvoiceDetail: React.FC<InvoiceDetailProps> = ({
  invoiceId,
  onBack,
  onEdit,
}) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await invoiceAPI.getById(invoiceId);
      setInvoice(response.invoice);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Failed to load invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Invoice not found'}
        </AlertDescription>
      </Alert>
    );
  }

  const balanceDue = invoice.balanceDue ?? invoice.totalAmount - invoice.paidAmount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">Invoice {invoice.invoiceNumber}</h1>
            <p className="text-gray-600">Invoice Details</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {getStatusBadge(invoice.status)}
          {invoice.status === InvoiceStatus.DRAFT && (
            <Button onClick={() => onEdit?.(invoice)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Hash className="h-4 w-4" />
                Invoice Number
              </div>
              <p className="font-medium">{invoice.invoiceNumber}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CalendarDays className="h-4 w-4" />
                Invoice Date
              </div>
              <p className="font-medium">
                {format(new Date(invoice.invoiceDate), 'MMMM dd, yyyy')}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CalendarRange className="h-4 w-4" />
                Due Date
              </div>
              <p className="font-medium">
                {format(new Date(invoice.dueDate), 'MMMM dd, yyyy')}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="h-4 w-4" />
                Total Amount
              </div>
              <p className="text-lg font-semibold">
                {formatCurrency(invoice.totalAmount)}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="h-4 w-4" />
                Paid Amount
              </div>
              <p className="text-lg font-semibold">
                {formatCurrency(invoice.paidAmount)}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="h-4 w-4" />
                Balance Due
              </div>
              <p className={`text-lg font-semibold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(balanceDue)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.customer ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  Name
                </div>
                <p className="font-medium">{invoice.customer.name}</p>
              </div>

              {invoice.customer.email && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                  <p className="font-medium">{invoice.customer.email}</p>
                </div>
              )}

              {invoice.customer.phone && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    Phone
                  </div>
                  <p className="font-medium">{invoice.customer.phone}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-600">No customer information available.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.lines && invoice.lines.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">
                        {line.item?.name || line.itemName || 'Item'}
                      </TableCell>
                      <TableCell>{line.description || 'N/A'}</TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(line.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(line.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-gray-600">No line items for this invoice.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.notes ? (
            <p className="text-gray-800 whitespace-pre-line">{invoice.notes}</p>
          ) : (
            <p className="text-gray-600">No notes recorded for this invoice.</p>
          )}
        </CardContent>
      </Card>

      {invoice.receivePayments && invoice.receivePayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount Applied</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Total Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.receivePayments.map((rpi) => {
                    const payment = rpi.receivePayment;
                    if (!payment) return null;
                    
                    return (
                      <TableRow key={rpi.id}>
                        <TableCell>
                          {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(rpi.amount)}
                        </TableCell>
                        <TableCell>{payment.referenceNumber || 'N/A'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
