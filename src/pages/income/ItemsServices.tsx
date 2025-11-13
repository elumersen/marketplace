import { useMemo, useState } from 'react';
import { ItemList } from '@/components/income/ItemList';
import { ItemForm } from '@/components/income/ItemForm';
import { ItemDetail } from '@/components/income/ItemDetail';
import { Item } from '@/types/api.types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type SheetMode = 'create' | 'edit' | 'view' | null;

export const ItemsServices = () => {
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const openSheet = (mode: SheetMode, item?: Item | null) => {
    setSheetMode(mode);
    setSelectedItem(item ?? null);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setTimeout(() => {
      setSheetMode(null);
      setSelectedItem(null);
    }, 200);
  };

  const handleCreateNew = () => openSheet('create');
  const handleView = (item: Item) => openSheet('view', item);
  const handleEdit = (item: Item) => openSheet('edit', item);

  const handleFormSuccess = (item: Item) => {
    setRefreshSignal((prev) => prev + 1);
    openSheet('view', item);
  };

  const sheetTitle = useMemo(() => {
    switch (sheetMode) {
      case 'create':
        return 'New Item';
      case 'edit':
        return 'Update Item';
      case 'view':
        return 'Item Details';
      default:
        return '';
    }
  }, [sheetMode]);

  const sheetDescription = useMemo(() => {
    switch (sheetMode) {
      case 'create':
        return 'List a new product or service for your customers.';
      case 'edit':
        return 'Adjust the pricing or accounts associated with this item.';
      case 'view':
        return 'Review the details and revenue mapping for this item.';
      default:
        return '';
    }
  }, [sheetMode]);

  return (
    <div className="container mx-auto py-6">
      <ItemList
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
            <ItemForm onSuccess={handleFormSuccess} onCancel={closeSheet} />
          )}

          {sheetMode === 'edit' && selectedItem && (
            <ItemForm
              initialData={{
                name: selectedItem.name,
                description: selectedItem.description ?? '',
                type: selectedItem.type,
                unitPrice: selectedItem.unitPrice,
                incomeAccountId: selectedItem.incomeAccountId ?? undefined,
                expenseAccountId: selectedItem.expenseAccountId ?? undefined,
                taxable: selectedItem.taxable,
                cost: selectedItem.cost ?? undefined,
                isActive: selectedItem.isActive,
              }}
              onSuccess={handleFormSuccess}
              onCancel={closeSheet}
              isEditing
              itemId={selectedItem.id}
            />
          )}

          {sheetMode === 'view' && selectedItem && (
            <ItemDetail
              itemId={selectedItem.id}
              onBack={closeSheet}
              onEdit={handleEdit}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};