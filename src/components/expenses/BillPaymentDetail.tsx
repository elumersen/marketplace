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
} from 'lucide-react';
import { BillPayment } from '@/types/api.types';
import { billPaymentAPI, getErrorMessage } from '@/lib/api';
import { format } from 'date-fns';

interface BillPaymentDetailProps {
  billPaymentId: string;
  onBack?: () => void;
  onEdit?: (payment: BillPayment) => void;
}

export const BillPaymentDetail: React.FC<BillPaymentDetailProps> = ({
  billPaymentId,
  onBack,
  onEdit,
}) => {
  const [billPayment, setBillPayment] = useState<BillPayment | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBillPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billPaymentId]);

  const loadBillPayment = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await billPaymentAPI.getById(billPaymentId);
      setBillPayment(response.billPayment);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Failed to load bill payment:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  const safeFormatDate = (dateString: string | null | undefined, formatStr: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return format(date, formatStr);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error || !billPayment) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Bill payment not found'}
        </AlertDescription>
      </Alert>
    );
  }

  const bills = billPayment.billPaymentBills || [];
  const journalEntry = billPayment.journalEntry;

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
              {safeFormatDate(billPayment.paymentDate, 'MMMM dd, yyyy')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={() => onEdit?.(billPayment)}
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
                {safeFormatDate(billPayment.paymentDate, 'MMMM dd, yyyy')}
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Amount
              </span>
              <p className="text-lg font-semibold">
                {formatCurrency(billPayment.amount)}
              </p>
            </div>

            {billPayment.checkNumber && (
              <div className="space-y-2">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Check Number
                </span>
                <p className="font-medium">{billPayment.checkNumber}</p>
              </div>
            )}

            {billPayment.referenceNumber && (
              <div className="space-y-2">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Reference Number
                </span>
                <p className="font-medium">{billPayment.referenceNumber}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Bills Applied To
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bills.length > 0 ? (
            <div className="space-y-4">
              {bills.map((bpb) => {
                const bill = bpb.bill;
                if (!bill) return null;
                
                const balanceDue = bill.totalAmount - bill.paidAmount;
                
                return (
                  <div
                    key={bpb.id}
                    className="border rounded-lg p-4 space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <span className="text-sm text-gray-500 flex items-center gap-2">
                          <Receipt className="h-4 w-4" />
                          Bill Number
                        </span>
                        <p className="font-medium">{bill.billNumber}</p>
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm text-gray-500">Vendor</span>
                        <p className="font-medium">{bill.vendor?.name ?? '—'}</p>
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm text-gray-500">Amount Applied</span>
                        <p className="font-medium text-lg">
                          {formatCurrency(bpb.amount)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm text-gray-500">Bill Date</span>
                        <p className="font-medium">
                          {safeFormatDate(bill.billDate, 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm text-gray-500">Due Date</span>
                        <p className="font-medium">
                          {safeFormatDate(bill.dueDate, 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm text-gray-500">Bill Total</span>
                        <p className="font-medium">
                          {formatCurrency(bill.totalAmount)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm text-gray-500">Paid Amount</span>
                        <p className="font-medium">
                          {formatCurrency(bill.paidAmount)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm text-gray-500">Balance Due</span>
                        <p className="font-medium">
                          {formatCurrency(balanceDue)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm text-gray-500">Status</span>
                        <p className="font-medium">{bill.status}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : billPayment.bill ? (
            // Fallback for backward compatibility with old single bill structure
            <div className="space-y-4">
              <div className="border rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <span className="text-sm text-gray-500 flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Bill Number
                    </span>
                    <p className="font-medium">{billPayment.bill.billNumber}</p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-gray-500">Vendor</span>
                    <p className="font-medium">{billPayment.bill.vendor?.name ?? '—'}</p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-gray-500">Bill Date</span>
                    <p className="font-medium">
                      {safeFormatDate(billPayment.bill.billDate, 'MMMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-gray-500">Due Date</span>
                    <p className="font-medium">
                      {safeFormatDate(billPayment.bill.dueDate, 'MMMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-gray-500">Bill Total</span>
                    <p className="font-medium">
                      {formatCurrency(billPayment.bill.totalAmount)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-gray-500">Paid Amount</span>
                    <p className="font-medium">
                      {formatCurrency(billPayment.bill.paidAmount)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-gray-500">Balance Due</span>
                    <p
                      className={`font-medium ${
                        (billPayment.bill.totalAmount - billPayment.bill.paidAmount) > 0
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(
                        billPayment.bill.totalAmount - billPayment.bill.paidAmount
                      )}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-gray-500">Status</span>
                    <p className="font-medium">{billPayment.bill.status}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No bills associated with this payment.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {billPayment.notes ? (
            <p className="text-gray-800 whitespace-pre-line">
              {billPayment.notes}
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
