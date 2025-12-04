import { useState } from 'react';
import { JournalEntryList } from '@/components/accounting/JournalEntryList';
import { JournalEntryForm } from '@/components/accounting/JournalEntryForm';
import { JournalEntryDetail } from '@/components/accounting/JournalEntryDetail';
import { JournalEntry } from '@/types/api.types';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

type SheetMode = 'create' | 'edit' | 'view' | null;

export const JournalEntries = () => {
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const openSheet = (mode: SheetMode, entry?: JournalEntry | null) => {
    setSheetMode(mode);
    setSelectedEntry(entry ?? null);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setTimeout(() => {
      setSheetMode(null);
      setSelectedEntry(null);
    }, 200);
  };

  const handleCreateNew = () => openSheet('create');

  const handleView = (journalEntry: JournalEntry) => openSheet('view', journalEntry);

  const handleEdit = (journalEntry: JournalEntry) => openSheet('edit', journalEntry);

  const handleFormSuccess = (journalEntry: JournalEntry) => {
    setRefreshSignal((prev) => prev + 1);
    openSheet('view', journalEntry);
  };

  return (
    <div className="container mx-auto py-6">
      <JournalEntryList
        onView={handleView}
        onEdit={handleEdit}
        onCreateNew={handleCreateNew}
        refreshSignal={refreshSignal}
      />

      <Sheet open={sheetOpen} onOpenChange={(open) => (open ? null : closeSheet())}>
        <SheetContent side="right" className="sm:max-w-4xl w-full overflow-y-auto [&>button]:hidden">
          <VisuallyHidden>
            <SheetTitle>Journal Entry</SheetTitle>
          </VisuallyHidden>
          {sheetMode === 'create' && (
            <JournalEntryForm onSuccess={handleFormSuccess} onCancel={closeSheet} />
          )}

          {sheetMode === 'edit' && selectedEntry && (
            <JournalEntryForm
              initialData={{
                entryNumber: selectedEntry.entryNumber,
                entryDate: selectedEntry.entryDate,
                description: selectedEntry.description || '',
                status: selectedEntry.status,
                lines: selectedEntry.lines?.map(line => ({
                  accountId: line.accountId,
                  description: line.description || '',
                  debit: line.debit,
                  credit: line.credit,
                })) || [],
              }}
              onSuccess={handleFormSuccess}
              onCancel={closeSheet}
              isEditing={true}
              journalEntryId={selectedEntry.id}
            />
          )}

          {sheetMode === 'view' && selectedEntry && (
            <JournalEntryDetail
              journalEntryId={selectedEntry.id}
              onBack={closeSheet}
              onEdit={handleEdit}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

