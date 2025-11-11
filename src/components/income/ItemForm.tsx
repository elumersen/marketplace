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
  CardDescription,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
    unitPrice?: number;
    incomeAccountId?: string | null;
    expenseAccountId?: string | null;
    taxable?: boolean;
    cost?: number | null;
    isActive?: boolean;
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

  const [formData, setFormData] = useState({
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    type: initialData?.type ?? ItemType.SERVICE,
    unitPrice: initialData?.unitPrice ?? 0,
    incomeAccountId: initialData?.incomeAccountId ?? '',
    expenseAccountId: initialData?.expenseAccountId ?? '',
    taxable: initialData?.taxable ?? false,
    cost: initialData?.cost ?? 0,
    isActive: initialData?.isActive ?? true,
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

    if (!formData.unitPrice || formData.unitPrice < 0) {
      setError('Unit price must be zero or greater');
      return;
    }

    try {
      setLoading(true);

      const payload: CreateItemData & {
        description?: string;
        taxable?: boolean;
        cost?: number;
        isActive?: boolean;
      } = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        unitPrice: Number(formData.unitPrice),
        incomeAccountId:
          !formData.incomeAccountId || formData.incomeAccountId === 'none'
            ? undefined
            : formData.incomeAccountId,
        expenseAccountId:
          !formData.expenseAccountId || formData.expenseAccountId === 'none'
            ? undefined
            : formData.expenseAccountId,
        taxable: formData.taxable,
        cost: formData.cost ? Number(formData.cost) : undefined,
        isActive: formData.isActive,
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
                {isEditing ? 'Update Item' : 'Create Item or Service'}
              </CardTitle>
              {/* <CardDescription>
                {isEditing
                  ? 'Adjust details of your product or service.'
                  : 'List a new product or service that you sell.'}
              </CardDescription> */}
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
                onValueChange={(value: ItemType) =>
                  setFormData((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ItemType.SERVICE}>Service</SelectItem>
                  <SelectItem value={ItemType.PRODUCT}>Product</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price *</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                min={0}
                value={formData.unitPrice}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    unitPrice: Number(event.target.value),
                  }))
                }
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Cost (optional)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min={0}
                value={formData.cost}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    cost: Number(event.target.value),
                  }))
                }
                placeholder="0.00"
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
            <div className="space-y-2">
              <Label htmlFor="incomeAccountId">Income Account</Label>
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
                <SelectItem value="none">None</SelectItem>
                {incomeAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.label}
                  </SelectItem>
                ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseAccountId">Expense Account</Label>
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
                <SelectItem value="none">None</SelectItem>
                {expenseAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.label}
                  </SelectItem>
                ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="taxable"
              checked={formData.taxable}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, taxable: checked }))
              }
            />
            <Label htmlFor="taxable">Taxable</Label>
          </div>

          {isEditing && (
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isActive: checked }))
                }
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : isEditing ? 'Update Item' : 'Create Item'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

