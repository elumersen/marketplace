import { useMemo, useState } from 'react';
import { ReceivePaymentList } from '@/components/income/ReceivePaymentList';
import { ReceivePaymentForm } from '@/components/income/ReceivePaymentForm';
import { ReceivePaymentDetail } from '@/components/income/ReceivePaymentDetail';
import { ReceivePayment } from '@/types/api.types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

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

  const sheetTitle = useMemo(() => {
    switch (sheetMode) {
      case 'create':
        return 'Record Payment';
      case 'edit':
        return 'Update Payment';
      case 'view':
        return 'Payment Details';
      default:
        return '';
    }
  }, [sheetMode]);

  const sheetDescription = useMemo(() => {
    switch (sheetMode) {
      case 'create':
        return 'Apply a customer payment to one or more invoices.';
      case 'edit':
        return 'Adjust payment details or mark it inactive.';
      case 'view':
        return 'Review the payment trail, linked invoice, and journal entry.';
      default:
        return '';
    }
  }, [sheetMode]);

  return (
    <div className="container mx-auto py-6">
      <ReceivePaymentList
        onView={handleView}
        onEdit={handleEdit}
        onCreateNew={handleCreateNew}
        refreshSignal={refreshSignal}
      />

      <Sheet open={sheetOpen} onOpenChange={(open) => (open ? null : closeSheet())}>
        <SheetContent side="right" className="sm:max-w-3xl w-full overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{sheetTitle}</SheetTitle>
            {sheetDescription && (
              <SheetDescription>{sheetDescription}</SheetDescription>
            )}
          </SheetHeader>

          {sheetMode === 'create' && (
            <ReceivePaymentForm
              onSuccess={handleFormSuccess}
              onCancel={closeSheet}
            />
          )}

          {sheetMode === 'edit' && selectedPayment && (
            <ReceivePaymentForm
              initialData={{
                invoiceId: selectedPayment.invoiceId,
                bankAccountId: selectedPayment.bankAccountId,
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