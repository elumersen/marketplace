import { useState } from 'react';
import { CustomerList } from '@/components/income/CustomerList';
import { CustomerForm } from '@/components/income/CustomerForm';
import { CustomerDetail } from '@/components/income/CustomerDetail';
import { Customer } from '@/types/api.types';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

type SheetMode = 'create' | 'edit' | 'view' | null;

export const Customers = () => {
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const openSheet = (mode: SheetMode, customer?: Customer | null) => {
    setSheetMode(mode);
    setSelectedCustomer(customer ?? null);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setTimeout(() => {
      setSheetMode(null);
      setSelectedCustomer(null);
    }, 200);
  };

  const handleCreateNew = () => openSheet('create');

  const handleView = (customer: Customer) => openSheet('view', customer);

  const handleEdit = (customer: Customer) => openSheet('edit', customer);

  const handleFormSuccess = (customer: Customer) => {
    setRefreshSignal((prev) => prev + 1);
    openSheet('view', customer);
  };

  return (
    <div className="container mx-auto py-6">
      <CustomerList
        onView={handleView}
        onEdit={handleEdit}
        onCreateNew={handleCreateNew}
        refreshSignal={refreshSignal}
      />

      <Sheet open={sheetOpen} onOpenChange={(open) => (open ? null : closeSheet())}>
        <SheetContent side="right" className="sm:max-w-4xl w-full overflow-y-auto [&>button]:hidden">
          <VisuallyHidden>
            <SheetTitle>Customer</SheetTitle>
          </VisuallyHidden>
          {sheetMode === 'create' && (
            <CustomerForm onSuccess={handleFormSuccess} onCancel={closeSheet} />
          )}

          {sheetMode === 'edit' && selectedCustomer && (
            <CustomerForm
              initialData={{
                name: selectedCustomer.name,
                email: selectedCustomer.email || undefined,
                phone: selectedCustomer.phone || undefined,
                address: selectedCustomer.address || undefined,
                city: selectedCustomer.city || undefined,
                state: selectedCustomer.state || undefined,
                zipCode: selectedCustomer.zipCode || undefined,
                country: selectedCustomer.country || undefined,
              }}
              onSuccess={handleFormSuccess}
              onCancel={closeSheet}
              isEditing
              customerId={selectedCustomer.id}
            />
          )}

          {sheetMode === 'view' && selectedCustomer && (
            <CustomerDetail
              customerId={selectedCustomer.id}
              onBack={closeSheet}
              onEdit={handleEdit}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};