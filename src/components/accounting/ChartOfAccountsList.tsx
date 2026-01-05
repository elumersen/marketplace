import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { accountAPI, getErrorMessage } from '@/lib/api';
import { Account, AccountType } from '@/types/api.types';
import { sortAccountTypes, sortSubTypes, getAccountTypeOrder, getSubTypeOrder } from '@/lib/accountOrdering';
import { Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChartOfAccountsListProps {
  onEdit: (account: Account) => void;
  onCreateNew: () => void;
  refreshSignal?: number;
}

export const ChartOfAccountsList = ({ onEdit, onCreateNew, refreshSignal = 0 }: ChartOfAccountsListProps) => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]); // For sub type filter options
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [subTypeFilter, setSubTypeFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('active');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25; // Fixed at 25 items per page
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Toast notifications
  const { toast } = useToast();

  // Fetch all accounts for sub type filter options
  const fetchAllAccountsForFilter = async () => {
    try {
      const params: { isActive?: boolean; type?: string } = {};
      if (activeFilter === 'active') params.isActive = true;
      if (activeFilter === 'inactive') params.isActive = false;
      if (typeFilter && typeFilter !== 'all') params.type = typeFilter;
      
      const response = await accountAPI.getAll({ ...params, all: 'true' });
      // Filter out Net_Income accounts (calculation-based, not real accounts)
      const filteredAccounts = response.data.filter(acc => acc.subType !== 'Net_Income');
      setAllAccounts(filteredAccounts);
    } catch (err) {
      // Silently fail - filter will just use current page results
      console.error('Failed to load all accounts for filter:', err);
    }
  };

  const fetchAccounts = async (page: number = currentPage, limit: number = itemsPerPage) => {
    try {
      setLoading(true);
      
      const params: { isActive?: boolean; type?: string; subType?: string; search?: string; page?: number; limit?: number } = {
        page,
        limit,
      };
      if (activeFilter === 'active') params.isActive = true;
      if (activeFilter === 'inactive') params.isActive = false;
      // If activeFilter is 'all', we don't set isActive parameter to show all accounts
      if (typeFilter && typeFilter !== 'all') params.type = typeFilter;
      if (subTypeFilter && subTypeFilter !== 'all') params.subType = subTypeFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await accountAPI.getAll(params);
      // Filter out Net_Income accounts (calculation-based, not real accounts)
      const filteredAccounts = response.data.filter(acc => acc.subType !== 'Net_Income');
      setAccounts(filteredAccounts);
      setTotalItems(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
      setCurrentPage(response.pagination.page);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: getErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAccounts(1, itemsPerPage); // Reset to page 1 when filters change
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [typeFilter, subTypeFilter, activeFilter, searchTerm]);

  // Immediate effect for non-search filters
  useEffect(() => {
    if (!searchTerm) {
      fetchAccounts(1, itemsPerPage);
      fetchAllAccountsForFilter();
    }
  }, [typeFilter, activeFilter, refreshSignal]);

  // Fetch all accounts when type filter changes to update sub type options
  useEffect(() => {
    fetchAllAccountsForFilter();
  }, [typeFilter, activeFilter]);

  // Handle pagination changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchAccounts(page, itemsPerPage);
  };

  const handleToggleAccountStatus = async (id: string) => {
    try {
      const response = await accountAPI.toggleStatus(id);
      toast({
        variant: "success",
        title: "Success",
        description: response.message,
      });
      fetchAccounts(currentPage, itemsPerPage);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: getErrorMessage(err),
      });
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      const response = await accountAPI.delete(id);
      toast({
        variant: "success",
        title: "Success",
        description: response.message,
      });
      fetchAccounts(currentPage, itemsPerPage);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: getErrorMessage(err),
      });
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount < 0) {
      return `(${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(Math.abs(amount))})`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatAccountType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get sub types filtered by selected type from all accounts
  const getFilteredSubTypes = () => {
    const subTypes = new Set<string>();
    const accountsToUse = allAccounts.length > 0 ? allAccounts : accounts;
    
    accountsToUse.forEach(account => {
      if (account.subType) {
        if (typeFilter === 'all' || account.type === typeFilter) {
          subTypes.add(account.subType);
        }
      }
    });
    return sortSubTypes(Array.from(subTypes));
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <Card className="flex flex-col h-full min-h-0">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>
              Chart of Accounts
            </CardTitle>
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              New Account
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 flex-shrink-0">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Select value={typeFilter} onValueChange={(value) => {
                setTypeFilter(value);
                setSubTypeFilter('all'); // Reset sub type filter when type changes
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {sortAccountTypes(Object.values(AccountType)).map(type => (
                    <SelectItem key={type} value={type}>
                      {formatAccountType(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Select value={subTypeFilter} onValueChange={setSubTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Sub Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub Types</SelectItem>
                  {getFilteredSubTypes().map(subType => (
                    <SelectItem key={subType} value={subType}>
                      {formatAccountType(subType)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Select value={activeFilter} onValueChange={setActiveFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Active" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mb-4 flex-shrink-0">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                showResultsInfo={false}
              />
            </div>
          )}

          {/* Scrollable Table Container */}
          <div className="flex-1 overflow-y-auto min-h-0 thin-scrollbar">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Sub Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Spinner size="lg" />
                        <span className="text-sm text-muted-foreground">Loading accounts...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No accounts found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  [...accounts].sort((a, b) => {
                    // First sort by account type
                    const typeOrder = getAccountTypeOrder(a.type) - getAccountTypeOrder(b.type);
                    if (typeOrder !== 0) return typeOrder;
                    
                    // Then sort by sub type
                    const subTypeOrder = getSubTypeOrder(a.subType) - getSubTypeOrder(b.subType);
                    if (subTypeOrder !== 0) return subTypeOrder;
                    
                    // Finally sort by code (numeric)
                    const aNum = parseInt(a.code.replace(/\D/g, '')) || 0;
                    const bNum = parseInt(b.code.replace(/\D/g, '')) || 0;
                    if (aNum !== bNum) return aNum - bNum;
                    return a.code.localeCompare(b.code);
                  }).map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono text-sm">{account.code}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{account.name}</div>
                          {account.description && (
                            <div className="text-sm text-muted-foreground">{account.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {formatAccountType(account.type)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {formatAccountType(account.subType)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(account.balance)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {account.subType !== 'Net_Income' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="View Register"
                              onClick={() => navigate(`/registers/${account.id}`)}
                              className="hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Edit Account"
                            onClick={() => onEdit(account)}
                            className="hover:bg-green-50 hover:text-green-600"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                title={account.isActive ? "Deactivate Account" : "Activate Account"}
                                className={account.isActive 
                                  ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50" 
                                  : "text-green-600 hover:text-green-700 hover:bg-green-50"
                                }
                              >
                                {account.isActive ? (
                                  <ToggleRight className="h-4 w-4" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-lg font-semibold">
                                  {account.isActive ? "Deactivate Account" : "Activate Account"}
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-base">
                                  Are you sure you want to {account.isActive ? "deactivate" : "activate"} the account <strong>"{account.name}"</strong>?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-2">
                                <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleToggleAccountStatus(account.id)}
                                  className={`flex-1 ${account.isActive 
                                    ? "bg-orange-600 hover:bg-orange-700 focus:ring-orange-600" 
                                    : "bg-green-600 hover:bg-green-700 focus:ring-green-600"
                                  }`}
                                >
                                  {account.isActive ? "Deactivate" : "Activate"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Permanently Delete Account"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-lg font-semibold">Delete Account</AlertDialogTitle>
                                <AlertDialogDescription className="text-base">
                                  Are you sure you want to delete the account <strong>"{account.name}"</strong>?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-2">
                                <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteAccount(account.id)}
                                  className="flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
