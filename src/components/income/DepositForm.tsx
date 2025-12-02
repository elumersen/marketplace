import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import {
  Deposit,
  CreateDepositData,
  UpdateDepositData,
  BankAccount,
} from '@/types/api.types';
import {
  depositAPI,
  bankAccountAPI,
  getErrorMessage,
} from '@/lib/api';

interface DepositFormProps {
  initialData?: {
    bankAccountId?: string;
    depositDate?: string;
    amount?: number;
    referenceNumber?: string | null;
    notes?: string | null;
  };
  onSuccess: (deposit: Deposit) => void;
  onCancel: () => void;
  isEditing?: boolean;
  depositId?: string;
}

export const DepositForm: React.FC<DepositFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
  isEditing = false,
  depositId,
}) => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    bankAccountId: initialData?.bankAccountId ?? '',
    depositDate: initialData?.depositDate
      ? new Date(initialData.depositDate)
      : new Date(),
    amount: initialData?.amount ?? 0,
    referenceNumber: initialData?.referenceNumber ?? '',
    notes: initialData?.notes ?? '',
  });

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const bankAccountRes = await bankAccountAPI.getAll();
      setBankAccounts(bankAccountRes ?? []);
    } catch (err) {
      console.error('Failed to load deposit form options:', err);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!formData.bankAccountId) {
      setError('Bank account is required');
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      setError('Amount must be greater than zero');
      return;
    }

    try {
      setLoading(true);
      const payloadBase = {
        bankAccountId: formData.bankAccountId,
        depositDate: formData.depositDate.toISOString(),
        amount: Number(formData.amount.toFixed(2)),
        referenceNumber: formData.referenceNumber
          ? formData.referenceNumber
          : undefined,
        notes: formData.notes ? formData.notes : undefined,
      };

      if (isEditing && depositId) {
        const payload: UpdateDepositData = {
          ...payloadBase,
        };
        const response = await depositAPI.update(depositId, payload);
        onSuccess(response.deposit);
      } else {
        const payload: CreateDepositData = {
          ...payloadBase,
        };
        const response = await depositAPI.create(payload);
        onSuccess(response.deposit);
      }
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Failed to save deposit:', err);
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
                {isEditing ? 'Edit Deposit' : 'Record New Deposit'}
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
              <Label htmlFor="bankAccountId">Bank Account *</Label>
              <Select
                value={formData.bankAccountId || undefined}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    bankAccountId: value,
                  }))
                }
              >
                <SelectTrigger id="bankAccountId">
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
                      {account.name} ({account.accountType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Deposit Date *</Label>
              <DatePicker
                date={formData.depositDate}
                setDate={(date) =>
                  setFormData((prev) => ({
                    ...prev,
                    depositDate: date ?? new Date(),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount || ''}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    amount: Number(event.target.value) || 0,
                  }))
                }
                placeholder="0.00"
                required
              />
              {formData.amount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(formData.amount)}
                </p>
              )}
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
                placeholder="Optional reference number"
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
              placeholder="Optional notes about this deposit"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : isEditing ? 'Update Deposit' : 'Record Deposit'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

