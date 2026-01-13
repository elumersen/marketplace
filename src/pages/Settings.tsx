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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { Lock, Key, Shield } from 'lucide-react';
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
import { DatePicker } from '@/components/ui/date-picker';

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
  const [authMethod, setAuthMethod] = useState<'password' | 'pin'>('password');
  const [lockAuthMethod, setLockAuthMethod] = useState<'password' | 'pin'>('password');
  const [showUpdateAuthDialog, setShowUpdateAuthDialog] = useState(false);
  const [showLockBooksDialog, setShowLockBooksDialog] = useState(false);
  const [showPreviousLocksDialog, setShowPreviousLocksDialog] = useState(false);
  const [lockDate, setLockDate] = useState<Date | undefined>(undefined);
  const [authPassword, setAuthPassword] = useState('');
  const [authPIN, setAuthPIN] = useState('');
  const [bookLocks, setBookLocks] = useState<BookLock[]>([]);
  const [undoLockId, setUndoLockId] = useState<string | null>(null);
  const [showUndoAuthDialog, setShowUndoAuthDialog] = useState(false);
  const [undoAuthPassword, setUndoAuthPassword] = useState('');
  const [undoAuthPIN, setUndoAuthPIN] = useState('');

  const handleUndoLock = async (lockId: string) => {
    setUndoLockId(lockId);
    setShowUndoAuthDialog(true);
  };

  const handleUndoLockConfirm = async () => {
    if (!undoLockId) return;

    try {
      await companySettingsAPI.deleteBookLock(undoLockId, {
        authPassword: undoAuthPassword || undefined,
        authPIN: undoAuthPIN || undefined,
      });
      toast({
        title: 'Success',
        description: 'Book lock removed successfully',
      });
      setShowUndoAuthDialog(false);
      setUndoLockId(null);
      setUndoAuthPassword('');
      setUndoAuthPIN('');
      // Reload book locks
      const response = await companySettingsAPI.getBookLocks();
      setBookLocks(response.bookLocks);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to remove book lock',
        variant: 'destructive',
      });
    }
  };

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
      // Update logo in context to ensure it's displayed on first load
      updateLogoUrl(response.settings.logoUrl);
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

      // Convert Date to YYYY-MM-DD format for API
      const dateString = format(lockDate, 'yyyy-MM-dd');

      await companySettingsAPI.createBookLock({
        dateLocked: dateString,
        authPassword: authPassword && authPassword.trim() !== '' ? authPassword : undefined,
        authPIN: authPIN && authPIN.trim() !== '' ? authPIN : undefined,
      });

      toast({
        title: 'Success',
        description: 'Books locked successfully',
      });

      setShowLockBooksDialog(false);
      setLockDate(undefined);
      setAuthPassword('');
      setAuthPIN('');
      setLockAuthMethod('password');
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Lock Books Authentication
            </DialogTitle>
            <DialogDescription>
              Choose either a password or 4-digit PIN to protect your locked books. You can set one or both methods.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Authentication Method Toggle */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Authentication Method</Label>
              <ToggleGroup
                type="single"
                value={authMethod}
                onValueChange={(value) => value && setAuthMethod(value as 'password' | 'pin')}
                className="grid grid-cols-2 gap-2"
              >
                <ToggleGroupItem
                  value="password"
                  aria-label="Password"
                  className="flex items-center gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  <Key className="h-4 w-4" />
                  <span>Password</span>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="pin"
                  aria-label="PIN"
                  className="flex items-center gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  <Lock className="h-4 w-4" />
                  <span>4-Digit PIN</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Password Input */}
            {authMethod === 'password' && (
              <div className="space-y-2 animate-in fade-in-50 slide-in-from-top-2">
                <Label htmlFor="lockBooksPassword" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Password
                </Label>
                <Input
                  id="lockBooksPassword"
                  type="password"
                  value={lockBooksPassword}
                  onChange={(e) => setLockBooksPassword(e.target.value)}
                  placeholder="Enter a secure password"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Use a strong password to protect your locked books
                </p>
              </div>
            )}

            {/* PIN Input */}
            {authMethod === 'pin' && (
              <div className="space-y-2 animate-in fade-in-50 slide-in-from-top-2">
                <Label htmlFor="lockBooksPIN" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  4-Digit PIN
                </Label>
                <Input
                  id="lockBooksPIN"
                  type="password"
                  inputMode="numeric"
                  value={lockBooksPIN}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setLockBooksPIN(value);
                  }}
                  placeholder="Enter 4-digit PIN"
                  maxLength={4}
                  className="w-full text-center text-2xl tracking-widest font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a 4-digit PIN for quick authentication
                </p>
              </div>
            )}

            {/* Current Status */}
            {(settings?.hasLockBooksPassword || settings?.hasLockBooksPIN) && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                <p className="text-sm font-medium">Current Authentication</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {settings?.hasLockBooksPassword && (
                    <Badge variant="secondary" className="gap-1">
                      <Key className="h-3 w-3" />
                      Password Set
                    </Badge>
                  )}
                  {settings?.hasLockBooksPIN && (
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="h-3 w-3" />
                      PIN Set
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowUpdateAuthDialog(false);
              setLockBooksPassword('');
              setLockBooksPIN('');
              setAuthMethod('password');
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateLockBooksAuth} disabled={!lockBooksPassword && !lockBooksPIN}>
              Save Authentication
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lock Books Dialog */}
      <Dialog open={showLockBooksDialog} onOpenChange={setShowLockBooksDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Lock Books
            </DialogTitle>
            <DialogDescription>
              Lock all transactions on or before the selected date. This action requires
              authentication if a password or PIN has been set.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="lockDate" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Lock Date
              </Label>
              <DatePicker
                date={lockDate}
                setDate={setLockDate}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                All transactions on or before this date will be locked
              </p>
            </div>

            {(settings?.hasLockBooksPassword || settings?.hasLockBooksPIN) && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Authentication Required</Label>
                  <ToggleGroup
                    type="single"
                    value={lockAuthMethod}
                    onValueChange={(value) => value && setLockAuthMethod(value as 'password' | 'pin')}
                    className="grid grid-cols-2 gap-2"
                  >
                    {settings?.hasLockBooksPassword && (
                      <ToggleGroupItem
                        value="password"
                        aria-label="Password"
                        className="flex items-center gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      >
                        <Key className="h-4 w-4" />
                        <span>Password</span>
                      </ToggleGroupItem>
                    )}
                    {settings?.hasLockBooksPIN && (
                      <ToggleGroupItem
                        value="pin"
                        aria-label="PIN"
                        className="flex items-center gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      >
                        <Lock className="h-4 w-4" />
                        <span>4-Digit PIN</span>
                      </ToggleGroupItem>
                    )}
                  </ToggleGroup>
                </div>

                {lockAuthMethod === 'password' && settings?.hasLockBooksPassword && (
                  <div className="space-y-2 animate-in fade-in-50 slide-in-from-top-2">
                    <Label htmlFor="authPassword" className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Password
                    </Label>
                    <Input
                      id="authPassword"
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Enter your password"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && authPassword && lockDate) {
                          handleCreateBookLock();
                        }
                      }}
                    />
                  </div>
                )}

                {lockAuthMethod === 'pin' && settings?.hasLockBooksPIN && (
                  <div className="space-y-2 animate-in fade-in-50 slide-in-from-top-2">
                    <Label htmlFor="authPIN" className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      4-Digit PIN
                    </Label>
                    <Input
                      id="authPIN"
                      type="password"
                      inputMode="numeric"
                      value={authPIN}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setAuthPIN(value);
                      }}
                      placeholder="Enter 4-digit PIN"
                      maxLength={4}
                      className="w-full text-center text-2xl tracking-widest font-mono"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && authPIN && lockDate) {
                          handleCreateBookLock();
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowLockBooksDialog(false);
              setLockDate(undefined);
              setAuthPassword('');
              setAuthPIN('');
              setLockAuthMethod('password');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateBookLock}
              disabled={!lockDate || ((settings?.hasLockBooksPassword || settings?.hasLockBooksPIN) && !authPassword && !authPIN)}
            >
              Lock Books
            </Button>
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
                    <TableHead className="text-right">Actions</TableHead>
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
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUndoLock(lock.id)}
                        >
                          Undo
                        </Button>
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

      {/* Undo Lock Authentication Dialog */}
      <Dialog open={showUndoAuthDialog} onOpenChange={setShowUndoAuthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Authentication Required</DialogTitle>
            <DialogDescription>
              Please enter your password or PIN to remove this book lock.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {settings?.hasLockBooksPassword && (
              <div>
                <Label htmlFor="undoAuthPassword">Password</Label>
                <Input
                  id="undoAuthPassword"
                  type="password"
                  value={undoAuthPassword}
                  onChange={(e) => setUndoAuthPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
            )}
            {settings?.hasLockBooksPIN && (
              <div>
                <Label htmlFor="undoAuthPIN">4-Digit PIN</Label>
                <Input
                  id="undoAuthPIN"
                  type="password"
                  value={undoAuthPIN}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setUndoAuthPIN(value);
                  }}
                  placeholder="Enter 4-digit PIN"
                  maxLength={4}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowUndoAuthDialog(false);
              setUndoLockId(null);
              setUndoAuthPassword('');
              setUndoAuthPIN('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleUndoLockConfirm} disabled={!undoAuthPassword && !undoAuthPIN}>
              Remove Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
