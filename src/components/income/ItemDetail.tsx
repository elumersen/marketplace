import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  ArrowLeft,
  Edit,
  Package,
  DollarSign,
  Layers,
  Info,
} from 'lucide-react';
import { Item, ItemType } from '@/types/api.types';
import { itemAPI, getErrorMessage } from '@/lib/api';

interface ItemDetailProps {
  itemId: string;
  onBack?: () => void;
  onEdit?: (item: Item) => void;
}

const typeLabel = (type: ItemType) =>
  type === ItemType.INCOME ? 'Income' : 'Expense';

export const ItemDetail: React.FC<ItemDetailProps> = ({
  itemId,
  onBack,
  onEdit,
}) => {
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  const loadItem = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await itemAPI.getById(itemId);
      setItem(response.item);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Failed to load item:', err);
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

  if (error || !item) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error || 'Item not found'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              {item.name}
            </h1>
            <p className="text-gray-600">{typeLabel(item.type)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={item.isActive ? 'default' : 'secondary'}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Button onClick={() => onEdit?.(item)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500">Amount</p>
              <p className="text-lg font-semibold">
                {formatCurrency(item.amount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Accounting
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500">Income Account</p>
            <p className="font-medium">
              {item.incomeAccount
                ? `${item.incomeAccount.code} - ${item.incomeAccount.name}`
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Expense Account</p>
            <p className="font-medium">
              {item.expenseAccount
                ? `${item.expenseAccount.code} - ${item.expenseAccount.name}`
                : '—'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Description</p>
            <p className="font-medium">
              {item.description ? (
                <span className="whitespace-pre-line text-gray-800">
                  {item.description}
                </span>
              ) : (
                'No description provided.'
              )}
            </p>
          </div>
          {/* <div className="text-sm text-gray-500">
            Last updated {new Date(item.updatedAt).toLocaleString()}
          </div> */}
        </CardContent>
      </Card>
    </div>
  );
};

