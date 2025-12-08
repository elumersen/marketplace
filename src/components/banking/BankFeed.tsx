import { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { plaidAPI, bankAccountAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Link2, RefreshCw, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import type { PlaidItem, BankAccount } from '@/types/api.types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export const BankFeed = () => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [items, setItems] = useState<PlaidItem[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [linkingAccount, setLinkingAccount] = useState<string | null>(null);
  const [selectedPlaidAccount, setSelectedPlaidAccount] = useState<string | null>(null);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string | null>(null);
  const [shouldOpenPlaid, setShouldOpenPlaid] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch Plaid items and bank accounts
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [itemsResponse, bankAccountsResponse] = await Promise.all([
        plaidAPI.getItems(),
        bankAccountAPI.getAll(),
      ]);
      setItems(itemsResponse.items);
      setBankAccounts(bankAccountsResponse);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  // Plaid Link onSuccess handler
  const onSuccess = useCallback(
    async (publicToken: string) => {
      try {
        setLoading(true);
        await plaidAPI.exchangePublicToken({ public_token: publicToken });
        toast({
          title: 'Success',
          description: 'Bank account connected successfully',
        });
        await fetchData();
        setLinkToken(null);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to connect bank account',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [toast, fetchData]
  );

  // Plaid Link config
  const config = {
    token: linkToken,
    onSuccess,
    onExit: (err: any) => {
      if (err) {
        toast({
          title: 'Error',
          description: err.error_message || 'Failed to connect bank account',
          variant: 'destructive',
        });
      }
      setLinkToken(null);
    },
  };

  const { open, ready } = usePlaidLink(config);

  // Auto-open Plaid Link when token is ready
  useEffect(() => {
    if (linkToken && ready && shouldOpenPlaid) {
      open();
      setShouldOpenPlaid(false);
    }
  }, [linkToken, ready, shouldOpenPlaid, open]);

  // Handle connect button click
  const handleConnect = async () => {
    try {
      setLoading(true);
      const response = await plaidAPI.createLinkToken();
      setLinkToken(response.link_token);
      setShouldOpenPlaid(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create link token',
        variant: 'destructive',
      });
      setLinkToken(null);
      setShouldOpenPlaid(false);
    } finally {
      setLoading(false);
    }
  };

  // Sync accounts
  const handleSyncAccounts = async (itemId?: string) => {
    try {
      setSyncing(itemId || 'all');
      await plaidAPI.syncAccounts(itemId);
      toast({
        title: 'Success',
        description: 'Accounts synced successfully',
      });
      await fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sync accounts',
        variant: 'destructive',
      });
    } finally {
      setSyncing(null);
    }
  };

  // Sync transactions
  const handleSyncTransactions = async (itemId?: string) => {
    try {
      setSyncing(itemId || 'transactions');
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const response = await plaidAPI.syncTransactions({ itemId, startDate, endDate });
      
      if (response.syncedCount > 0) {
        toast({
          title: 'Success',
          description: `Synced ${response.syncedCount} transactions`,
        });
      } else {
        toast({
          title: 'Info',
          description: 'No new transactions found. Make sure your Plaid accounts are linked to bank accounts.',
          variant: 'default',
        });
      }
      
      if (response.errors && response.errors.length > 0) {
        const errorMessages = response.errors.map((e: any) => e.error).join(', ');
        toast({
          title: 'Warning',
          description: errorMessages,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sync transactions',
        variant: 'destructive',
      });
    } finally {
      setSyncing(null);
    }
  };

  // Link Plaid account to bank account
  const handleLinkAccount = async () => {
    if (!selectedPlaidAccount || !selectedBankAccount) {
      toast({
        title: 'Error',
        description: 'Please select both Plaid account and bank account',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLinkingAccount(selectedPlaidAccount);
      await plaidAPI.linkAccount({
        plaidAccountId: selectedPlaidAccount,
        bankAccountId: selectedBankAccount,
      });
      toast({
        title: 'Success',
        description: 'Account linked successfully',
      });
      await fetchData();
      setSelectedPlaidAccount(null);
      setSelectedBankAccount(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to link account',
        variant: 'destructive',
      });
    } finally {
      setLinkingAccount(null);
    }
  };

  // Remove Plaid item - open confirmation dialog
  const handleRemoveItem = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmRemoveItem = async () => {
    if (!itemToDelete) return;

    try {
      setSyncing(itemToDelete);
      await plaidAPI.removeItem(itemToDelete);
      toast({
        title: 'Success',
        description: 'Bank account disconnected successfully',
      });
      await fetchData();
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to disconnect bank account',
        variant: 'destructive',
      });
    } finally {
      setSyncing(null);
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bank Feed</h2>
          <p className="text-muted-foreground">Connect and sync your bank accounts with Plaid</p>
        </div>
        <Button onClick={handleConnect} disabled={loading} size="lg">
          {loading ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Connecting...
            </>
          ) : (
            <>
              <Link2 className="mr-2 h-4 w-4" />
              Connect Bank Account
            </>
          )}
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bank accounts connected</h3>
            <p className="text-muted-foreground text-center mb-4">
              Connect your bank account to automatically import transactions
            </p>
            <Button onClick={handleConnect} disabled={loading}>
              {loading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Connect Your First Bank Account
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            return (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {item.institutionName || 'Unknown Bank'}
                        {item.isActive ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Connected on {new Date(item.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncAccounts(item.itemId)}
                        disabled={syncing === item.itemId || syncing === 'all'}
                      >
                        {syncing === item.itemId || syncing === 'all' ? (
                          <>
                            <Spinner size="sm" className="mr-2" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync Accounts
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncTransactions(item.itemId)}
                        disabled={
                          syncing === item.itemId ||
                          syncing === 'transactions' ||
                          item.plaidAccounts.filter((acc) => acc.bankAccountId).length === 0
                        }
                        title={
                          item.plaidAccounts.filter((acc) => acc.bankAccountId).length === 0
                            ? 'Link accounts first to sync transactions'
                            : ''
                        }
                      >
                        {syncing === item.itemId || syncing === 'transactions' ? (
                          <>
                            <Spinner size="sm" className="mr-2" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync Transactions
                          </>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={syncing === item.id}
                      >
                        {syncing === item.id ? (
                          <Spinner size="sm" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {item.error && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertDescription>{item.error}</AlertDescription>
                    </Alert>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {item.plaidAccounts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No accounts found</p>
                    ) : (
                      <>
                        {item.plaidAccounts.filter((acc) => !acc.bankAccountId).length > 0 && (
                          <Alert className="mb-4">
                            <AlertDescription>
                              <strong>Note:</strong> Link your Plaid accounts to bank accounts to sync transactions. 
                              Click "Link Account" on unlinked accounts below.
                            </AlertDescription>
                          </Alert>
                        )}
                        <div className="space-y-2">
                          {item.plaidAccounts.map((account) => (
                          <div
                            key={account.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {account.name}
                                  {account.mask && ` ••••${account.mask}`}
                                </p>
                                {account.bankAccountId ? (
                                  <Badge variant="outline" className="bg-green-50">
                                    Linked
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Unlinked</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {account.type} • {account.subtype || 'N/A'}
                              </p>
                              {account.balanceCurrent !== null && (
                                <p className="text-sm font-medium mt-1">
                                  Balance: ${account.balanceCurrent.toFixed(2)}
                                </p>
                              )}
                            </div>
                            {!account.bankAccountId && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedPlaidAccount(account.id)}
                                  >
                                    Link Account
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Link Plaid Account to Bank Account</DialogTitle>
                                    <DialogDescription>
                                      Select a bank account to link with this Plaid account
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label>Plaid Account</Label>
                                      <p className="text-sm text-muted-foreground">
                                        {account.name}
                                        {account.mask && ` ••••${account.mask}`}
                                      </p>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="bank-account">Bank Account</Label>
                                      <Select
                                        value={selectedBankAccount || ''}
                                        onValueChange={setSelectedBankAccount}
                                      >
                                        <SelectTrigger id="bank-account">
                                          <SelectValue placeholder="Select a bank account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {bankAccounts
                                            .filter((ba) => ba.isActive)
                                            .map((ba) => (
                                              <SelectItem key={ba.id} value={ba.id}>
                                                {ba.name} ({ba.accountNumber})
                                              </SelectItem>
                                            ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <Button
                                      onClick={handleLinkAccount}
                                      disabled={!selectedBankAccount || linkingAccount === account.id}
                                      className="w-full"
                                    >
                                      {linkingAccount === account.id ? (
                                        <>
                                          <Spinner size="sm" className="mr-2" />
                                          Linking...
                                        </>
                                      ) : (
                                        'Link Account'
                                      )}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        ))}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Bank Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect this bank account? This action cannot be undone and all associated Plaid accounts will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveItem}
              className="bg-red-600 hover:bg-red-700"
              disabled={syncing === itemToDelete}
            >
              {syncing === itemToDelete ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

