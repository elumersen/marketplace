import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { companySettingsAPI } from '@/lib/api';
import { useCompanySettings } from '@/contexts/CompanySettingsContext';
import {
  CompanySettings,
  AccountingMethod,
  EntityType,
  BookLock,
} from '@/types/api.types';
import { format } from 'date-fns';
import { getRetainedEarningsName } from '@/lib/accountNaming';

export const Settings = () => {
  const { toast } = useToast();
  const { logoUrl, updateLogoUrl, refreshSettings } = useCompanySettings();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Company Settings State
  const [accountingMethod, setAccountingMethod] = useState<AccountingMethod>(AccountingMethod.ACCRUAL);
  const [entityType, setEntityType] = useState<EntityType>(EntityType.SOLE_PROPRIETORSHIP);
  const [journalEntryPrefix, setJournalEntryPrefix] = useState('');
  const [tempJournalEntryPrefix, setTempJournalEntryPrefix] = useState('');
  const [isEditingPrefix, setIsEditingPrefix] = useState(false);

  // Lock Books State
  const [lockBooksPassword, setLockBooksPassword] = useState('');
  const [lockBooksPIN, setLockBooksPIN] = useState('');
  const [showUpdateAuthDialog, setShowUpdateAuthDialog] = useState(false);
  const [showLockBooksDialog, setShowLockBooksDialog] = useState(false);
  const [showPreviousLocksDialog, setShowPreviousLocksDialog] = useState(false);
  const [lockDate, setLockDate] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authPIN, setAuthPIN] = useState('');
  const [bookLocks, setBookLocks] = useState<BookLock[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await companySettingsAPI.getSettings();
      setSettings(response.settings);
      setAccountingMethod(response.settings.accountingMethod);
      setEntityType(response.settings.entityType);
      setJournalEntryPrefix(response.settings.journalEntryPrefix || '');
      setTempJournalEntryPrefix(response.settings.journalEntryPrefix || '');
      // Logo is now managed by context, no need to set it here
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load settings',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await companySettingsAPI.updateSettings({
        accountingMethod,
        entityType,
        journalEntryPrefix: journalEntryPrefix || null,
        // logoUrl is managed separately through context
      });
      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
      loadSettings();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save settings',
      });
    }
  };

  const handleSavePrefix = async () => {
    try {
      await companySettingsAPI.updateSettings({
        journalEntryPrefix: tempJournalEntryPrefix || null,
      });
      setJournalEntryPrefix(tempJournalEntryPrefix);
      setIsEditingPrefix(false);
      toast({
        title: 'Success',
        description: 'Journal entry prefix saved successfully',
      });
      loadSettings();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save journal entry prefix',
      });
    }
  };

  const handleCancelPrefix = () => {
    setTempJournalEntryPrefix(journalEntryPrefix);
    setIsEditingPrefix(false);
  };

  const handleUpdateLockBooksAuth = async () => {
    try {
      if (!lockBooksPassword && !lockBooksPIN) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Please enter either a password or a 4-digit PIN',
        });
        return;
      }

      if (lockBooksPIN && !/^\d{4}$/.test(lockBooksPIN)) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'PIN must be exactly 4 digits',
        });
        return;
      }

      await companySettingsAPI.updateLockBooksAuth({
        password: lockBooksPassword || undefined,
        pin: lockBooksPIN || undefined,
      });

      toast({
        title: 'Success',
        description: 'Lock books authentication updated successfully',
      });

      setShowUpdateAuthDialog(false);
      setLockBooksPassword('');
      setLockBooksPIN('');
      loadSettings();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update lock books authentication',
      });
    }
  };

  const handleRemoveLockBooksAuth = async () => {
    try {
      await companySettingsAPI.removeLockBooksAuth();
      toast({
        title: 'Success',
        description: 'Lock books authentication removed successfully',
      });
      loadSettings();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove lock books authentication',
      });
    }
  };

  const handleCreateBookLock = async () => {
    try {
      if (!lockDate) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Please select a lock date',
        });
        return;
      }

      await companySettingsAPI.createBookLock({
        dateLocked: lockDate,
        authPassword: authPassword || undefined,
        authPIN: authPIN || undefined,
      });

      toast({
        title: 'Success',
        description: 'Books locked successfully',
      });

      setShowLockBooksDialog(false);
      setLockDate('');
      setAuthPassword('');
      setAuthPIN('');
      loadSettings();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.error || 'Failed to lock books',
      });
    }
  };

  const handleViewPreviousLocks = async () => {
    try {
      const response = await companySettingsAPI.getBookLocks();
      setBookLocks(response.bookLocks);
      setShowPreviousLocksDialog(true);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load book locks',
      });
    }
  };

  const handleBrowseLogo = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        // In a real implementation, you would upload the file to a server
        // and get back a URL. For now, we'll use a data URL
        const reader = new FileReader();
        reader.onload = async (event) => {
          const dataUrl = event.target?.result as string;
          
          try {
            // Update in database
            await companySettingsAPI.updateSettings({ logoUrl: dataUrl });
            
            // Update in context (this will immediately update the sidebar)
            updateLogoUrl(dataUrl);
            
            toast({
              title: 'Success',
              description: 'Logo uploaded successfully',
            });
            
            // Refresh settings to sync everything
            await refreshSettings();
          } catch (error) {
            toast({
              variant: 'destructive',
              title: 'Error',
              description: 'Failed to upload logo',
            });
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleClearLogo = async () => {
    try {
      // Update in database
      await companySettingsAPI.updateSettings({ logoUrl: null });
      
      // Update in context (this will immediately update the sidebar)
      updateLogoUrl(null);
      
      toast({
        title: 'Success',
        description: 'Logo cleared successfully',
      });
      
      // Refresh settings to sync everything
      await refreshSettings();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to clear logo',
      });
    }
  };

  const getEntityTypeLabel = (type: EntityType) => {
    const labels: Record<EntityType, string> = {
      [EntityType.SOLE_PROPRIETORSHIP]: 'Sole Proprietorship',
      [EntityType.PARTNERSHIP]: 'Partnership',
      [EntityType.LIMITED_LIABILITY_COMPANY]: 'Limited Liability Company',
      [EntityType.S_CORPORATION]: 'S Corporation',
      [EntityType.C_CORPORATION]: 'C Corporation',
      [EntityType.NONPROFIT]: 'Nonprofit',
    };
    return labels[type];
  };

  if (loading) {
    return <div className="p-6">Loading settings...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList>
          <TabsTrigger value="personal">Personal Settings</TabsTrigger>
          <TabsTrigger value="company">Company Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Settings</CardTitle>
              <CardDescription>
                Manage your personal account settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Personal settings coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company">
          <div className="space-y-6">
            {/* Accounting Method */}
            <Card>
              <CardHeader>
                <CardTitle>Accounting Method</CardTitle>
                <CardDescription>
                  Choose between Cash or Accrual accounting. This will affect how
                  reports are shown.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Select
                      value={accountingMethod}
                      onValueChange={(value) => setAccountingMethod(value as AccountingMethod)}
                    >
                      <SelectTrigger id="accountingMethod">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={AccountingMethod.CASH}>Cash</SelectItem>
                        <SelectItem value={AccountingMethod.ACCRUAL}>Accrual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Entity Type */}
            <Card>
              <CardHeader>
                <CardTitle>Entity Type</CardTitle>
                <CardDescription>
                  Select your business entity type. This will affect how certain
                  accounts are named in the Chart of Accounts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Select
                      value={entityType}
                      onValueChange={(value) => setEntityType(value as EntityType)}
                    >
                      <SelectTrigger id="entityType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={EntityType.SOLE_PROPRIETORSHIP}>
                          {getEntityTypeLabel(EntityType.SOLE_PROPRIETORSHIP)}
                        </SelectItem>
                        <SelectItem value={EntityType.PARTNERSHIP}>
                          {getEntityTypeLabel(EntityType.PARTNERSHIP)}
                        </SelectItem>
                        <SelectItem value={EntityType.LIMITED_LIABILITY_COMPANY}>
                          {getEntityTypeLabel(EntityType.LIMITED_LIABILITY_COMPANY)}
                        </SelectItem>
                        <SelectItem value={EntityType.S_CORPORATION}>
                          {getEntityTypeLabel(EntityType.S_CORPORATION)}
                        </SelectItem>
                        <SelectItem value={EntityType.C_CORPORATION}>
                          {getEntityTypeLabel(EntityType.C_CORPORATION)}
                        </SelectItem>
                        <SelectItem value={EntityType.NONPROFIT}>
                          {getEntityTypeLabel(EntityType.NONPROFIT)}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {entityType && (
                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      <strong>Note:</strong> The Retained Earnings account will be named{' '}
                      <strong>"{getRetainedEarningsName(entityType)}"</strong> for this entity type.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Journal Entry Number Prefix */}
            <Card>
              <CardHeader>
                <CardTitle>Journal Entry Preset</CardTitle>
                <CardDescription>
                  Set a custom prefix that will appear at the beginning of every
                  journal entry number.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    id="journalEntryPrefix"
                    value={tempJournalEntryPrefix}
                    onChange={(e) => {
                      setTempJournalEntryPrefix(e.target.value);
                      setIsEditingPrefix(true);
                    }}
                    placeholder="Enter prefix (optional)"
                  />
                  {isEditingPrefix && (
                    <div className="flex gap-2">
                      <Button onClick={handleSavePrefix}>Save</Button>
                      <Button variant="outline" onClick={handleCancelPrefix}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Logo */}
            <Card>
              <CardHeader>
                <CardTitle>Logo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="mt-2 border-2 border-dashed rounded-lg p-6 bg-gray-50 flex items-center justify-center min-h-[180px]" style={{ maxWidth: '400px' }}>
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Company Logo"
                          className="max-h-32 max-w-full object-contain"
                        />
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          <p className="text-sm font-medium">No logo uploaded</p>
                          <p className="text-xs mt-1">Using default logo in sidebar</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleBrowseLogo}>Browse</Button>
                    {logoUrl && (
                      <Button variant="outline" onClick={handleClearLogo}>
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lock Books */}
            <Card>
              <CardHeader>
                <CardTitle>Lock Books</CardTitle>
                <CardDescription>
                  Lock your company's books to prevent changes to transactions on or
                  before a specific date. Changes to locked transactions require
                  authentication.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Password/PIN</Label>
                    <div className="flex gap-2 mt-2">
                      <Button onClick={() => setShowUpdateAuthDialog(true)}>
                        {settings?.hasLockBooksPassword || settings?.hasLockBooksPIN
                          ? 'Update'
                          : 'Set Password/PIN'}
                      </Button>
                      {(settings?.hasLockBooksPassword || settings?.hasLockBooksPIN) && (
                        <Button variant="outline" onClick={handleRemoveLockBooksAuth}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Lock Books</Label>
                    <div className="flex gap-2 mt-2">
                      <Button onClick={() => setShowLockBooksDialog(true)}>
                        Lock Books
                      </Button>
                      <Button variant="outline" onClick={handleViewPreviousLocks}>
                        View Previous
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save All Button */}
            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} size="lg">
                Save Settings
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Update Lock Books Authentication Dialog */}
      <Dialog open={showUpdateAuthDialog} onOpenChange={setShowUpdateAuthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Lock Books Authentication</DialogTitle>
            <DialogDescription>
              Set a password or 4-digit PIN to protect locked books. Either one can be
              used for authentication.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="lockBooksPassword">Password (optional)</Label>
              <Input
                id="lockBooksPassword"
                type="password"
                value={lockBooksPassword}
                onChange={(e) => setLockBooksPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
            <div>
              <Label htmlFor="lockBooksPIN">4-Digit PIN (optional)</Label>
              <Input
                id="lockBooksPIN"
                type="password"
                value={lockBooksPIN}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setLockBooksPIN(value);
                }}
                placeholder="Enter 4-digit PIN"
                maxLength={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateAuthDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateLockBooksAuth}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lock Books Dialog */}
      <Dialog open={showLockBooksDialog} onOpenChange={setShowLockBooksDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock Books</DialogTitle>
            <DialogDescription>
              Lock all transactions on or before the selected date. This action requires
              authentication if a password or PIN has been set.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="lockDate">Lock Date</Label>
              <Input
                id="lockDate"
                type="date"
                value={lockDate}
                onChange={(e) => setLockDate(e.target.value)}
              />
            </div>
            {(settings?.hasLockBooksPassword || settings?.hasLockBooksPIN) && (
              <>
                {settings?.hasLockBooksPassword && (
                  <div>
                    <Label htmlFor="authPassword">Password</Label>
                    <Input
                      id="authPassword"
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Enter password"
                    />
                  </div>
                )}
                {settings?.hasLockBooksPIN && (
                  <div>
                    <Label htmlFor="authPIN">PIN</Label>
                    <Input
                      id="authPIN"
                      type="password"
                      value={authPIN}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setAuthPIN(value);
                      }}
                      placeholder="Enter 4-digit PIN"
                      maxLength={4}
                    />
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLockBooksDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBookLock}>Lock Books</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Previous Locks Dialog */}
      <Dialog open={showPreviousLocksDialog} onOpenChange={setShowPreviousLocksDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Previous Book Locks</DialogTitle>
            <DialogDescription>
              View all previous book locks and their details
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {bookLocks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No book locks found
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Locked</TableHead>
                    <TableHead>Date Placed</TableHead>
                    <TableHead>Placed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookLocks.map((lock) => (
                    <TableRow key={lock.id}>
                      <TableCell>
                        {format(new Date(lock.dateLocked), 'MM/dd/yyyy')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(lock.datePlaced), 'MM/dd/yyyy')}
                      </TableCell>
                      <TableCell>
                        {lock.placedByUser?.firstName && lock.placedByUser?.lastName
                          ? `${lock.placedByUser.firstName} ${lock.placedByUser.lastName}`
                          : lock.placedByUser?.email || 'Unknown'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPreviousLocksDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
