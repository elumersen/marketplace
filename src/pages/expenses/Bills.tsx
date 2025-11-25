import { useState } from 'react';
import { BillList } from '@/components/expenses/BillList';
import { BillForm } from '@/components/expenses/BillForm';
import { BillDetail } from '@/components/expenses/BillDetail';
import { Bill } from '@/types/api.types';
import { billAPI, getErrorMessage } from '@/lib/api';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { Spinner } from '@/components/ui/spinner';

type SheetMode = 'create' | 'edit' | 'view' | null;

export const Bills = () => {
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [loadingBill, setLoadingBill] = useState(false);

  const openSheet = (mode: SheetMode, bill?: Bill | null) => {
    setSheetMode(mode);
    setSelectedBill(bill ?? null);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setTimeout(() => {
      setSheetMode(null);
      setSelectedBill(null);
    }, 200);
  };

  const handleCreateNew = () => openSheet('create');

  const handleView = (bill: Bill) => openSheet('view', bill);

  const handleEdit = async (bill: Bill) => {
    // Fetch full bill data including line items
    setLoadingBill(true);
    try {
      const response = await billAPI.getById(bill.id);
      openSheet('edit', response.bill);
    } catch (error) {
      console.error('Failed to load bill:', getErrorMessage(error));
      // Fallback to the bill from list if fetch fails
      openSheet('edit', bill);
    } finally {
      setLoadingBill(false);
    }
  };

  const handleFormSuccess = (bill: Bill) => {
    setRefreshSignal((prev) => prev + 1);
    openSheet('view', bill);
  };

  return (
    <div className="container mx-auto py-6">
      <BillList
        onView={handleView}
        onEdit={handleEdit}
        onCreateNew={handleCreateNew}
        refreshSignal={refreshSignal}
      />

      <Sheet open={sheetOpen} onOpenChange={(open) => (open ? null : closeSheet())}>
        <SheetContent side="right" className="sm:max-w-4xl w-full overflow-y-auto [&>button]:hidden">
          <VisuallyHidden>
            <SheetTitle>Bill</SheetTitle>
          </VisuallyHidden>
          {sheetMode === 'create' && (
            <BillForm onSuccess={handleFormSuccess} onCancel={closeSheet} />
          )}

          {sheetMode === 'edit' && (
            loadingBill ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <Spinner size="lg" />
                  <span className="text-sm text-muted-foreground">Loading bill details...</span>
                </div>
              </div>
            ) : selectedBill ? (
              <BillForm
                initialData={{
                  billNumber: selectedBill.billNumber,
                  vendorId: selectedBill.vendorId,
                  billDate: selectedBill.billDate,
                  dueDate: selectedBill.dueDate,
                  status: selectedBill.status,
                  taxAmount: selectedBill.taxAmount,
                  notes: selectedBill.notes || undefined,
                  lines:
                    selectedBill.lines?.map((line) => ({
                      itemId: line.itemId ?? '',
                      description: line.description || '',
                      quantity: line.quantity,
                      unitPrice: line.unitPrice,
                    })) ?? [],
                }}
                onSuccess={handleFormSuccess}
                onCancel={closeSheet}
                isEditing
                billId={selectedBill.id}
              />
            ) : null
          )}

          {sheetMode === 'view' && selectedBill && (
            <BillDetail
              billId={selectedBill.id}
              onBack={closeSheet}
              onEdit={handleEdit}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

