import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { accountAPI, getErrorMessage } from '@/lib/api';
import { Account, AccountType } from '@/types/api.types';
import { Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

// Form schema for account creation
const accountFormSchema = z.object({
  code: z.string().min(1, 'Account code is required'),
  name: z.string().min(1, 'Account name is required'),
  type: z.nativeEnum(AccountType, {
    message: 'Please select an account type',
  }),
  subType: z.string().min(1, 'Sub type is required'),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export const ChartOfAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('active');
  const [showNewAccountModal, setShowNewAccountModal] = useState(false);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  
  // Form setup for new account
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      code: '',
      name: '',
      type: AccountType.Current_Assets,
      subType: '',
    },
  });

  // Form setup for editing account
  const editForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      code: '',
      name: '',
      type: AccountType.Current_Assets,
      subType: '',
    },
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Toast notifications
  const { toast } = useToast();

  // Account subtypes mapping
  const accountSubTypes = {
    [AccountType.Income]: ['Income'],
    [AccountType.Other_Income]: ['Other_Income'],
    [AccountType.Expense]: ['Expense'],
    [AccountType.Other_Expense]: ['Other_Expense'],
    [AccountType.Cost_of_Goods_Sold]: ['Cost_of_Goods_Sold'],
    [AccountType.Current_Assets]: ['Cash_Cash_Equivalents', 'Accounts_Receivable', 'Other_Current_Assets'],
    [AccountType.Fixed_Assets]: ['Property_Plant_Equipment', 'Accumulated_Depreciation', 'Intangible_Assets', 'Accumulated_Amortization', 'Other_Fixed_Assets'],
    [AccountType.Current_Liabilities]: ['Accounts_Payable', 'Other_Current_Liabilities'],
    [AccountType.Equity]: ['Equity', 'Retained_Earnings', 'Net_Income'],
  };

  const fetchAccounts = async (page: number = currentPage, limit: number = itemsPerPage) => {
    try {
      setLoading(true);
      
      const params: { isActive?: boolean; type?: string; search?: string; page?: number; limit?: number } = {
        page,
        limit,
      };
      if (activeFilter === 'active') params.isActive = true;
      if (activeFilter === 'inactive') params.isActive = false;
      // If activeFilter is 'all', we don't set isActive parameter to show all accounts
      if (typeFilter && typeFilter !== 'all') params.type = typeFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await accountAPI.getAll(params);
      setAccounts(response.data);
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
  }, [typeFilter, activeFilter, searchTerm]);

  // Immediate effect for non-search filters
  useEffect(() => {
    if (!searchTerm) {
      fetchAccounts(1, itemsPerPage);
    }
  }, [typeFilter, activeFilter]);

  // Handle pagination changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchAccounts(page, itemsPerPage);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
    fetchAccounts(1, newItemsPerPage);
  };

  const handleCreateAccount = async (values: AccountFormValues) => {
    try {
      const response = await accountAPI.create(values);
      toast({
        variant: "success",
        title: "Success",
        description: response.message,
      });
      setShowNewAccountModal(false);
      form.reset();
      fetchAccounts(currentPage, itemsPerPage);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: getErrorMessage(err),
      });
    }
  };

  const handleEditAccount = async (values: AccountFormValues) => {
    if (!editingAccount) return;
    
    try {
      const response = await accountAPI.update(editingAccount.id, values);
      toast({
        variant: "success",
        title: "Success",
        description: response.message,
      });
      setShowEditAccountModal(false);
      setEditingAccount(null);
      editForm.reset();
      fetchAccounts(currentPage, itemsPerPage);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: getErrorMessage(err),
      });
    }
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

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    editForm.reset({
      code: account.code,
      name: account.name,
      type: account.type,
      subType: account.subType,
    });
    setShowEditAccountModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatAccountType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Chart of Accounts</h1>
          <p className="text-muted-foreground">Manage your accounting accounts</p>
        </div>
        <Button onClick={() => setShowNewAccountModal(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Account
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
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
            <div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.values(AccountType).map(type => (
                    <SelectItem key={type} value={type}>
                      {formatAccountType(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
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
            {/* <div className="flex items-end">
              <Button variant="outline" onClick={fetchAccounts} className="w-full">
                Refresh
              </Button>
            </div> */}
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card className="relative">
        <CardContent className="p-4">
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
                accounts.map((account) => (
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
                      <Badge variant="secondary">
                        {formatAccountType(account.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatAccountType(account.subType)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(account.balance)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Edit Account"
                          onClick={() => openEditModal(account)}
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
                              <AlertDialogTitle className="text-lg font-semibold">Permanently Delete Account</AlertDialogTitle>
                              <AlertDialogDescription className="text-base">
                                Are you sure you want to permanently delete the account <strong>"{account.name}"</strong>?
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
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Account Dialog */}
      <Dialog open={showNewAccountModal} onOpenChange={(open) => {
        if (!open) {
          form.reset();
        }
        setShowNewAccountModal(open);
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-semibold">Create New Account</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateAccount)} className="space-y-6">
              <div className="space-y-6">
                {/* Account Code */}
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        Account Code <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 1000"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Account Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        Account Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Cash"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Account Type */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        Account Type <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value as AccountType);
                          form.setValue('subType', ''); // Reset subtype when type changes
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select Account Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(AccountType).map(type => (
                            <SelectItem key={type} value={type}>
                              {formatAccountType(type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sub Type */}
                <FormField
                  control={form.control}
                  name="subType"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        Sub Type <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select Sub Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accountSubTypes[form.watch('type')]?.map(subType => (
                            <SelectItem key={subType} value={subType}>
                              {formatAccountType(subType)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNewAccountModal(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                >
                  Create Account
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={showEditAccountModal} onOpenChange={(open) => {
        if (!open) {
          editForm.reset();
          setEditingAccount(null);
        }
        setShowEditAccountModal(open);
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-semibold">Edit Account</DialogTitle>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditAccount)} className="space-y-6">
              <div className="space-y-6">
                {/* Account Code */}
                <FormField
                  control={editForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        Account Code <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 1000"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Account Name */}
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        Account Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Cash"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Account Type */}
                <FormField
                  control={editForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        Account Type <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value as AccountType);
                          editForm.setValue('subType', ''); // Reset subtype when type changes
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select Account Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(AccountType).map(type => (
                            <SelectItem key={type} value={type}>
                              {formatAccountType(type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sub Type */}
                <FormField
                  control={editForm.control}
                  name="subType"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        Sub Type <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select Sub Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accountSubTypes[editForm.watch('type')]?.map(subType => (
                            <SelectItem key={subType} value={subType}>
                              {formatAccountType(subType)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowEditAccountModal(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                >
                  Update Account
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

