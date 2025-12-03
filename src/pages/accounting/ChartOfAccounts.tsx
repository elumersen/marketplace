import { useState } from 'react';
import { ChartOfAccountsList } from '@/components/accounting/ChartOfAccountsList';
import { ChartOfAccountsForm } from '@/components/accounting/ChartOfAccountsForm';
import { ChartOfAccountsDetail } from '@/components/accounting/ChartOfAccountsDetail';
import { Account } from '@/types/api.types';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

type SheetMode = 'create' | 'edit' | 'view' | null;

export const ChartOfAccounts = () => {
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const openSheet = (mode: SheetMode, account?: Account | null) => {
    setSheetMode(mode);
    setSelectedAccount(account ?? null);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setTimeout(() => {
      setSheetMode(null);
      setSelectedAccount(null);
    }, 200);
  };

  const handleCreateNew = () => openSheet('create');

  const handleView = (account: Account) => openSheet('view', account);

  const handleEdit = (account: Account) => openSheet('edit', account);

  const handleFormSuccess = (account: Account) => {
    setRefreshSignal((prev) => prev + 1);
    openSheet('view', account);
  };

  return (
    <div className="container mx-auto py-6">
      <ChartOfAccountsList
        onView={handleView}
        onEdit={handleEdit}
        onCreateNew={handleCreateNew}
        refreshSignal={refreshSignal}
      />

      <Sheet open={sheetOpen} onOpenChange={(open) => (open ? null : closeSheet())}>
        <SheetContent side="right" className="sm:max-w-4xl w-full overflow-y-auto [&>button]:hidden">
          <VisuallyHidden>
            <SheetTitle>Chart of Accounts</SheetTitle>
          </VisuallyHidden>
          {sheetMode === 'create' && (
            <ChartOfAccountsForm onSuccess={handleFormSuccess} onCancel={closeSheet} />
          )}

          {sheetMode === 'edit' && selectedAccount && (
            <ChartOfAccountsForm
              initialData={{
                code: selectedAccount.code,
                name: selectedAccount.name,
                type: selectedAccount.type,
                subType: selectedAccount.subType,
              }}
              onSuccess={handleFormSuccess}
              onCancel={closeSheet}
              isEditing={true}
              accountId={selectedAccount.id}
            />
          )}

          {sheetMode === 'view' && selectedAccount && (
            <ChartOfAccountsDetail
              accountId={selectedAccount.id}
              onBack={closeSheet}
              onEdit={handleEdit}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

