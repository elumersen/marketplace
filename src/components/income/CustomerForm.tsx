import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { Customer, CreateCustomerData } from '@/types/api.types';
import { customerAPI, getErrorMessage } from '@/lib/api';

interface CustomerFormProps {
  initialData?: Partial<CreateCustomerData> & {
    id?: string;
  };
  onSuccess: (customer: Customer) => void;
  onCancel: () => void;
  isEditing?: boolean;
  customerId?: string;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
  isEditing = false,
  customerId,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: initialData?.name ?? '',
    email: initialData?.email ?? '',
    phone: initialData?.phone ?? '',
    address: initialData?.address ?? '',
    city: initialData?.city ?? '',
    state: initialData?.state ?? '',
    zipCode: initialData?.zipCode ?? '',
    country: initialData?.country ?? '',
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Customer name is required');
      return;
    }

    try {
      setLoading(true);

      const payload: CreateCustomerData = {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        zipCode: formData.zipCode.trim() || undefined,
        country: formData.country.trim() || undefined,
      };

      if (isEditing && customerId) {
        const response = await customerAPI.update(customerId, payload);
        onSuccess(response.data);
      } else {
        const response = await customerAPI.create(payload);
        onSuccess(response.data);
      }
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Failed to save customer:', err);
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
                {isEditing ? 'Update Customer' : 'Create Customer'}
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

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Customer name"
              required
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="customer@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, phone: event.target.value }))
                }
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Address Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, address: event.target.value }))
                }
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, city: event.target.value }))
                  }
                  placeholder="City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, state: event.target.value }))
                  }
                  placeholder="State"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, zipCode: event.target.value }))
                  }
                  placeholder="12345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, country: event.target.value }))
                  }
                  placeholder="Country"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : isEditing ? 'Update Customer' : 'Create Customer'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};


