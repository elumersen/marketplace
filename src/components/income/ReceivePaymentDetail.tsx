import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Edit,
  DollarSign,
  CalendarDays,
  Receipt,
  AlertCircle,
  Hash,
  FileText,
} from 'lucide-react';
import { ReceivePayment } from '@/types/api.types';
import { receivePaymentAPI, getErrorMessage } from '@/lib/api';
import { format } from 'date-fns';

interface ReceivePaymentDetailProps {
  receivePaymentId: string;
  onBack?: () => void;
  onEdit?: (payment: ReceivePayment) => void;
}

export const ReceivePaymentDetail: React.FC<ReceivePaymentDetailProps> = ({
  receivePaymentId,
  onBack,
  onEdit,
}) => {
  const [receivePayment, setReceivePayment] = useState<ReceivePayment | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReceivePayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivePaymentId]);

  const loadReceivePayment = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await receivePaymentAPI.getById(receivePaymentId);
      setReceivePayment(response.receivePayment);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Failed to load receive payment:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error || !receivePayment) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Receive payment not found'}
        </AlertDescription>
      </Alert>
    );
  }

  const invoice = receivePayment.invoice;
  const bankAccount = receivePayment.bankAccount;
  const journalEntry = receivePayment.journalEntry;

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
            <h1 className="text-2xl font-bold">Payment Details</h1>
            <p className="text-gray-600">
              Recorded on{' '}
              {format(new Date(receivePayment.paymentDate), 'MMMM dd, yyyy')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={() => onEdit?.(receivePayment)}
            disabled={!receivePayment.isActive}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Payment Date
              </span>
              <p className="font-medium">
                {format(new Date(receivePayment.paymentDate), 'MMMM dd, yyyy')}
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Amount
              </span>
              <p className="text-lg font-semibold">
                {formatCurrency(receivePayment.amount)}
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Reference Number
              </span>
              <p className="font-medium">
                {receivePayment.referenceNumber || '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoice Applied To
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoice ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Invoice Number
                </span>
                <p className="font-medium">{invoice.invoiceNumber}</p>
              </div>
              <div className="space-y-2">
                <span className="text-sm text-gray-500">Customer</span>
                <p className="font-medium">{invoice.customer?.name ?? '—'}</p>
              </div>
              <div className="space-y-2">
                <span className="text-sm text-gray-500">Invoice Total</span>
                <p className="font-medium">
                  {formatCurrency(invoice.totalAmount)}
                </p>
              </div>
              <div className="space-y-2">
                <span className="text-sm text-gray-500">Paid Amount</span>
                <p className="font-medium">
                  {formatCurrency(invoice.paidAmount)}
                </p>
              </div>
              <div className="space-y-2">
                <span className="text-sm text-gray-500">Balance Due</span>
                <p className="font-medium">
                  {formatCurrency(
                    invoice.balanceDue ??
                      invoice.totalAmount - invoice.paidAmount
                  )}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">Invoice information unavailable.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank Account</CardTitle>
        </CardHeader>
        <CardContent>
          {bankAccount ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Account Name</p>
                <p className="font-medium">{bankAccount.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Account Number</p>
                <p className="font-medium">
                  {bankAccount.accountNumber || '—'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No bank account information.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {receivePayment.notes ? (
            <p className="text-gray-800 whitespace-pre-line">
              {receivePayment.notes}
            </p>
          ) : (
            <p className="text-gray-600">No notes for this payment.</p>
          )}
        </CardContent>
      </Card>

      {journalEntry && (
        <Card>
          <CardHeader>
            <CardTitle>Journal Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-sm text-gray-500">Entry Number</p>
              <p className="font-medium">{journalEntry.entryNumber}</p>
            </div>
            {journalEntry.lines && journalEntry.lines.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journalEntry.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          {line.account
                            ? `${line.account.code} - ${line.account.name}`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(line.debit)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(line.credit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

