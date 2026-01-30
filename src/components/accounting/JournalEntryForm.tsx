import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { Trash2, Plus, Calculator, ArrowLeft } from 'lucide-react';
import { Account, CompanySettings, CreateJournalEntryData, JournalEntry, JournalEntryStatus, UpdateJournalEntryData } from '@/types/api.types';
import { accountAPI, journalEntryAPI, companySettingsAPI, getErrorMessage } from '@/lib/api';
import { Checkbox } from '@/components/ui/checkbox';
import { BookLockAuthDialog } from '@/components/common/BookLockAuthDialog';
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
import { useToast } from '@/hooks/use-toast';

interface JournalEntryFormProps {
  initialData?: CreateJournalEntryData;
  onSuccess?: (journalEntry: JournalEntry) => void;
  onCancel?: () => void;
  isEditing?: boolean;
  journalEntryId?: string;
}

interface JournalEntryLineForm {
  id?: string;
  accountId: string;
  description: string;
  debit: number;
  credit: number;
}

export const JournalEntryForm: React.FC<JournalEntryFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
  isEditing = false,
  journalEntryId,
}) => {
  const { toast } = useToast();
  const draftReminderResolvedRef = useRef(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [lockAuthDialogOpen, setLockAuthDialogOpen] = useState(false);
  const [lockDate, setLockDate] = useState<string | undefined>(undefined);
  const [originalStatus, setOriginalStatus] = useState<JournalEntryStatus>(JournalEntryStatus.DRAFT);
  const [formData, setFormData] = useState({
    entryNumber: '',
    entryDate: new Date().toISOString().split('T')[0],
    description: '',
    status: JournalEntryStatus.DRAFT,
    isAdjusting: false,
  });
  const [entryDate, setEntryDate] = useState<Date | undefined>(new Date());
  const [draftReminderOpen, setDraftReminderOpen] = useState(false);
  const [draftReminderEntryId, setDraftReminderEntryId] = useState<string | null>(null);
  const [draftReminderBusy, setDraftReminderBusy] = useState(false);
  const [draftReminderJournalEntry, setDraftReminderJournalEntry] = useState<JournalEntry | null>(null);

  useEffect(() => {
    if (entryDate) {
      setFormData(prev => ({
        ...prev,
        entryDate: entryDate.toISOString().split('T')[0]
      }));
    }
  }, [entryDate]);

  const [lines, setLines] = useState<JournalEntryLineForm[]>([
    { accountId: '', description: '', debit: 0, credit: 0 },
    { accountId: '', description: '', debit: 0, credit: 0 },
  ]);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [journalEntryPrefix, setJournalEntryPrefix] = useState<string>('');

  useEffect(() => {
    loadAccounts();
    loadCompanySettings();
    if (initialData) {
      setOriginalStatus(initialData.status || JournalEntryStatus.DRAFT);
      setFormData({
        entryNumber: initialData.entryNumber || '',
        entryDate: initialData.entryDate,
        description: initialData.description || '',
        status: initialData.status || JournalEntryStatus.DRAFT,
        isAdjusting: Boolean(initialData.isAdjusting),
      });
      setEntryDate(new Date(initialData.entryDate));
      setLines(initialData.lines.map(line => ({
        accountId: line.accountId,
        description: line.description || '',
        debit: line.debit,
        credit: line.credit,
      })));
    }
  }, [initialData]);

  useEffect(() => {
    if (!initialData && journalEntryPrefix) {
      setFormData(prev => ({
        ...prev,
        entryNumber: journalEntryPrefix,
      }));
    }
  }, [journalEntryPrefix, initialData]);

  const loadCompanySettings = async () => {
    try {
      const response = await companySettingsAPI.getSettings();
      setCompanySettings(response.settings);
      const prefix = response.settings.journalEntryPrefix || '';
      setJournalEntryPrefix(prefix);
      if (!initialData) {
        setFormData(prev => ({
          ...prev,
          entryNumber: prefix || '',
        }));
      }
    } catch (error) {
      console.error('Failed to load company settings:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await accountAPI.getAll({ isActive: true, all: 'true' });
      setAccounts(response.data || []);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const addLine = () => {
    setLines([...lines, { accountId: '', description: '', debit: 0, credit: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof JournalEntryLineForm, value: string | number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    if (field === 'debit' && typeof value === 'number' && value > 0) {
      newLines[index].credit = 0;
    } else if (field === 'credit' && typeof value === 'number' && value > 0) {
      newLines[index].debit = 0;
    }
    
    setLines(newLines);
  };

  const calculateTotals = () => {
    const totalDebits = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredits = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    return { totalDebits, totalCredits };
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.entryDate) {
      newErrors.entryDate = 'Entry date is required';
    }

    if (lines.length < 2) {
      newErrors.lines = 'At least two line items are required';
    }

    const { totalDebits, totalCredits } = calculateTotals();
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      newErrors.balance = 'Total debits must equal total credits';
    }

    const hasDebit = lines.some(line => line.debit > 0);
    const hasCredit = lines.some(line => line.credit > 0);
    if (!hasDebit || !hasCredit) {
      newErrors.balance = 'Journal entry must have at least one debit and one credit';
    }

    lines.forEach((line, index) => {
      if (!line.accountId) {
        newErrors[`line_${index}_account`] = 'Account is required';
      }
      if (line.debit === 0 && line.credit === 0) {
        newErrors[`line_${index}_amount`] = 'Either debit or credit amount is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitJournalEntry = async (authPassword?: string, authPIN?: string) => {
    if (!validateForm()) {
      return;
    }

    const dateStr = formData.entryDate?.split('T')[0];
    const requiresLockAuth = Boolean(
      companySettings?.hasLockBooksPassword || companySettings?.hasLockBooksPIN
    );

    if (dateStr && requiresLockAuth) {
      try {
        const lockCheck = await companySettingsAPI.checkDateLocked(dateStr);
        if (lockCheck.isLocked && !authPassword && !authPIN) {
          setLockDate(lockCheck.lockDate);
          setLockAuthDialogOpen(true);
          return;
        }
      } catch {
        // If lock check fails, proceed (backend will still enforce when applicable)
      }
    }

    setLoading(true);
    try {
      const statusToSave =
        isEditing && originalStatus === JournalEntryStatus.POSTED
          ? JournalEntryStatus.POSTED
          : formData.status;

      const baseData = {
        entryNumber: formData.entryNumber || journalEntryPrefix || undefined,
        entryDate: formData.entryDate,
        description: formData.description || undefined,
        status: statusToSave,
        isAdjusting: formData.isAdjusting,
        ...(authPassword ? { authPassword } : {}),
        ...(authPIN ? { authPIN } : {}),
        lines: lines.map((line) => ({
          accountId: line.accountId,
          description: line.description || undefined,
          debit: line.debit,
          credit: line.credit,
        })),
      };

      let response: { journalEntry: JournalEntry };
      if (isEditing && journalEntryId) {
        response = await journalEntryAPI.update(
          journalEntryId,
          baseData as UpdateJournalEntryData
        );
      } else {
        response = await journalEntryAPI.create(baseData as CreateJournalEntryData);
      }

      if (response.journalEntry?.status === JournalEntryStatus.DRAFT) {
        draftReminderResolvedRef.current = false;
        setDraftReminderEntryId(response.journalEntry.id);
        setDraftReminderJournalEntry(response.journalEntry);
        setDraftReminderOpen(true);
      } else {
        toast({
          variant: 'success',
          title: 'Success',
          description: isEditing ? 'Journal entry updated successfully' : 'Journal entry created successfully',
        });
        onSuccess?.(response.journalEntry);
      }
      setLockAuthDialogOpen(false);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      const requiresLockAuth = Boolean(
        companySettings?.hasLockBooksPassword || companySettings?.hasLockBooksPIN
      );

      if (
        requiresLockAuth &&
        (errorMessage.includes('Authentication required') ||
          errorMessage.includes('Invalid authentication') ||
          errorMessage.includes('credentials') ||
          errorMessage.includes('403'))
      ) {
        setLockAuthDialogOpen(true);
        return;
      }

      console.error('Failed to save journal entry:', errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitJournalEntry();
  };

  const handleDraftReminderNo = () => {
    if (draftReminderBusy) return;
    if (!draftReminderJournalEntry) {
      setDraftReminderOpen(false);
      setDraftReminderEntryId(null);
      return;
    }

    draftReminderResolvedRef.current = true;
    toast({
      variant: 'success',
      title: 'Success',
      description: isEditing ? 'Journal entry updated as Draft' : 'Journal entry created as Draft',
    });
    const je = draftReminderJournalEntry;
    setDraftReminderOpen(false);
    setDraftReminderEntryId(null);
    setDraftReminderJournalEntry(null);
    onSuccess?.(je);
  };

  const handleDraftReminderPost = async () => {
    if (!draftReminderEntryId) return;
    try {
      setDraftReminderBusy(true);
      draftReminderResolvedRef.current = true;
      const response = await journalEntryAPI.updateStatus(draftReminderEntryId, JournalEntryStatus.POSTED);
      toast({
        variant: 'success',
        title: 'Success',
        description: 'Journal entry posted successfully',
      });
      setDraftReminderOpen(false);
      setDraftReminderEntryId(null);
      setDraftReminderJournalEntry(null);
      onSuccess?.(response.journalEntry);
    } catch (error) {
      console.error('Failed to post journal entry:', getErrorMessage(error));
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getErrorMessage(error),
      });
    } finally {
      setDraftReminderBusy(false);
    }
  };

  const handleLockAuthDialogAuthenticate = (password?: string, pin?: string) => {
    setLockAuthDialogOpen(false);
    submitJournalEntry(password, pin);
  };

  const { totalDebits, totalCredits } = calculateTotals();
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {isEditing ? 'Update Journal Entry' : 'Create Journal Entry'}
              </CardTitle>
            </div>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryNumber">Entry Number</Label>
              <Input
                id="entryNumber"
                value={formData.entryNumber}
                onChange={(e) => setFormData({ ...formData, entryNumber: e.target.value })}
                placeholder="Auto-generated if empty"
                disabled={isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entryDate">Date</Label>
              <DatePicker
                date={entryDate}
                setDate={setEntryDate}
                className="w-full"
              />
              {errors.entryDate && (
                <p className="text-sm text-red-600">{errors.entryDate}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="isAdjusting">Adjusting</Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-background px-3">
                <Checkbox
                  id="isAdjusting"
                  checked={formData.isAdjusting}
                  className="scale-125"
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isAdjusting: checked === true })
                  }
                />
                <span className="ml-2 text-sm text-foreground">Adjusting</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                disabled={isEditing && originalStatus === JournalEntryStatus.POSTED}
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as JournalEntryStatus })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={JournalEntryStatus.DRAFT}>Draft</SelectItem>
                  <SelectItem value={JournalEntryStatus.POSTED}>Posted</SelectItem>
                  <SelectItem value={JournalEntryStatus.VOID}>Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Journal Entry Lines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Account *</Label>
                  <Select
                    value={line.accountId || undefined}
                    onValueChange={(value) => updateLine(index, 'accountId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors[`line_${index}_account`] && (
                    <p className="text-sm text-red-600">{errors[`line_${index}_account`]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={line.description}
                    onChange={(e) => updateLine(index, 'description', e.target.value)}
                    placeholder="Line description"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Debit</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.debit || ''}
                    onChange={(e) => updateLine(index, 'debit', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                  {errors[`line_${index}_amount`] && (
                    <p className="text-sm text-red-600">{errors[`line_${index}_amount`]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Credit</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.credit || ''}
                    onChange={(e) => updateLine(index, 'credit', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => removeLine(index)}
                    size="sm"
                    variant="outline"
                    disabled={lines.length <= 2}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {errors.lines && (
            <Alert className="mt-4">
              <AlertDescription>{errors.lines}</AlertDescription>
            </Alert>
          )}

          {errors.balance && (
            <Alert className="mt-4" variant="destructive">
              <AlertDescription>{errors.balance}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calculator className="h-4 w-4" />
                <span className="text-sm font-medium">Total Debits:</span>
                <span className={`text-sm font-mono ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  ${totalDebits.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Total Credits:</span>
                <span className={`text-sm font-mono ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  ${totalCredits.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pl-2 pr-2">
            <Button 
              type="button" 
              onClick={addLine} 
              size="sm" 
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>
            <div className="flex space-x-2">
              <Button type="submit" disabled={loading || !isBalanced}>
                {loading ? 'Saving...' : isEditing ? 'Update Entry' : 'Create Entry'}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      </form>

      <AlertDialog
        open={draftReminderOpen}
        onOpenChange={(open) => {
          if (
            !open &&
            !draftReminderResolvedRef.current &&
            draftReminderJournalEntry &&
            !draftReminderBusy
          ) {
            handleDraftReminderNo();
          }
          setDraftReminderOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Journal Entry Drafted</AlertDialogTitle>
            <AlertDialogDescription>
              This Journal Entry is now Drafted. Do you want to post now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={draftReminderBusy}
              onClick={() => {
                handleDraftReminderNo();
              }}
            >
              No
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDraftReminderPost} disabled={draftReminderBusy}>
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BookLockAuthDialog
        open={lockAuthDialogOpen}
        onOpenChange={(open) => {
          setLockAuthDialogOpen(open);
          if (!open) {
            setLockDate(undefined);
          }
        }}
        onAuthenticate={handleLockAuthDialogAuthenticate}
        settings={companySettings || undefined}
        lockDate={lockDate}
        title="Books Locked"
        description="The books are locked for this date. Enter your password/PIN to save these changes."
      />
    </>
  );
};
