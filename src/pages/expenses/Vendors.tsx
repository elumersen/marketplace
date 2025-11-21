import { useState } from 'react';
import { VendorList } from '@/components/expenses/VendorList';
import { VendorForm } from '@/components/expenses/VendorForm';
import { VendorDetail } from '@/components/expenses/VendorDetail';
import { Vendor } from '@/types/api.types';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

type SheetMode = 'create' | 'edit' | 'view' | null;

export const Vendors = () => {
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const openSheet = (mode: SheetMode, vendor?: Vendor | null) => {
    setSheetMode(mode);
    setSelectedVendor(vendor ?? null);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setTimeout(() => {
      setSheetMode(null);
      setSelectedVendor(null);
    }, 200);
  };

  const handleCreateNew = () => openSheet('create');

  const handleView = (vendor: Vendor) => openSheet('view', vendor);

  const handleEdit = (vendor: Vendor) => openSheet('edit', vendor);

  const handleFormSuccess = (vendor: Vendor) => {
    setRefreshSignal((prev) => prev + 1);
    openSheet('view', vendor);
  };

  return (
    <div className="container mx-auto py-6">
      <VendorList
        onView={handleView}
        onEdit={handleEdit}
        onCreateNew={handleCreateNew}
        refreshSignal={refreshSignal}
      />

      <Sheet open={sheetOpen} onOpenChange={(open) => (open ? null : closeSheet())}>
        <SheetContent side="right" className="sm:max-w-4xl w-full overflow-y-auto [&>button]:hidden">
          <VisuallyHidden>
            <SheetTitle>Vendor</SheetTitle>
          </VisuallyHidden>
          {sheetMode === 'create' && (
            <VendorForm onSuccess={handleFormSuccess} onCancel={closeSheet} />
          )}

          {sheetMode === 'edit' && selectedVendor && (
            <VendorForm
              initialData={{
                name: selectedVendor.name,
                email: selectedVendor.email || undefined,
                phone: selectedVendor.phone || undefined,
                address: selectedVendor.address || undefined,
                city: selectedVendor.city || undefined,
                state: selectedVendor.state || undefined,
                zipCode: selectedVendor.zipCode || undefined,
                country: selectedVendor.country || undefined,
              }}
              onSuccess={handleFormSuccess}
              onCancel={closeSheet}
              isEditing
              vendorId={selectedVendor.id}
            />
          )}

          {sheetMode === 'view' && selectedVendor && (
            <VendorDetail
              vendorId={selectedVendor.id}
              onBack={closeSheet}
              onEdit={handleEdit}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

