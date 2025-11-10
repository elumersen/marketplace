import { useMemo, useState } from 'react';
import { InvoiceList } from '@/components/income/InvoiceList';
import { InvoiceForm } from '@/components/income/InvoiceForm';
import { InvoiceDetail } from '@/components/income/InvoiceDetail';
import { Invoice } from '@/types/api.types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

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

  const sheetTitle = useMemo(() => {
    switch (sheetMode) {
      case 'create':
        return 'Create Invoice';
      case 'edit':
        return 'Update Invoice';
      case 'view':
        return 'Invoice Details';
      default:
        return '';
    }
  }, [sheetMode]);

  const sheetDescription = useMemo(() => {
    switch (sheetMode) {
      case 'create':
        return 'Build a new invoice with line items, tax, and notes.';
      case 'edit':
        return 'Adjust invoice content or status before sending.';
      case 'view':
        return 'Review the invoice, customer, and payment history.';
      default:
        return '';
    }
  }, [sheetMode]);

  return (
    <div className="container mx-auto py-6">
      <InvoiceList
        onView={handleView}
        onEdit={handleEdit}
        onCreateNew={handleCreateNew}
        refreshSignal={refreshSignal}
      />

      <Sheet open={sheetOpen} onOpenChange={(open) => (open ? null : closeSheet())}>
        <SheetContent side="right" className="sm:max-w-4xl w-full overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{sheetTitle}</SheetTitle>
            {sheetDescription && (
              <SheetDescription>{sheetDescription}</SheetDescription>
            )}
          </SheetHeader>

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
                    itemId: line.itemId,
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

