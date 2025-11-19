import { useState } from 'react';
import { ReceivePaymentList } from '@/components/income/ReceivePaymentList';
import { ReceivePaymentForm } from '@/components/income/ReceivePaymentForm';
import { ReceivePaymentDetail } from '@/components/income/ReceivePaymentDetail';
import { ReceivePayment } from '@/types/api.types';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

type SheetMode = 'create' | 'edit' | 'view' | null;

export const ReceivePayments = () => {
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] =
    useState<ReceivePayment | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const openSheet = (mode: SheetMode, payment?: ReceivePayment | null) => {
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

  const handleView = (payment: ReceivePayment) => openSheet('view', payment);

  const handleEdit = (payment: ReceivePayment) => openSheet('edit', payment);

  const handleFormSuccess = (payment: ReceivePayment) => {
    setRefreshSignal((prev) => prev + 1);
    openSheet('view', payment);
  };

  return (
    <div className="container mx-auto py-6">
      <ReceivePaymentList
        onView={handleView}
        onEdit={handleEdit}
        onCreateNew={handleCreateNew}
        refreshSignal={refreshSignal}
      />

      <Sheet open={sheetOpen} onOpenChange={(open) => (open ? null : closeSheet())}>
        <SheetContent side="right" className="sm:max-w-3xl w-full overflow-y-auto [&>button]:hidden">
          <VisuallyHidden>
            <SheetTitle>Receive Payment</SheetTitle>
          </VisuallyHidden>
          {sheetMode === 'create' && (
            <ReceivePaymentForm
              onSuccess={handleFormSuccess}
              onCancel={closeSheet}
            />
          )}

          {sheetMode === 'edit' && selectedPayment && (
            <ReceivePaymentForm
              initialData={{
                invoices: selectedPayment.invoices?.map((rpi) => ({
                  invoiceId: rpi.invoiceId,
                  amount: rpi.amount,
                })),
                paymentDate: selectedPayment.paymentDate,
                amount: selectedPayment.amount,
                referenceNumber: selectedPayment.referenceNumber,
                notes: selectedPayment.notes,
              }}
              onSuccess={handleFormSuccess}
              onCancel={closeSheet}
              isEditing
              receivePaymentId={selectedPayment.id}
            />
          )}

          {sheetMode === 'view' && selectedPayment && (
            <ReceivePaymentDetail
              receivePaymentId={selectedPayment.id}
              onBack={closeSheet}
              onEdit={handleEdit}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};