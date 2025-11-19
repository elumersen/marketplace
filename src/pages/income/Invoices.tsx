import { useState } from 'react';
import { InvoiceList } from '@/components/income/InvoiceList';
import { InvoiceForm } from '@/components/income/InvoiceForm';
import { InvoiceDetail } from '@/components/income/InvoiceDetail';
import { Invoice } from '@/types/api.types';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

type SheetMode = 'create' | 'edit' | 'view' | null;

export const Invoices = () => {
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const openSheet = (mode: SheetMode, invoice?: Invoice | null) => {
    setSheetMode(mode);
    setSelectedInvoice(invoice ?? null);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setTimeout(() => {
      setSheetMode(null);
      setSelectedInvoice(null);
    }, 200);
  };

  const handleCreateNew = () => openSheet('create');

  const handleView = (invoice: Invoice) => openSheet('view', invoice);

  const handleEdit = (invoice: Invoice) => openSheet('edit', invoice);

  const handleFormSuccess = (invoice: Invoice) => {
    setRefreshSignal((prev) => prev + 1);
    openSheet('view', invoice);
  };

  return (
    <div className="container mx-auto py-6">
      <InvoiceList
        onView={handleView}
        onEdit={handleEdit}
        onCreateNew={handleCreateNew}
        refreshSignal={refreshSignal}
      />

      <Sheet open={sheetOpen} onOpenChange={(open) => (open ? null : closeSheet())}>
        <SheetContent side="right" className="sm:max-w-4xl w-full overflow-y-auto [&>button]:hidden">
          <VisuallyHidden>
            <SheetTitle>Invoice</SheetTitle>
          </VisuallyHidden>
          {sheetMode === 'create' && (
            <InvoiceForm onSuccess={handleFormSuccess} onCancel={closeSheet} />
          )}

          {sheetMode === 'edit' && selectedInvoice && (
            <InvoiceForm
              initialData={{
                invoiceNumber: selectedInvoice.invoiceNumber,
                customerId: selectedInvoice.customerId,
                invoiceDate: selectedInvoice.invoiceDate,
                dueDate: selectedInvoice.dueDate,
                status: selectedInvoice.status,
                taxAmount: selectedInvoice.taxAmount,
                notes: selectedInvoice.notes || undefined,
                lines:
                  selectedInvoice.lines?.map((line) => ({
                    itemId: line.itemId ?? '',
                    accountId: line.accountId,
                    description: line.description || '',
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                  })) ?? [],
              }}
              onSuccess={handleFormSuccess}
              onCancel={closeSheet}
              isEditing
              invoiceId={selectedInvoice.id}
            />
          )}

          {sheetMode === 'view' && selectedInvoice && (
            <InvoiceDetail
              invoiceId={selectedInvoice.id}
              onBack={closeSheet}
              onEdit={handleEdit}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

