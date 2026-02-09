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
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import {
  Item,
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
    sku?: string | null;
    description?: string | null;
    salesPrice?: number | null;
    purchasePrice?: number | null;
  };
  onSuccess: (item: Item) => void;
  onCancel: () => void;
  isEditing?: boolean;
  itemId?: string;
  compact?: boolean;
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
  compact = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incomeAccounts, setIncomeAccounts] = useState<AccountOption[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<AccountOption[]>([]);

  const [formData, setFormData] = useState<{
    name: string;
    sku: string;
    description: string;
    salesPrice: string;
    purchasePrice: string;
    incomeAccountId: string;
    expenseAccountId: string;
  }>({
    name: initialData?.name ?? '',
    sku: initialData?.sku ?? '',
    description: initialData?.description ?? '',
    salesPrice: initialData?.salesPrice != null ? String(initialData.salesPrice) : '',
    purchasePrice: initialData?.purchasePrice != null ? String(initialData.purchasePrice) : '',
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
      setError('Item name is required');
      return;
    }

    const salesPriceVal = formData.salesPrice === '' ? null : parseFloat(formData.salesPrice);
    const purchasePriceVal = formData.purchasePrice === '' ? null : parseFloat(formData.purchasePrice);

    if (salesPriceVal != null && (isNaN(salesPriceVal) || salesPriceVal < 0)) {
      setError('Sales price must be zero or greater');
      return;
    }
    if (purchasePriceVal != null && (isNaN(purchasePriceVal) || purchasePriceVal < 0)) {
      setError('Purchase price must be zero or greater');
      return;
    }

    const hasSales = salesPriceVal != null && salesPriceVal >= 0 && formData.incomeAccountId && formData.incomeAccountId !== 'none';
    const hasPurchase = purchasePriceVal != null && purchasePriceVal >= 0 && formData.expenseAccountId && formData.expenseAccountId !== 'none';

    if (!hasSales && !hasPurchase) {
      setError('Item must have at least one of: (Sales Price + Sales Account) or (Purchase Price + Purchase Account)');
      return;
    }
    if (hasSales && (!formData.incomeAccountId || formData.incomeAccountId === 'none')) {
      setError('Sales account is required when Sales Price is set');
      return;
    }
    if (hasPurchase && (!formData.expenseAccountId || formData.expenseAccountId === 'none')) {
      setError('Purchase account is required when Purchase Price is set');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: formData.name.trim(),
        sku: formData.sku.trim() || undefined,
        description: formData.description.trim() || undefined,
        salesPrice: hasSales ? salesPriceVal! : null,
        purchasePrice: hasPurchase ? purchasePriceVal! : null,
        incomeAccountId: hasSales ? formData.incomeAccountId : null,
        expenseAccountId: hasPurchase ? formData.expenseAccountId : null,
      };

      if (isEditing && itemId) {
        const response = await itemAPI.update(itemId, payload as any);
        onSuccess(response.item);
      } else {
        const response = await itemAPI.create(payload as any);
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

  const content = (
    <form onSubmit={handleSubmit} className={compact ? 'space-y-4' : 'space-y-6'}>
      {!compact && isEditing && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Update Item</CardTitle>
            <Button type="button" variant="outline" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </CardHeader>
      )}
      <div className={compact ? '' : 'px-6 pb-6'}>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div
          className={
            compact
              ? 'grid grid-cols-1 md:grid-cols-3 gap-4'
              : isEditing
                ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                : 'grid grid-cols-1 md:grid-cols-3 gap-4 mt-4'
          }
        >
          <div className="space-y-2">
            <Label htmlFor="sku">Label/SKU</Label>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
              placeholder="e.g. WEB-DEV-SR-01"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Item *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Web Development Income"
              required
            />
          </div>
          <div className={`space-y-2 ${compact ? 'md:col-span-1' : ''}`}>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Shown on invoice/bill"
            />
          </div>
        </div>

        <div
          className={
            compact
              ? 'grid grid-cols-1 md:grid-cols-4 gap-4 mt-4'
              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4'
          }
        >
          <div className="space-y-2">
            <Label htmlFor="salesPrice">Sales Price</Label>
            <Input
              id="salesPrice"
              type="number"
              step="0.01"
              min={0}
              value={formData.salesPrice}
              onChange={(e) => setFormData((prev) => ({ ...prev, salesPrice: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="incomeAccountId">Sales Account</Label>
            <Select
              value={formData.incomeAccountId || undefined}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, incomeAccountId: value }))}
            >
              <SelectTrigger id="incomeAccountId">
                <SelectValue placeholder="Select sales account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {incomeAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Purchase Price</Label>
            <Input
              id="purchasePrice"
              type="number"
              step="0.01"
              min={0}
              value={formData.purchasePrice}
              onChange={(e) => setFormData((prev) => ({ ...prev, purchasePrice: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expenseAccountId">Purchase Account</Label>
            <Select
              value={formData.expenseAccountId || undefined}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, expenseAccountId: value }))}
            >
              <SelectTrigger id="expenseAccountId">
                <SelectValue placeholder="Select purchase account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {expenseAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} size="sm">
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={loading} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : isEditing ? 'Save' : 'Create Item'}
          </Button>
        </div>
      </div>
    </form>
  );

  if (compact) {
    return content;
  }

  return (
    <Card>
      {content}
    </Card>
  );
};
