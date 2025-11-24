import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Edit,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Vendor } from '@/types/api.types';
import { vendorAPI, getErrorMessage } from '@/lib/api';
import { format } from 'date-fns';

interface VendorDetailProps {
  vendorId: string;
  onBack?: () => void;
  onEdit?: (vendor: Vendor) => void;
}

export const VendorDetail: React.FC<VendorDetailProps> = ({
  vendorId,
  onBack,
  onEdit,
}) => {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVendor();
  }, [vendorId]);

  const loadVendor = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await vendorAPI.getById(vendorId);
      setVendor(response.data);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Failed to load vendor:', err);
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

  const formatAddress = (vendor: Vendor) => {
    const parts = [
      vendor.address,
      vendor.city,
      vendor.state,
      vendor.zipCode,
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

  if (error || !vendor) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Vendor not found'}
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
            <h1 className="text-2xl font-bold">{vendor.name}</h1>
            <p className="text-gray-600">Vendor Details</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button onClick={() => onEdit?.(vendor)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="h-4 w-4" />
                Name
              </div>
              <p className="font-medium">{vendor.name}</p>
            </div>

            {vendor.email && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  Email
                </div>
                <p className="font-medium">{vendor.email}</p>
              </div>
            )}

            {vendor.phone && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  Phone
                </div>
                <p className="font-medium">{vendor.phone}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {(vendor.address || vendor.city || vendor.state || vendor.zipCode || vendor.country) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vendor.address && (
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="h-4 w-4" />
                    Street Address
                  </div>
                  <p className="font-medium">{vendor.address}</p>
                </div>
              )}

              {vendor.city && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    City
                  </div>
                  <p className="font-medium">{vendor.city}</p>
                </div>
              )}

              {vendor.state && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    State
                  </div>
                  <p className="font-medium">{vendor.state}</p>
                </div>
              )}

              {vendor.zipCode && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    ZIP Code
                  </div>
                  <p className="font-medium">{vendor.zipCode}</p>
                </div>
              )}

              {vendor.country && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    Country
                  </div>
                  <p className="font-medium">{vendor.country}</p>
                </div>
              )}

              {formatAddress(vendor) && (
                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    Full Address
                  </div>
                  <p className="font-medium">{formatAddress(vendor)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {vendor.bills && vendor.bills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendor.bills.map((bill) => {
                    const balanceDue = bill.totalAmount - bill.paidAmount;
                    return (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.billNumber}</TableCell>
                        <TableCell>
                          {format(new Date(bill.billDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          {format(new Date(bill.dueDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{bill.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(bill.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(bill.paidAmount)}
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

