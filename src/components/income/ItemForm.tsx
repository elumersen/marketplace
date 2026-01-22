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
  CardTitle
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import {
  Item,
  ItemType,
  CreateItemData,
  Account,
  AccountType,
} from '@/types/api.types';
import {
  itemAPI,
  accountAPI,
  getErrorMessage,
} from '@/lib/api';

interface ItemFormProps {
  initialData?: Partial<CreateItemData> & {
    id?: string;
    description?: string;
    amount?: number;
    incomeAccountId?: string | null;
    expenseAccountId?: string | null;
  };
  onSuccess: (item: Item) => void;
  onCancel: () => void;
  isEditing?: boolean;
  itemId?: string;
}

interface AccountOption extends Account {
  label: string;
}

const mapAccountLabel = (account: Account): string =>
  `${account.code} - ${account.name}`;

export const ItemForm: React.FC<ItemFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
  isEditing = false,
  itemId,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incomeAccounts, setIncomeAccounts] = useState<AccountOption[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<AccountOption[]>([]);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    type: ItemType;
    amount: number | string;
    incomeAccountId: string;
    expenseAccountId: string;
  }>({
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    type: initialData?.type ?? ItemType.INCOME,
    amount: initialData?.amount ?? '',
    incomeAccountId: initialData?.incomeAccountId ?? '',
    expenseAccountId: initialData?.expenseAccountId ?? '',
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const [incomeRes, expenseRes] = await Promise.all([
        accountAPI.getAll({ type: AccountType.Income, all: 'true' }),
        accountAPI.getAll({ type: AccountType.Expense, all: 'true' }),
      ]);

      const incomeOptions =
        incomeRes.data?.map((account) => ({
          ...account,
          label: mapAccountLabel(account),
        })) ?? [];

      const expenseOptions =
        expenseRes.data?.map((account) => ({
          ...account,
          label: mapAccountLabel(account),
        })) ?? [];

      setIncomeAccounts(incomeOptions);
      setExpenseAccounts(expenseOptions);
    } catch (err) {
      console.error('Failed to load account options', err);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    // Check for empty string explicitly to allow 0 (number) or '0' (string)
    if (formData.amount === '' || Number(formData.amount) < 0) {
      setError('Amount must be zero or greater');
      return;
    }

    // Validate account requirements based on type
    if (formData.type === ItemType.INCOME) {
      if (!formData.incomeAccountId || formData.incomeAccountId === 'none') {
        setError('Income account is required for income items');
        return;
      }
    } else if (formData.type === ItemType.EXPENSE) {
      if (!formData.expenseAccountId || formData.expenseAccountId === 'none') {
        setError('Expense account is required for expense items');
        return;
      }
    }

    try {
      setLoading(true);

      const payload: CreateItemData & {
        description?: string;
      } = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        amount: Number(formData.amount),
        incomeAccountId:
          formData.type === ItemType.INCOME && formData.incomeAccountId && formData.incomeAccountId !== 'none'
            ? formData.incomeAccountId
            : undefined,
        expenseAccountId:
          formData.type === ItemType.EXPENSE && formData.expenseAccountId && formData.expenseAccountId !== 'none'
            ? formData.expenseAccountId
            : undefined,
      };

      if (isEditing && itemId) {
        const response = await itemAPI.update(itemId, payload);
        onSuccess(response.item);
      } else {
        const response = await itemAPI.create(payload);
        onSuccess(response.item);
      }
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Failed to save item:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {isEditing ? 'Update Product or Service' : 'Create Product or Service'}
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
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="e.g. Consulting Retainer"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: ItemType) => {
                  // Clear account selections when type changes
                  setFormData((prev) => ({
                    ...prev,
                    type: value,
                    incomeAccountId: value === ItemType.INCOME ? prev.incomeAccountId : '',
                    expenseAccountId: value === ItemType.EXPENSE ? prev.expenseAccountId : '',
                  }));
                }}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ItemType.INCOME}>Income</SelectItem>
                  <SelectItem value={ItemType.EXPENSE}>Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min={0}
                value={formData.amount}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    amount: event.target.value,
                  }))
                }
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              placeholder="Optional description shown on invoices"
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.type === ItemType.INCOME && (
              <div className="space-y-2">
                <Label htmlFor="incomeAccountId">Income Account *</Label>
                <Select
                  value={formData.incomeAccountId || undefined}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      incomeAccountId: value,
                    }))
                  }
                >
                  <SelectTrigger id="incomeAccountId">
                    <SelectValue placeholder="Select income account" />
                  </SelectTrigger>
                  <SelectContent>
                    {incomeAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.type === ItemType.EXPENSE && (
              <div className="space-y-2">
                <Label htmlFor="expenseAccountId">Expense Account *</Label>
                <Select
                  value={formData.expenseAccountId || undefined}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      expenseAccountId: value,
                    }))
                  }
                >
                  <SelectTrigger id="expenseAccountId">
                    <SelectValue placeholder="Select expense account" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : isEditing ? 'Update Product or Service' : 'Create Product or Service'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

