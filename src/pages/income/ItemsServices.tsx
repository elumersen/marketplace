import { useState } from 'react';
import { ItemList } from '@/components/income/ItemList';
import { ItemForm } from '@/components/income/ItemForm';
import { Item } from '@/types/api.types';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

type SheetMode = 'create' | 'edit' | null;

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
  const handleEdit = (item: Item) => openSheet('edit', item);

  const handleFormSuccess = (_item: Item) => {
    setRefreshSignal((prev) => prev + 1);
    closeSheet();
  };

  return (
    <div className="container mx-auto py-6">
      <ItemList
        onEdit={handleEdit}
        onCreateNew={handleCreateNew}
        refreshSignal={refreshSignal}
      />

      <Sheet open={sheetOpen} onOpenChange={(open) => (open ? null : closeSheet())}>
        <SheetContent side="right" className="sm:max-w-3xl w-full overflow-y-auto [&>button]:hidden">
          <VisuallyHidden>
            <SheetTitle>Products & Services</SheetTitle>
          </VisuallyHidden>
          {sheetMode === 'create' && (
            <ItemForm onSuccess={handleFormSuccess} onCancel={closeSheet} />
          )}

          {sheetMode === 'edit' && selectedItem && (
            <ItemForm
              initialData={{
                name: selectedItem.name,
                description: selectedItem.description ?? '',
                type: selectedItem.type,
                amount: selectedItem.amount,
                incomeAccountId: selectedItem.incomeAccountId ?? undefined,
                expenseAccountId: selectedItem.expenseAccountId ?? undefined,
              }}
              onSuccess={handleFormSuccess}
              onCancel={closeSheet}
              isEditing
              itemId={selectedItem.id}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};