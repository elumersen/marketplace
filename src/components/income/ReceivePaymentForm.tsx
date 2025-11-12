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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  CalendarDays,
  Receipt,
} from 'lucide-react';
import {
  ReceivePayment,
  CreateReceivePaymentData,
  UpdateReceivePaymentData,
  Invoice,
  BankAccount,
} from '@/types/api.types';
import {
  receivePaymentAPI,
  invoiceAPI,
  bankAccountAPI,
  getErrorMessage,
} from '@/lib/api';

interface ReceivePaymentFormProps {
  initialData?: {
    invoiceId?: string;
    bankAccountId?: string;
    paymentDate?: string;
    amount?: number;
    referenceNumber?: string | null;
    notes?: string | null;
  };
  onSuccess: (payment: ReceivePayment) => void;
  onCancel: () => void;
  isEditing?: boolean;
  receivePaymentId?: string;
}

type InvoiceOption = Pick<
  Invoice,
  'id' | 'invoiceNumber' | 'customer' | 'totalAmount' | 'paidAmount' | 'balanceDue'
>;

export const ReceivePaymentForm: React.FC<ReceivePaymentFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
  isEditing = false,
  receivePaymentId,
}) => {
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const [formData, setFormData] = useState({
    invoiceId: initialData?.invoiceId ?? '',
    bankAccountId: initialData?.bankAccountId ?? '',
    paymentDate: initialData?.paymentDate
      ? new Date(initialData.paymentDate)
      : new Date(),
    amount: initialData?.amount ?? 0,
    referenceNumber: initialData?.referenceNumber ?? '',
    notes: initialData?.notes ?? '',
  });

  const initialAmount = useMemo(
    () => initialData?.amount ?? 0,
    [initialData?.amount]
  );

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    if (formData.invoiceId) {
      fetchInvoice(formData.invoiceId);
    } else {
      setSelectedInvoice(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.invoiceId]);

  const loadOptions = async () => {
    try {
      const [invoiceRes, bankAccountRes] = await Promise.all([
        invoiceAPI.getAll(),
        bankAccountAPI.getAll(),
      ]);

      const mappedInvoices =
        invoiceRes.invoices?.map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customer: invoice.customer,
          totalAmount: invoice.totalAmount,
          paidAmount: invoice.paidAmount,
          balanceDue:
            invoice.balanceDue ??
            Number((invoice.totalAmount - invoice.paidAmount).toFixed(2)),
        })) ?? [];

      setInvoices(mappedInvoices);
      setBankAccounts(bankAccountRes);

      if (
        initialData?.invoiceId &&
        !mappedInvoices.find((inv) => inv.id === initialData.invoiceId)
      ) {
        // Ensure the invoice used in editing appears in the list.
        try {
          const invoice = await invoiceAPI.getById(initialData.invoiceId);
          setInvoices((prev) => [
            ...prev,
            {
              id: invoice.invoice.id,
              invoiceNumber: invoice.invoice.invoiceNumber,
              customer: invoice.invoice.customer,
              totalAmount: invoice.invoice.totalAmount,
              paidAmount: invoice.invoice.paidAmount,
              balanceDue:
                invoice.invoice.balanceDue ??
                Number(
                  (
                    invoice.invoice.totalAmount - invoice.invoice.paidAmount
                  ).toFixed(2)
                ),
            },
          ]);
        } catch (err) {
          console.error('Failed to load invoice for editing:', err);
        }
      }
    } catch (err) {
      console.error('Failed to load receive payment form options:', err);
    }
  };

  const fetchInvoice = async (invoiceId: string) => {
    setInvoiceLoading(true);
    try {
      const response = await invoiceAPI.getById(invoiceId);
      setSelectedInvoice(response.invoice);
      const balance =
        response.invoice.balanceDue ??
        Number(
          (response.invoice.totalAmount - response.invoice.paidAmount).toFixed(2)
        );
      if (!isEditing || formData.amount === 0) {
        setFormData((prev) => ({
          ...prev,
          amount: Number(balance.toFixed(2)),
        }));
      }
    } catch (err) {
      console.error('Failed to fetch invoice details:', err);
      setSelectedInvoice(null);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!formData.invoiceId && !isEditing) {
      setError('Invoice is required');
      return;
    }

    if (!formData.bankAccountId) {
      setError('Bank account is required');
      return;
    }

    if (!formData.paymentDate) {
      setError('Payment date is required');
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      setError('Amount must be greater than zero');
      return;
    }

    if (selectedInvoice) {
      const outstanding = invoiceBalance ?? 0;
      const allowed = isEditing ? outstanding + initialAmount : outstanding;
      if (formData.amount > allowed + 0.01) {
        setError(
          `Amount exceeds the outstanding balance for this invoice (${formatCurrency(
            allowed
          )}).`
        );
        return;
      }
    }

    try {
      setLoading(true);
      const payloadBase = {
        paymentDate: formData.paymentDate.toISOString(),
        amount: Number(formData.amount),
        referenceNumber: formData.referenceNumber
          ? formData.referenceNumber
          : undefined,
        notes: formData.notes ? formData.notes : undefined,
      };

      if (isEditing && receivePaymentId) {
        const payload: UpdateReceivePaymentData = {
          ...payloadBase,
        };
        const response = await receivePaymentAPI.update(
          receivePaymentId,
          payload
        );
        onSuccess(response.receivePayment);
      } else {
        const payload: CreateReceivePaymentData = {
          invoiceId: formData.invoiceId,
          bankAccountId: formData.bankAccountId,
          paymentDate: payloadBase.paymentDate,
          amount: payloadBase.amount,
          referenceNumber: payloadBase.referenceNumber,
          notes: payloadBase.notes,
        };
        const response = await receivePaymentAPI.create(payload);
        onSuccess(response.receivePayment);
      }
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Failed to save receive payment:', err);
    } finally {
      setLoading(false);
    }
  };

  const invoiceBalance = useMemo(() => {
    if (!selectedInvoice) return null;
    return (
      selectedInvoice.balanceDue ??
      Number(
        (
          selectedInvoice.totalAmount - selectedInvoice.paidAmount
        ).toFixed(2)
      )
    );
  }, [selectedInvoice]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {isEditing ? 'Edit Payment' : 'Record New Payment'}
              </CardTitle>
            </div>
            <Button type="button" variant="outline" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceId">Invoice *</Label>
              <Select
                value={formData.invoiceId || undefined}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    invoiceId: value,
                  }))
                }
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice" />
                </SelectTrigger>
                <SelectContent>
                  {invoices.length === 0 && (
                    <SelectItem value="none" disabled>
                      No invoices available
                    </SelectItem>
                  )}
                  {invoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber}
                      {invoice.customer?.name
                        ? ` — ${invoice.customer.name}`
                        : ''}
                      {typeof invoice.balanceDue === 'number'
                        ? ` (${formatCurrency(invoice.balanceDue)})`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankAccountId">Bank Account *</Label>
              <Select
                value={formData.bankAccountId || undefined}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    bankAccountId: value,
                  }))
                }
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.length === 0 && (
                    <SelectItem value="none" disabled>
                      No bank accounts available
                    </SelectItem>
                  )}
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
              <Label>Payment Date *</Label>
              <DatePicker
                date={formData.paymentDate}
                setDate={(date) =>
                  setFormData((prev) => ({
                    ...prev,
                    paymentDate: date ?? new Date(),
                  }))
                }
              />
              {selectedInvoice && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      amount: Number((invoiceBalance ?? 0 + (isEditing ? initialAmount : 0)).toFixed(2)),
                    }))
                  }
                >
                  Fill outstanding
                </Button>
              )}
              {selectedInvoice && (
                <p className="text-xs text-muted-foreground">
                  Outstanding balance:{' '}
                  <span className="font-medium">
                    {formatCurrency(invoiceBalance ?? 0)}
                  </span>
                  {isEditing && initialAmount
                    ? ` • Original payment: ${formatCurrency(initialAmount)}`
                    : ''}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    amount: Number(event.target.value),
                  }))
                }
                min={0.01}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="referenceNumber">Reference Number</Label>
              <Input
                id="referenceNumber"
                value={formData.referenceNumber}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    referenceNumber: event.target.value,
                  }))
                }
                placeholder="Check number, transaction reference, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                rows={4}
                placeholder="Optional notes about this payment"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Invoice Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {formData.invoiceId && invoiceLoading && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CalendarDays className="h-4 w-4 animate-pulse" />
                    Loading invoice details...
                  </div>
                )}
                {!formData.invoiceId && (
                  <p className="text-sm text-gray-600">
                    Select an invoice to view its outstanding balance.
                  </p>
                )}
                {selectedInvoice && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="space-y-1">
                      <span className="text-gray-500">Invoice Number</span>
                      <p className="font-medium">
                        {selectedInvoice.invoiceNumber}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-500">Customer</span>
                      <p className="font-medium">
                        {selectedInvoice.customer?.name ?? '—'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-500">Total</span>
                      <p className="font-medium">
                        {formatCurrency(selectedInvoice.totalAmount)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-500">Paid</span>
                      <p className="font-medium">
                        {formatCurrency(selectedInvoice.paidAmount)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-500">Outstanding</span>
                      <p
                        className={`font-medium ${
                          invoiceBalance && invoiceBalance > 0
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}
                      >
                        {formatCurrency(invoiceBalance ?? 0)}
                      </p>
                    </div>
                    {isEditing && (
                      <div className="space-y-1">
                        <span className="text-gray-500">Current Payment</span>
                        <p className="font-medium">
                          {formatCurrency(initialAmount)}
                        </p>
                        {selectedInvoice && (
                          <p className="text-xs text-muted-foreground mt-3">
                            Tip: you can split payments across invoices later. For now,
                            we recommend applying{' '}
                            <span className="font-semibold">
                              {formatCurrency(invoiceBalance ?? 0)}
                            </span>{' '}
                            to clear this balance.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : isEditing ? 'Update Payment' : 'Record Payment'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

