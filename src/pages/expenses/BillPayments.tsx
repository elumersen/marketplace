import { useState } from 'react';
import { BillPaymentList } from '@/components/expenses/BillPaymentList';
import { BillPaymentForm } from '@/components/expenses/BillPaymentForm';
import { BillPaymentDetail } from '@/components/expenses/BillPaymentDetail';
import { BillPayment } from '@/types/api.types';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

type SheetMode = 'create' | 'edit' | 'view' | null;

export const BillPayments = () => {
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] =
    useState<BillPayment | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const openSheet = (mode: SheetMode, payment?: BillPayment | null) => {
    setSheetMode(mode);
    setSelectedPayment(payment ?? null);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setTimeout(() => {
      setSheetMode(null);
      setSelectedPayment(null);
    }, 200);
  };

  const handleCreateNew = () => openSheet('create');

  const handleView = (payment: BillPayment) => openSheet('view', payment);

  const handleEdit = (payment: BillPayment) => openSheet('edit', payment);

  const handleFormSuccess = (payment: BillPayment) => {
    setRefreshSignal((prev) => prev + 1);
    openSheet('view', payment);
  };

  return (
    <div className="container mx-auto py-6">
      <BillPaymentList
        onView={handleView}
        onEdit={handleEdit}
        onCreateNew={handleCreateNew}
        refreshSignal={refreshSignal}
      />

      <Sheet open={sheetOpen} onOpenChange={(open) => (open ? null : closeSheet())}>
        <SheetContent side="right" className="sm:max-w-3xl w-full overflow-y-auto [&>button]:hidden">
          <VisuallyHidden>
            <SheetTitle>Bill Payment</SheetTitle>
          </VisuallyHidden>
          {sheetMode === 'create' && (
            <BillPaymentForm
              onSuccess={handleFormSuccess}
              onCancel={closeSheet}
            />
          )}

          {sheetMode === 'edit' && selectedPayment && (
            <BillPaymentForm
              initialData={{
                bills: selectedPayment.billPaymentBills?.map((bpb) => ({
                  billId: bpb.billId,
                  amount: bpb.amount,
                })) || (selectedPayment.billId ? [{
                  billId: selectedPayment.billId,
                  amount: selectedPayment.amount,
                }] : []),
                bankAccountId: selectedPayment.bankAccountId,
                paymentDate: selectedPayment.paymentDate,
                amount: selectedPayment.amount,
                checkNumber: selectedPayment.checkNumber,
                referenceNumber: selectedPayment.referenceNumber,
                notes: selectedPayment.notes,
              }}
              onSuccess={handleFormSuccess}
              onCancel={closeSheet}
              isEditing
              billPaymentId={selectedPayment.id}
            />
          )}

          {sheetMode === 'view' && selectedPayment && (
            <BillPaymentDetail
              billPaymentId={selectedPayment.id}
              onBack={closeSheet}
              onEdit={handleEdit}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

