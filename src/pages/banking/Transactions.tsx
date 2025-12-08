import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BankFeed } from '@/components/banking/BankFeed';
import { TransactionList } from '@/components/banking/TransactionList';

export const Transactions = () => {
  const [activeTab, setActiveTab] = useState('transactions');

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Banking</h1>
        <p className="text-muted-foreground">Manage transactions and bank feeds</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="bank-feed">Bank Feed</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <TransactionList />
        </TabsContent>

        <TabsContent value="bank-feed" className="space-y-4">
          <BankFeed />
        </TabsContent>
      </Tabs>
    </div>
  );
};

