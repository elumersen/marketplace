import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Edit,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Customer } from '@/types/api.types';
import { customerAPI, getErrorMessage } from '@/lib/api';
import { format } from 'date-fns';

interface CustomerDetailProps {
  customerId: string;
  onBack?: () => void;
  onEdit?: (customer: Customer) => void;
}

export const CustomerDetail: React.FC<CustomerDetailProps> = ({
  customerId,
  onBack,
  onEdit,
}) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  const loadCustomer = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await customerAPI.getById(customerId);
      setCustomer(response.data);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Failed to load customer:', err);
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

  const formatAddress = (customer: Customer) => {
    const parts = [
      customer.address,
      customer.city,
      customer.state,
      customer.zipCode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Customer not found'}
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
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            <p className="text-gray-600">Customer Details</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button onClick={() => onEdit?.(customer)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                Name
              </div>
              <p className="font-medium">{customer.name}</p>
            </div>

            {customer.email && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  Email
                </div>
                <p className="font-medium">{customer.email}</p>
              </div>
            )}

            {customer.phone && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  Phone
                </div>
                <p className="font-medium">{customer.phone}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {(customer.address || customer.city || customer.state || customer.zipCode || customer.country) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {customer.address && (
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="h-4 w-4" />
                    Street Address
                  </div>
                  <p className="font-medium">{customer.address}</p>
                </div>
              )}

              {customer.city && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    City
                  </div>
                  <p className="font-medium">{customer.city}</p>
                </div>
              )}

              {customer.state && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    State
                  </div>
                  <p className="font-medium">{customer.state}</p>
                </div>
              )}

              {customer.zipCode && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    ZIP Code
                  </div>
                  <p className="font-medium">{customer.zipCode}</p>
                </div>
              )}

              {customer.country && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    Country
                  </div>
                  <p className="font-medium">{customer.country}</p>
                </div>
              )}

              {formatAddress(customer) && (
                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    Full Address
                  </div>
                  <p className="font-medium">{formatAddress(customer)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {customer.invoices && customer.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.invoices.map((invoice) => {
                    const balanceDue = invoice.totalAmount - invoice.paidAmount;
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>
                          {format(new Date(invoice.invoiceDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{invoice.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(invoice.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(invoice.paidAmount)}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(balanceDue)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};


