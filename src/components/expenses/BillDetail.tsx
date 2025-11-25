import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Edit,
  FileText,
  CalendarDays,
  CalendarRange,
  Building2,
  DollarSign,
  Hash,
  Mail,
  Phone,
  AlertCircle,
  Receipt,
} from 'lucide-react';
import { Bill, BillStatus } from '@/types/api.types';
import { billAPI, getErrorMessage } from '@/lib/api';
import { format } from 'date-fns';

interface BillDetailProps {
  billId: string;
  onBack?: () => void;
  onEdit?: (bill: Bill) => void;
}

const statusConfig = {
  [BillStatus.DRAFT]: {
    label: 'Draft',
    variant: 'secondary' as const,
    icon: FileText,
  },
  [BillStatus.OPEN]: {
    label: 'Open',
    variant: 'default' as const,
    icon: Receipt,
  },
  [BillStatus.PARTIALLY_PAID]: {
    label: 'Partially Paid',
    variant: 'default' as const,
    icon: DollarSign,
  },
  [BillStatus.PAID]: {
    label: 'Paid',
    variant: 'default' as const,
    icon: DollarSign,
  },
  [BillStatus.OVERDUE]: {
    label: 'Overdue',
    variant: 'destructive' as const,
    icon: AlertCircle,
  },
  [BillStatus.VOID]: {
    label: 'Void',
    variant: 'destructive' as const,
    icon: AlertCircle,
  },
};

export const BillDetail: React.FC<BillDetailProps> = ({
  billId,
  onBack,
  onEdit,
}) => {
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBill();
  }, [billId]);

  const loadBill = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await billAPI.getById(billId);
      setBill(response.bill);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Failed to load bill:', err);
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

  const getStatusBadge = (status: BillStatus) => {
    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error || !bill) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Bill not found'}
        </AlertDescription>
      </Alert>
    );
  }

  const balanceDue = bill.totalAmount - bill.paidAmount;

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
            <h1 className="text-2xl font-bold">Bill {bill.billNumber}</h1>
            <p className="text-gray-600">Bill Details</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {getStatusBadge(bill.status)}
          {bill.status === BillStatus.DRAFT && (
            <Button onClick={() => onEdit?.(bill)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Bill Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Hash className="h-4 w-4" />
                Bill Number
              </div>
              <p className="font-medium">{bill.billNumber}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CalendarDays className="h-4 w-4" />
                Bill Date
              </div>
              <p className="font-medium">
                {format(new Date(bill.billDate), 'MMMM dd, yyyy')}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CalendarRange className="h-4 w-4" />
                Due Date
              </div>
              <p className="font-medium">
                {format(new Date(bill.dueDate), 'MMMM dd, yyyy')}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="h-4 w-4" />
                Total Amount
              </div>
              <p className="text-lg font-semibold">
                {formatCurrency(bill.totalAmount)}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="h-4 w-4" />
                Paid Amount
              </div>
              <p className="text-lg font-semibold">
                {formatCurrency(bill.paidAmount)}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="h-4 w-4" />
                Balance Due
              </div>
              <p className={`text-lg font-semibold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(balanceDue)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Information</CardTitle>
        </CardHeader>
        <CardContent>
          {bill.vendor ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 className="h-4 w-4" />
                  Name
                </div>
                <p className="font-medium">{bill.vendor.name}</p>
              </div>

              {bill.vendor.email && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                  <p className="font-medium">{bill.vendor.email}</p>
                </div>
              )}

              {bill.vendor.phone && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    Phone
                  </div>
                  <p className="font-medium">{bill.vendor.phone}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-600">No vendor information available.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          {bill.lines && bill.lines.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bill.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">
                        {line.item?.name || line.itemName || 'Item'}
                      </TableCell>
                      <TableCell>{line.description || 'N/A'}</TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(line.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(line.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-gray-600">No line items for this bill.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {bill.notes ? (
            <p className="text-gray-800 whitespace-pre-line">{bill.notes}</p>
          ) : (
            <p className="text-gray-600">No notes recorded for this bill.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

