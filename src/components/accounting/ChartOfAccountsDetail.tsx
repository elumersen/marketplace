import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { accountAPI, getErrorMessage } from '@/lib/api';
import { Account } from '@/types/api.types';
import { ArrowLeft, Edit, BookOpen, AlertCircle } from 'lucide-react';

interface ChartOfAccountsDetailProps {
  accountId: string;
  onBack: () => void;
  onEdit: (account: Account) => void;
}

export const ChartOfAccountsDetail = ({ accountId, onBack, onEdit }: ChartOfAccountsDetailProps) => {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccount();
  }, [accountId]);

  const fetchAccount = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await accountAPI.getById(accountId);
      setAccount(response.data);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Failed to load account:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatAccountType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Account not found'}
        </AlertDescription>
      </Alert>
    );
  }

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
            <h1 className="text-2xl font-bold">{account.name}</h1>
            <p className="text-gray-600">Account Details</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button onClick={() => onEdit(account)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BookOpen className="h-4 w-4" />
                Account Code
              </div>
              <p className="font-medium font-mono">{account.code}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BookOpen className="h-4 w-4" />
                Account Name
              </div>
              <p className="font-medium">{account.name}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BookOpen className="h-4 w-4" />
                Status
              </div>
              <div>
                <Badge variant={account.isActive ? "default" : "secondary"}>
                  {account.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Account Classification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BookOpen className="h-4 w-4" />
                Account Type
              </div>
              <div>
                <Badge variant="secondary">
                  {formatAccountType(account.type)}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BookOpen className="h-4 w-4" />
                Sub Type
              </div>
              <p className="font-medium">{formatAccountType(account.subType)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BookOpen className="h-4 w-4" />
                Current Balance
              </div>
              <p className="text-lg font-semibold font-mono">
                {formatCurrency(account.balance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {account.description && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">
              {account.description ? (
                <span className="whitespace-pre-line text-gray-800">
                  {account.description}
                </span>
              ) : (
                'No description provided.'
              )}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
