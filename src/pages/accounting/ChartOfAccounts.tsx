import { useState } from 'react';
import { ChartOfAccountsList } from '@/components/accounting/ChartOfAccountsList';
import { ChartOfAccountsForm } from '@/components/accounting/ChartOfAccountsForm';
import { ChartOfAccountsDetail } from '@/components/accounting/ChartOfAccountsDetail';
import { Account } from '@/types/api.types';

type ViewMode = 'list' | 'create' | 'edit' | 'view';

export const ChartOfAccounts = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const handleCreateNew = () => {
    setSelectedAccount(null);
    setViewMode('create');
  };

  const handleView = (account: Account) => {
    setSelectedAccount(account);
    setViewMode('view');
  };

  const handleEdit = (account: Account) => {
    setSelectedAccount(account);
    setViewMode('edit');
  };

  const handleFormSuccess = (account: Account) => {
    setSelectedAccount(account);
    setViewMode('view');
  };

  const handleBackToList = () => {
    setSelectedAccount(null);
    setViewMode('list');
  };

  const handleCancel = () => {
    if (selectedAccount) {
      setViewMode('view');
    } else {
      setViewMode('list');
    }
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'create':
        return (
          <ChartOfAccountsForm
            onSuccess={handleFormSuccess}
            onCancel={handleCancel}
          />
        );

      case 'edit':
        if (!selectedAccount) return null;
        return (
          <ChartOfAccountsForm
            initialData={{
              code: selectedAccount.code,
              name: selectedAccount.name,
              type: selectedAccount.type,
              subType: selectedAccount.subType,
            }}
            onSuccess={handleFormSuccess}
            onCancel={handleCancel}
            isEditing={true}
            accountId={selectedAccount.id}
          />
        );

      case 'view':
        if (!selectedAccount) return null;
        return (
          <ChartOfAccountsDetail
            accountId={selectedAccount.id}
            onBack={handleBackToList}
            onEdit={handleEdit}
          />
        );

      case 'list':
      default:
        return (
          <ChartOfAccountsList
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

