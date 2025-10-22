import { useState } from 'react';
import { JournalEntryList } from '@/components/accounting/JournalEntryList';
import { JournalEntryForm } from '@/components/accounting/JournalEntryForm';
import { JournalEntryDetail } from '@/components/accounting/JournalEntryDetail';
import { JournalEntry } from '@/types/api.types';

type ViewMode = 'list' | 'create' | 'edit' | 'view';

export const JournalEntries = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  const handleCreateNew = () => {
    setSelectedEntry(null);
    setViewMode('create');
  };

  const handleView = (journalEntry: JournalEntry) => {
    setSelectedEntry(journalEntry);
    setViewMode('view');
  };

  const handleEdit = (journalEntry: JournalEntry) => {
    setSelectedEntry(journalEntry);
    setViewMode('edit');
  };

  const handleFormSuccess = (journalEntry: JournalEntry) => {
    setSelectedEntry(journalEntry);
    setViewMode('view');
  };

  const handleBackToList = () => {
    setSelectedEntry(null);
    setViewMode('list');
  };

  const handleCancel = () => {
    if (selectedEntry) {
      setViewMode('view');
    } else {
      setViewMode('list');
    }
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'create':
        return (
          <JournalEntryForm
            onSuccess={handleFormSuccess}
            onCancel={handleCancel}
          />
        );

      case 'edit':
        if (!selectedEntry) return null;
        return (
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
            onCancel={handleCancel}
            isEditing={true}
            journalEntryId={selectedEntry.id}
          />
        );

      case 'view':
        if (!selectedEntry) return null;
        return (
          <JournalEntryDetail
            journalEntryId={selectedEntry.id}
            onBack={handleBackToList}
            onEdit={handleEdit}
          />
        );

      case 'list':
      default:
        return (
          <JournalEntryList
            onView={handleView}
            onEdit={handleEdit}
            onCreateNew={handleCreateNew}
          />
        );
    }
  };

  return (
    <div className="container mx-auto py-6">
      {renderContent()}
    </div>
  );
};

