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
  Building2,
  AlertCircle,
  Hash,
  FileText,
} from 'lucide-react';
import { Deposit } from '@/types/api.types';
import { depositAPI, getErrorMessage } from '@/lib/api';
import { format } from 'date-fns';

interface DepositDetailProps {
  depositId: string;
  onBack?: () => void;
  onEdit?: (deposit: Deposit) => void;
}

export const DepositDetail: React.FC<DepositDetailProps> = ({
  depositId,
  onBack,
  onEdit,
}) => {
  const [deposit, setDeposit] = useState<Deposit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDeposit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositId]);

  const loadDeposit = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await depositAPI.getById(depositId);
      setDeposit(response.deposit);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Failed to load deposit:', err);
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

  if (error || !deposit) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Deposit not found'}
        </AlertDescription>
      </Alert>
    );
  }

  const journalEntry = deposit.journalEntry;

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
            <h1 className="text-2xl font-bold">Deposit Details</h1>
            <p className="text-gray-600">
              Recorded on{' '}
              {format(new Date(deposit.depositDate), 'MMMM dd, yyyy')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={() => onEdit?.(deposit)}
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
            Deposit Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Deposit Date
              </span>
              <p className="font-medium">
                {format(new Date(deposit.depositDate), 'MMMM dd, yyyy')}
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Bank Account
              </span>
              <p className="font-medium">
                {deposit.bankAccount?.name ?? '—'}
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Amount
              </span>
              <p className="text-lg font-semibold">
                {formatCurrency(deposit.amount)}
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Reference Number
              </span>
              <p className="font-medium">
                {deposit.referenceNumber || '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {deposit.notes ? (
            <p className="text-gray-800 whitespace-pre-line">
              {deposit.notes}
            </p>
          ) : (
            <p className="text-gray-600">No notes for this deposit.</p>
          )}
        </CardContent>
      </Card>

      {journalEntry && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Journal Entry
            </CardTitle>
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

