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
  Plus,
  X,
} from 'lucide-react';
import {
  ReceivePayment,
  CreateReceivePaymentData,
  UpdateReceivePaymentData,
  Invoice,
} from '@/types/api.types';
import {
  receivePaymentAPI,
  invoiceAPI,
  getErrorMessage,
} from '@/lib/api';

interface ReceivePaymentFormProps {
  initialData?: {
    invoices?: Array<{ invoiceId: string; amount: number }>;
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

interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
}

export const ReceivePaymentForm: React.FC<ReceivePaymentFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
  isEditing = false,
  receivePaymentId,
}) => {
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [invoicePayments, setInvoicePayments] = useState<InvoicePayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    paymentDate: initialData?.paymentDate
      ? new Date(initialData.paymentDate)
      : new Date(),
    amount: initialData?.amount ?? 0,
    referenceNumber: initialData?.referenceNumber ?? '',
    notes: initialData?.notes ?? '',
  });

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    if (initialData?.invoices && initialData.invoices.length > 0) {
      setInvoicePayments(
        initialData.invoices.map((inv) => ({
          id: `inv-${Date.now()}-${Math.random()}`,
          invoiceId: inv.invoiceId,
          amount: inv.amount,
        }))
      );
    } else if (!isEditing) {
      // Start with one empty invoice payment
      setInvoicePayments([{ id: `inv-${Date.now()}-${Math.random()}`, invoiceId: '', amount: 0 }]);
    }
  }, [initialData, isEditing]);

  const loadOptions = async () => {
    try {
      const invoiceRes = await invoiceAPI.getAll();

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

      // If editing and we have invoice IDs, ensure they're in the list
      if (isEditing && initialData?.invoices) {
        for (const invPayment of initialData.invoices) {
          if (!mappedInvoices.find((inv) => inv.id === invPayment.invoiceId)) {
            try {
              const invoice = await invoiceAPI.getById(invPayment.invoiceId);
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
        }
      }
    } catch (err) {
      console.error('Failed to load receive payment form options:', err);
    }
  };

  const fetchInvoice = async (invoiceId: string, paymentId: string) => {
    if (!invoiceId) return;
    
    setInvoiceLoading((prev) => ({ ...prev, [paymentId]: true }));
    try {
      const response = await invoiceAPI.getById(invoiceId);
      const balance =
        response.invoice.balanceDue ??
        Number(
          (response.invoice.totalAmount - response.invoice.paidAmount).toFixed(2)
        );
      
      // Update the amount for this invoice payment
      setInvoicePayments((prev) => {
        return prev.map((inv) =>
          inv.id === paymentId
            ? {
                ...inv,
                invoiceId,
                amount: balance > 0 ? Number(balance.toFixed(2)) : 0,
              }
            : inv
        );
      });
    } catch (err) {
      console.error('Failed to fetch invoice details:', err);
    } finally {
      setInvoiceLoading((prev) => ({ ...prev, [paymentId]: false }));
    }
  };

  const addInvoicePayment = () => {
    setInvoicePayments((prev) => [
      { id: `inv-${Date.now()}-${Math.random()}`, invoiceId: '', amount: 0 },
      ...prev,
    ]);
  };

  const removeInvoicePayment = (id: string) => {
    setInvoicePayments((prev) => prev.filter((inv) => inv.id !== id));
  };

  const updateInvoicePayment = (id: string, field: 'invoiceId' | 'amount', value: string | number) => {
    setInvoicePayments((prev) => {
      return prev.map((inv) =>
        inv.id === id
          ? {
              ...inv,
              [field]: field === 'amount' ? Number(value) : value,
            }
          : inv
      );
    });

    if (field === 'invoiceId' && value) {
      fetchInvoice(value as string, id);
    }
  };

  const calculateTotalAmount = useMemo(() => {
    return invoicePayments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [invoicePayments]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      amount: Number(calculateTotalAmount.toFixed(2)),
    }));
  }, [calculateTotalAmount]);

  const getInvoiceBalance = (invoiceId: string) => {
    if (!invoiceId) return null;
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return null;
    return invoice.balanceDue ?? Number((invoice.totalAmount - invoice.paidAmount).toFixed(2));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (invoicePayments.length === 0) {
      setError('At least one invoice is required');
      return;
    }

    // Validate all invoice payments
    for (let i = 0; i < invoicePayments.length; i++) {
      const invPayment = invoicePayments[i];
      if (!invPayment.invoiceId) {
        setError(`Invoice ${i + 1} is required`);
        return;
      }
      if (!invPayment.amount || invPayment.amount <= 0) {
        setError(`Amount for invoice ${i + 1} must be greater than zero`);
        return;
      }

      const balance = getInvoiceBalance(invPayment.invoiceId);
      if (balance !== null && invPayment.amount > balance + 0.01) {
        const invoice = invoices.find((inv) => inv.id === invPayment.invoiceId);
        setError(
          `Amount for invoice ${invoice?.invoiceNumber || invPayment.invoiceId} (${formatCurrency(
            invPayment.amount
          )}) exceeds outstanding balance (${formatCurrency(balance)})`
        );
        return;
      }
    }

    // Validate total amount matches sum of invoice amounts
    const totalAmount = invoicePayments.reduce((sum, inv) => sum + inv.amount, 0);
    if (Math.abs(totalAmount - formData.amount) > 0.01) {
      setError(
        `Total amount (${formatCurrency(formData.amount)}) must equal sum of invoice amounts (${formatCurrency(totalAmount)})`
      );
      return;
    }

    try {
      setLoading(true);
      const payloadBase = {
        paymentDate: formData.paymentDate.toISOString(),
        amount: Number(formData.amount.toFixed(2)),
        invoices: invoicePayments.map((inv) => ({
          invoiceId: inv.invoiceId,
          amount: Number(inv.amount.toFixed(2)),
        })),
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
          ...payloadBase,
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
            </div>

            <div className="space-y-2">
              <Label>Total Amount</Label>
              <div className="flex items-center h-10 px-3 py-2 text-lg font-medium">
                {formatCurrency(formData.amount)}
              </div>
              {/* <p className="text-xs text-muted-foreground">
                Automatically calculated from invoice amounts
              </p> */}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Invoices *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addInvoicePayment}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Invoice
              </Button>
            </div>

            {invoicePayments.map((invPayment, index) => {
              const invoice = invoices.find((inv) => inv.id === invPayment.invoiceId);
              const originalBalance = getInvoiceBalance(invPayment.invoiceId);
              const updatedOutstanding = originalBalance !== null 
                ? Math.max(0, Number((originalBalance - (invPayment.amount || 0)).toFixed(2)))
                : null;

              return (
                <Card key={invPayment.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Invoice {index + 1} *</Label>
                          <Select
                            value={invPayment.invoiceId || undefined}
                            onValueChange={(value) =>
                              updateInvoicePayment(invPayment.id, 'invoiceId', value)
                            }
                            disabled={isEditing && invoicePayments.length > 0}
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
                              {invoices.map((inv) => (
                                <SelectItem key={inv.id} value={inv.id}>
                                  {inv.invoiceNumber}
                                  {inv.customer?.name
                                    ? ` — ${inv.customer.name}`
                                    : ''}
                                  {typeof inv.balanceDue === 'number'
                                    ? ` (${formatCurrency(inv.balanceDue)})`
                                    : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {invoiceLoading[invPayment.id] && (
                            <p className="text-xs text-muted-foreground">
                              Loading invoice details...
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Amount *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={invPayment.amount || ''}
                            onChange={(event) =>
                              updateInvoicePayment(
                                invPayment.id,
                                'amount',
                                event.target.value
                              )
                            }
                            min={0.01}
                            placeholder="0.00"
                          />
                          {originalBalance !== null && (
                            <p className="text-xs text-muted-foreground">
                              Outstanding: {formatCurrency(updatedOutstanding ?? originalBalance)}
                              {invPayment.amount > 0 && (
                                <span className="ml-2">
                                  (was {formatCurrency(originalBalance)})
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      {invoicePayments.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeInvoicePayment(invPayment.id)}
                          className="mt-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {invoice && (
                      <div className="mt-4 p-3 bg-muted rounded-md">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Customer:</span>
                            <p className="font-medium">
                              {invoice.customer?.name ?? '—'}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <p className="font-medium">
                              {formatCurrency(invoice.totalAmount)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Paid:</span>
                            <p className="font-medium">
                              {formatCurrency(invoice.paidAmount)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Outstanding:</span>
                            <p
                              className={`font-medium ${
                                updatedOutstanding && updatedOutstanding > 0
                                  ? 'text-red-600'
                                  : 'text-green-600'
                              }`}
                            >
                              {formatCurrency(updatedOutstanding ?? originalBalance ?? 0)}
                              {invPayment.amount > 0 && originalBalance !== null && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  (was {formatCurrency(originalBalance)})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
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
