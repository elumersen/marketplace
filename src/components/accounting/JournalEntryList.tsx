import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
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
  Search, 
  Plus, 
  Eye, 
  Edit, 
  MoreHorizontal,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { JournalEntry, JournalEntryStatus, JournalEntryQueryParams } from '@/types/api.types';
import { journalEntryAPI, getErrorMessage } from '@/lib/api';
import { format } from 'date-fns';

interface JournalEntryListProps {
  onView?: (journalEntry: JournalEntry) => void;
  onEdit?: (journalEntry: JournalEntry) => void;
  onCreateNew?: () => void;
}

const statusConfig = {
  [JournalEntryStatus.DRAFT]: {
    label: 'Draft',
    variant: 'secondary' as const,
    icon: FileText,
  },
  [JournalEntryStatus.POSTED]: {
    label: 'Posted',
    variant: 'default' as const,
    icon: CheckCircle,
  },
  [JournalEntryStatus.VOID]: {
    label: 'Void',
    variant: 'destructive' as const,
    icon: XCircle,
  },
};

export const JournalEntryList: React.FC<JournalEntryListProps> = ({
  onView,
  onEdit,
  onCreateNew,
}) => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<JournalEntryQueryParams>({
    startDate: '',
    endDate: '',
    status: undefined,
  });
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [journalEntryToDelete, setJournalEntryToDelete] = useState<string | null>(null);

  useEffect(() => {
    // Update filters when dates change
    setFilters(prev => ({
      ...prev,
      startDate: startDate ? startDate.toISOString().split('T')[0] : '',
      endDate: endDate ? endDate.toISOString().split('T')[0] : '',
    }));
  }, [startDate, endDate]);

  useEffect(() => {
    loadJournalEntries();
  }, [filters]);

  const loadJournalEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await journalEntryAPI.getAll(filters);
      setJournalEntries(response.journalEntries || []);
    } catch (error) {
      setError(getErrorMessage(error));
      console.error('Failed to load journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: JournalEntryStatus) => {
    try {
      await journalEntryAPI.updateStatus(id, newStatus);
      console.log(`Journal entry ${newStatus.toLowerCase()} successfully`);
      loadJournalEntries();
    } catch (error) {
      console.error('Failed to update status:', getErrorMessage(error));
    }
  };

  const handleDelete = async (id: string) => {
    setJournalEntryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!journalEntryToDelete) return;
    
    try {
      await journalEntryAPI.delete(journalEntryToDelete);
      console.log('Journal entry deleted successfully');
      loadJournalEntries();
    } catch (error) {
      console.error('Failed to delete journal entry:', getErrorMessage(error));
    } finally {
      setDeleteDialogOpen(false);
      setJournalEntryToDelete(null);
    }
  };

  const filteredEntries = journalEntries.filter(entry =>
    entry.entryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entry.description && entry.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status: JournalEntryStatus) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const calculateTotalAmount = (entry: JournalEntry) => {
    if (!entry.lines) return 0;
    // Return the total debit amount (or credit amount, they should be equal)
    return entry.lines.reduce((sum, line) => sum + line.debit, 0);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Journal Entries
            </CardTitle>
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by entry number or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <DatePicker
                date={startDate}
                setDate={setStartDate}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <DatePicker
                date={endDate}
                setDate={setEndDate}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? undefined : value as JournalEntryStatus })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value={JournalEntryStatus.DRAFT}>Draft</SelectItem>
                  <SelectItem value={JournalEntryStatus.POSTED}>Posted</SelectItem>
                  <SelectItem value={JournalEntryStatus.VOID}>Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No journal entries found</p>
              <p className="text-sm">Create your first journal entry to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entry Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.entryNumber}</TableCell>
                      <TableCell>{format(new Date(entry.entryDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {entry.description || 'No description'}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(calculateTotalAmount(entry))}
                      </TableCell>
                      <TableCell>
                        {entry.createdByUser ? 
                          `${entry.createdByUser.firstName || ''} ${entry.createdByUser.lastName || ''}`.trim() || 
                          entry.createdByUser.email : 
                          'Unknown'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onView?.(entry)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            {entry.status === JournalEntryStatus.DRAFT && (
                              <>
                                <DropdownMenuItem onClick={() => onEdit?.(entry)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleStatusUpdate(entry.id, JournalEntryStatus.POSTED)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Post
                                </DropdownMenuItem>
                              </>
                            )}
                            {entry.status === JournalEntryStatus.POSTED && (
                              <DropdownMenuItem 
                                onClick={() => handleStatusUpdate(entry.id, JournalEntryStatus.VOID)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Void
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDelete(entry.id)}
                              className="text-red-600"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Journal Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this journal entry?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
