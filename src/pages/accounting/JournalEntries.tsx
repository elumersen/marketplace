import { useState } from 'react';
import { JournalEntryList } from '@/components/accounting/JournalEntryList';

export const JournalEntries = () => {
  const [refreshSignal, setRefreshSignal] = useState(0);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-2 py-2">
      <JournalEntryList
        refreshSignal={refreshSignal}
      />
    </div>
  );
};

