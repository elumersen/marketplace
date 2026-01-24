import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Edit, 
  CheckCircle, 
  XCircle, 
  FileText,
  CalendarDays,
  Clock,
  User,
  AlertCircle
} from 'lucide-react';
import { JournalEntry, JournalEntryStatus } from '@/types/api.types';
import { journalEntryAPI, getErrorMessage } from '@/lib/api';
import { format } from 'date-fns';

interface JournalEntryDetailProps {
  journalEntryId: string;
  onBack?: () => void;
  onEdit?: (journalEntry: JournalEntry) => void;
}

const statusLabels: Record<JournalEntryStatus, string> = {
  [JournalEntryStatus.DRAFT]: 'Draft',
  [JournalEntryStatus.POSTED]: 'Posted',
  [JournalEntryStatus.VOID]: 'Void',
};

export const JournalEntryDetail: React.FC<JournalEntryDetailProps> = ({
  journalEntryId,
  onBack,
  onEdit,
}) => {
  const [journalEntry, setJournalEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadJournalEntry();
  }, [journalEntryId]);

  const loadJournalEntry = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await journalEntryAPI.getById(journalEntryId);
      setJournalEntry(response.journalEntry);
    } catch (error) {
      setError(getErrorMessage(error));
      console.error('Failed to load journal entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: JournalEntryStatus) => {
    if (!journalEntry) return;
    
    try {
      setUpdatingStatus(true);
      await journalEntryAPI.updateStatus(journalEntry.id, newStatus);
      console.log(`Journal entry ${newStatus.toLowerCase()} successfully`);
      loadJournalEntry();
    } catch (error) {
      console.error('Failed to update status:', getErrorMessage(error));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const calculateTotals = () => {
    if (!journalEntry?.lines) return { totalDebits: 0, totalCredits: 0 };
    
    const totalDebits = journalEntry.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredits = journalEntry.lines.reduce((sum, line) => sum + line.credit, 0);
    
    return { totalDebits, totalCredits };
  };

  const getStatusText = (status: JournalEntryStatus) => (
    <span className="text-sm text-gray-700">{statusLabels[status]}</span>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !journalEntry) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Journal entry not found'}
        </AlertDescription>
      </Alert>
    );
  }

  const { totalDebits, totalCredits } = calculateTotals();
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">{journalEntry.entryNumber}</h1>
            <p className="text-gray-600">Journal Entry Details</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {getStatusText(journalEntry.status)}
          {journalEntry.status === JournalEntryStatus.DRAFT && (
            <>
              <Button onClick={() => onEdit?.(journalEntry)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                onClick={() => handleStatusUpdate(JournalEntryStatus.POSTED)}
                disabled={updatingStatus || !isBalanced}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Post
              </Button>
            </>
          )}
          {journalEntry.status === JournalEntryStatus.POSTED && (
            <Button 
              variant="destructive"
              onClick={() => handleStatusUpdate(JournalEntryStatus.VOID)}
              disabled={updatingStatus}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Void
            </Button>
          )}
        </div>
      </div>

      {/* Entry Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Entry Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CalendarDays className="h-4 w-4" />
                Entry Date
              </div>
              <p className="font-medium">
                {(() => {
                  const dateOnly = journalEntry.entryDate.split('T')[0];
                  const [year, month, day] = dateOnly.split('-').map(Number);
                  const date = new Date(year, month - 1, day);
                  return format(date, 'MMMM dd, yyyy');
                })()}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                Created By
              </div>
              <p className="font-medium">
                {journalEntry.createdByUser ? 
                  `${journalEntry.createdByUser.firstName || ''} ${journalEntry.createdByUser.lastName || ''}`.trim() || 
                  journalEntry.createdByUser.email : 
                  'Unknown'
                }
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                Created Date
              </div>
              <p className="font-medium">
                {format(new Date(journalEntry.createdAt), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          </div>

          {journalEntry.description && (
            <div className="mt-6 space-y-2">
              <div className="text-sm text-gray-600">Description</div>
              <p className="text-gray-900">{journalEntry.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Journal Entry Lines */}
      <Card>
        <CardHeader>
          <CardTitle>Journal Entry Lines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalEntry.lines?.map((line, index) => (
                  <TableRow key={line.id || index}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {line.account?.code} - {line.account?.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {line.account?.type}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {line.description || 'No description'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-end space-x-8">
              <div className="text-right">
                <div className="text-sm text-gray-600">Total Debits</div>
                <div className={`text-lg font-mono ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalDebits)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Total Credits</div>
                <div className="text-lg font-mono font-bold text-black">
                  {formatCurrency(totalCredits)}
                </div>
              </div>
            </div>
            
            {!isBalanced && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This journal entry is not balanced. Debits and credits must be equal.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
