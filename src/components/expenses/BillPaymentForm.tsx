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
  BillPayment,
  CreateBillPaymentData,
  UpdateBillPaymentData,
  Bill,
  BillStatus,
  BankAccount,
} from '@/types/api.types';
import {
  billPaymentAPI,
  billAPI,
  bankAccountAPI,
  getErrorMessage,
} from '@/lib/api';

interface BillPaymentFormProps {
  initialData?: {
    bills?: Array<{ billId: string; amount: number }>;
    bankAccountId?: string;
    paymentDate?: string;
    amount?: number;
    checkNumber?: string | null;
    referenceNumber?: string | null;
    notes?: string | null;
  };
  onSuccess: (payment: BillPayment) => void;
  onCancel: () => void;
  isEditing?: boolean;
  billPaymentId?: string;
}

type BillOption = Pick<
  Bill,
  'id' | 'billNumber' | 'vendor' | 'totalAmount' | 'paidAmount'
> & {
  balanceDue?: number;
};

interface BillPaymentItem {
  id: string;
  billId: string;
  amount: number;
}

export const BillPaymentForm: React.FC<BillPaymentFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
  isEditing = false,
  billPaymentId,
}) => {
  const [bills, setBills] = useState<BillOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [billPayments, setBillPayments] = useState<BillPaymentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billLoading, setBillLoading] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    bankAccountId: initialData?.bankAccountId ?? '',
    paymentDate: initialData?.paymentDate
      ? new Date(initialData.paymentDate)
      : new Date(),
    amount: initialData?.amount ?? 0,
    checkNumber: initialData?.checkNumber ?? '',
    referenceNumber: initialData?.referenceNumber ?? '',
    notes: initialData?.notes ?? '',
  });

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    if (initialData?.bills && initialData.bills.length > 0) {
      setBillPayments(
        initialData.bills.map((bill) => ({
          id: `bill-${Date.now()}-${Math.random()}`,
          billId: bill.billId,
          amount: bill.amount,
        }))
      );
    } else if (!isEditing) {
      // Start with one empty bill payment
      setBillPayments([{ id: `bill-${Date.now()}-${Math.random()}`, billId: '', amount: 0 }]);
    }
  }, [initialData, isEditing]);

  const loadOptions = async () => {
    try {
      const [billRes, bankAccountRes] = await Promise.all([
        billAPI.getAll(),
        bankAccountAPI.getAll(),
      ]);

      const mappedBills =
        billRes.bills
          ?.filter((bill) => String(bill.status).trim() !== 'PAID')
          .map((bill) => ({
            id: bill.id,
            billNumber: bill.billNumber,
            vendor: bill.vendor,
            totalAmount: bill.totalAmount,
            paidAmount: bill.paidAmount,
            balanceDue: Number((bill.totalAmount - bill.paidAmount).toFixed(2)),
          })) ?? [];

      setBills(mappedBills);
      setBankAccounts(bankAccountRes || []);

      // If editing and we have bill IDs, ensure they're in the list
      if (isEditing && initialData?.bills) {
        for (const billPayment of initialData.bills) {
          if (!mappedBills.find((bill) => bill.id === billPayment.billId)) {
            try {
              const bill = await billAPI.getById(billPayment.billId);
              setBills((prev) => [
                ...prev,
                {
                  id: bill.bill.id,
                  billNumber: bill.bill.billNumber,
                  vendor: bill.bill.vendor,
                  totalAmount: bill.bill.totalAmount,
                  paidAmount: bill.bill.paidAmount,
                  balanceDue: Number(
                    (
                      bill.bill.totalAmount - bill.bill.paidAmount
                    ).toFixed(2)
                  ),
                },
              ]);
            } catch (err) {
              console.error('Failed to load bill for editing:', err);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load bill payment form options:', err);
    }
  };

  const fetchBill = async (billId: string, paymentId: string) => {
    if (!billId) return;
    
    setBillLoading((prev) => ({ ...prev, [paymentId]: true }));
    try {
      const response = await billAPI.getById(billId);
      const balance = Number(
        (response.bill.totalAmount - response.bill.paidAmount).toFixed(2)
      );
      
      // Update the amount for this bill payment
      setBillPayments((prev) => {
        return prev.map((bill) =>
          bill.id === paymentId
            ? {
                ...bill,
                billId,
                amount: balance > 0 ? Number(balance.toFixed(2)) : 0,
              }
            : bill
        );
      });
    } catch (err) {
      console.error('Failed to fetch bill details:', err);
    } finally {
      setBillLoading((prev) => ({ ...prev, [paymentId]: false }));
    }
  };

  const addBillPayment = () => {
    setBillPayments((prev) => [
      { id: `bill-${Date.now()}-${Math.random()}`, billId: '', amount: 0 },
      ...prev,
    ]);
  };

  const removeBillPayment = (id: string) => {
    setBillPayments((prev) => prev.filter((bill) => bill.id !== id));
  };

  const updateBillPayment = (id: string, field: 'billId' | 'amount', value: string | number) => {
    // Check for duplicate bill when setting billId
    if (field === 'billId' && value) {
      const isDuplicate = billPayments.some(
        (bill) => bill.id !== id && bill.billId === value && bill.billId !== ''
      );
      
      if (isDuplicate) {
        setError(`This bill is already selected in another line. Please select a different bill.`);
        return;
      }
    }

    setBillPayments((prev) => {
      return prev.map((bill) =>
        bill.id === id
          ? {
              ...bill,
              [field]: field === 'amount' ? Number(value) : value,
            }
          : bill
      );
    });

    if (field === 'billId' && value) {
      setError(null); // Clear error when successfully selecting a bill
      fetchBill(value as string, id);
    }
  };

  const calculateTotalAmount = useMemo(() => {
    return billPayments.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  }, [billPayments]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      amount: Number(calculateTotalAmount.toFixed(2)),
    }));
  }, [calculateTotalAmount]);

  const getBillBalance = (billId: string) => {
    if (!billId) return null;
    const bill = bills.find((b) => b.id === billId);
    if (!bill) return null;
    return bill.balanceDue ?? Number((bill.totalAmount - bill.paidAmount).toFixed(2));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (billPayments.length === 0) {
      setError('At least one bill is required');
      return;
    }

    if (!formData.bankAccountId) {
      setError('Please select a bank account');
      return;
    }

    // Check for duplicate bills
    const billIds = billPayments
      .map((bill) => bill.billId)
      .filter((id) => id !== '');
    const uniqueBillIds = new Set(billIds);
    if (billIds.length !== uniqueBillIds.size) {
      setError('Each bill can only be added once. Please remove duplicate bills.');
      return;
    }

    // Validate all bill payments
    for (let i = 0; i < billPayments.length; i++) {
      const billPayment = billPayments[i];
      if (!billPayment.billId) {
        setError(`Bill ${i + 1} is required`);
        return;
      }
      if (!billPayment.amount || billPayment.amount <= 0) {
        setError(`Amount for bill ${i + 1} must be greater than zero`);
        return;
      }

      const balance = getBillBalance(billPayment.billId);
      if (balance !== null && billPayment.amount > balance + 0.01) {
        const bill = bills.find((b) => b.id === billPayment.billId);
        setError(
          `Amount for bill ${bill?.billNumber || billPayment.billId} (${formatCurrency(
            billPayment.amount
          )}) exceeds outstanding balance (${formatCurrency(balance)})`
        );
        return;
      }
    }

    // Validate total amount matches sum of bill amounts
    const totalAmount = billPayments.reduce((sum, bill) => sum + bill.amount, 0);
    if (Math.abs(totalAmount - formData.amount) > 0.01) {
      setError(
        `Total amount (${formatCurrency(formData.amount)}) must equal sum of bill amounts (${formatCurrency(totalAmount)})`
      );
      return;
    }

    try {
      setLoading(true);
      const payloadBase = {
        paymentDate: formData.paymentDate.toISOString(),
        amount: Number(formData.amount.toFixed(2)),
        bills: billPayments.map((bill) => ({
          billId: bill.billId,
          amount: Number(bill.amount.toFixed(2)),
        })),
        bankAccountId: formData.bankAccountId,
        checkNumber: formData.checkNumber ? formData.checkNumber : undefined,
        referenceNumber: formData.referenceNumber
          ? formData.referenceNumber
          : undefined,
        notes: formData.notes ? formData.notes : undefined,
      };

      if (isEditing && billPaymentId) {
        const payload: UpdateBillPaymentData = {
          ...payloadBase,
        };
        const response = await billPaymentAPI.update(billPaymentId, payload);
        onSuccess(response.billPayment);
      } else {
        const payload: CreateBillPaymentData = {
          ...payloadBase,
        };
        const response = await billPaymentAPI.create(payload);
        onSuccess(response.billPayment);
      }
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Failed to save bill payment:', err);
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
              <Label>Bank Account *</Label>
              <Select
                value={formData.bankAccountId || undefined}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, bankAccountId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} - {account.accountNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Total Amount</Label>
              <div className="flex items-center h-10 px-3 py-2 text-lg font-medium">
                {formatCurrency(formData.amount)}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Bills *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBillPayment}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Bill
              </Button>
            </div>

            {billPayments.map((billPayment, index) => {
              const bill = bills.find((b) => b.id === billPayment.billId);
              const originalBalance = getBillBalance(billPayment.billId);
              const updatedOutstanding = originalBalance !== null 
                ? Math.max(0, Number((originalBalance - (billPayment.amount || 0)).toFixed(2)))
                : null;

              // Filter out bills that are already selected in other lines
              const availableBills = bills.filter((b) => {
                // Always include the currently selected bill for this line
                if (b.id === billPayment.billId) return true;
                // Exclude bills that are selected in other lines
                return !billPayments.some(
                  (otherBill) => otherBill.id !== billPayment.id && otherBill.billId === b.id && otherBill.billId !== ''
                );
              });

              return (
                <Card key={billPayment.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Bill {index + 1} *</Label>
                          <Select
                            value={billPayment.billId || undefined}
                            onValueChange={(value) =>
                              updateBillPayment(billPayment.id, 'billId', value)
                            }
                            disabled={isEditing && billPayments.length > 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select bill" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableBills.length === 0 && (
                                <SelectItem value="none" disabled>
                                  No bills available
                                </SelectItem>
                              )}
                              {availableBills.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.billNumber}
                                  {b.vendor?.name
                                    ? ` — ${b.vendor.name}`
                                    : ''}
                                  {typeof b.balanceDue === 'number'
                                    ? ` (${formatCurrency(b.balanceDue)})`
                                    : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {billLoading[billPayment.id] && (
                            <p className="text-xs text-muted-foreground">
                              Loading bill details...
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Amount *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={billPayment.amount || ''}
                            onChange={(event) =>
                              updateBillPayment(
                                billPayment.id,
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
                              {billPayment.amount > 0 && (
                                <span className="ml-2">
                                  (was {formatCurrency(originalBalance)})
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      {billPayments.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBillPayment(billPayment.id)}
                          className="mt-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {bill && (
                      <div className="mt-4 p-3 bg-muted rounded-md">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Vendor:</span>
                            <p className="font-medium">
                              {bill.vendor?.name ?? '—'}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <p className="font-medium">
                              {formatCurrency(bill.totalAmount)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Paid:</span>
                            <p className="font-medium">
                              {formatCurrency(bill.paidAmount)}
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
                              {billPayment.amount > 0 && originalBalance !== null && (
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
              <Label htmlFor="checkNumber">Check Number</Label>
              <Input
                id="checkNumber"
                value={formData.checkNumber}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    checkNumber: event.target.value,
                  }))
                }
                placeholder="Optional check number"
              />
            </div>

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
                placeholder="Transaction reference, etc."
              />
            </div>
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
