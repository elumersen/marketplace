import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { Trash2, Plus, Calculator } from 'lucide-react';
import { Account, CreateJournalEntryData, JournalEntryStatus } from '@/types/api.types';
import { accountAPI, journalEntryAPI, getErrorMessage } from '@/lib/api';

interface JournalEntryFormProps {
  initialData?: CreateJournalEntryData;
  onSuccess?: (journalEntry: any) => void;
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
  const [formData, setFormData] = useState({
    entryNumber: '',
    entryDate: new Date().toISOString().split('T')[0],
    description: '',
    status: JournalEntryStatus.DRAFT,
  });
  const [entryDate, setEntryDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    // Update formData when entryDate changes
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

  useEffect(() => {
    loadAccounts();
    if (initialData) {
      setFormData({
        entryNumber: initialData.entryNumber || '',
        entryDate: initialData.entryDate,
        description: initialData.description || '',
        status: initialData.status || JournalEntryStatus.DRAFT,
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
    
    // If debit is entered, clear credit and vice versa
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const submitData: CreateJournalEntryData = {
        entryNumber: formData.entryNumber || undefined,
        entryDate: formData.entryDate,
        description: formData.description || undefined,
        status: formData.status,
        lines: lines.map(line => ({
          accountId: line.accountId,
          description: line.description || undefined,
          debit: line.debit,
          credit: line.credit,
        })),
      };

      let response;
      if (isEditing && journalEntryId) {
        response = await journalEntryAPI.update(journalEntryId, submitData);
      } else {
        response = await journalEntryAPI.create(submitData);
      }

      console.log('Journal entry saved successfully:', response.message);
      onSuccess?.(response.journalEntry);
    } catch (error) {
      console.error('Failed to save journal entry:', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const { totalDebits, totalCredits } = calculateTotals();
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Journal Entry Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="entryDate">Entry Date *</Label>
              <DatePicker
                date={entryDate}
                setDate={setEntryDate}
                className="w-full"
              />
              {errors.entryDate && (
                <p className="text-sm text-red-600">{errors.entryDate}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter journal entry description..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Journal Entry Lines
            <Button type="button" onClick={addLine} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>
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
          <div className="flex items-center justify-between">
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
            <div className="flex space-x-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={loading || !isBalanced}>
                {loading ? 'Saving...' : isEditing ? 'Update Entry' : 'Create Entry'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};
