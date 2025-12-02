import { useState } from 'react';
import { DepositList } from '@/components/income/DepositList';
import { DepositForm } from '@/components/income/DepositForm';
import { DepositDetail } from '@/components/income/DepositDetail';
import { Deposit } from '@/types/api.types';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

type SheetMode = 'create' | 'edit' | 'view' | null;

export const Deposits = () => {
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] =
    useState<Deposit | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const openSheet = (mode: SheetMode, deposit?: Deposit | null) => {
    setSheetMode(mode);
    setSelectedDeposit(deposit ?? null);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setTimeout(() => {
      setSheetMode(null);
      setSelectedDeposit(null);
    }, 200);
  };

  const handleCreateNew = () => openSheet('create');

  const handleView = (deposit: Deposit) => openSheet('view', deposit);

  const handleEdit = (deposit: Deposit) => openSheet('edit', deposit);

  const handleFormSuccess = (deposit: Deposit) => {
    setRefreshSignal((prev) => prev + 1);
    openSheet('view', deposit);
  };

  return (
    <div className="container mx-auto py-6">
      <DepositList
        onView={handleView}
        onEdit={handleEdit}
        onCreateNew={handleCreateNew}
        refreshSignal={refreshSignal}
      />

      <Sheet open={sheetOpen} onOpenChange={(open) => (open ? null : closeSheet())}>
        <SheetContent side="right" className="sm:max-w-3xl w-full overflow-y-auto [&>button]:hidden">
          <VisuallyHidden>
            <SheetTitle>Deposit</SheetTitle>
          </VisuallyHidden>
          {sheetMode === 'create' && (
            <DepositForm
              onSuccess={handleFormSuccess}
              onCancel={closeSheet}
            />
          )}

          {sheetMode === 'edit' && selectedDeposit && (
            <DepositForm
              initialData={{
                bankAccountId: selectedDeposit.bankAccountId,
                depositDate: selectedDeposit.depositDate,
                amount: selectedDeposit.amount,
                referenceNumber: selectedDeposit.referenceNumber,
                notes: selectedDeposit.notes,
              }}
              onSuccess={handleFormSuccess}
              onCancel={closeSheet}
              isEditing
              depositId={selectedDeposit.id}
            />
          )}

          {sheetMode === 'view' && selectedDeposit && (
            <DepositDetail
              depositId={selectedDeposit.id}
              onBack={closeSheet}
              onEdit={handleEdit}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};