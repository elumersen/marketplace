import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { accountAPI, getErrorMessage } from '@/lib/api';
import { Account } from '@/types/api.types';
import { ArrowLeft, Edit, ToggleLeft, ToggleRight, Trash2, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

interface ChartOfAccountsDetailProps {
  accountId: string;
  onBack: () => void;
  onEdit: (account: Account) => void;
}

export const ChartOfAccountsDetail = ({ accountId, onBack, onEdit }: ChartOfAccountsDetailProps) => {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAccount();
  }, [accountId]);

  const fetchAccount = async () => {
    try {
      setLoading(true);
      const response = await accountAPI.getById(accountId);
      setAccount(response.data);
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

  const handleToggleAccountStatus = async () => {
    if (!account) return;
    
    try {
      const response = await accountAPI.toggleStatus(account.id);
      toast({
        variant: "success",
        title: "Success",
        description: response.message,
      });
      fetchAccount(); // Refresh account data
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: getErrorMessage(err),
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!account) return;
    
    try {
      const response = await accountAPI.delete(account.id);
      toast({
        variant: "success",
        title: "Success",
        description: response.message,
      });
      onBack(); // Go back to list after successful deletion
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: getErrorMessage(err),
      });
    }
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Account Details</h1>
            <p className="text-muted-foreground">Loading account information...</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-4">
              <Spinner size="lg" />
              <span className="text-sm text-muted-foreground">Loading account details...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Account Not Found</h1>
            <p className="text-muted-foreground">The requested account could not be found.</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-muted-foreground">
              Account not found or you don't have permission to view it.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{account.name}</h1>
            <p className="text-muted-foreground">Account Details</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="default" 
            onClick={() => navigate(`/registers/${accountId}`)}
            className="flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            View Register
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => onEdit(account)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline"
                className={account.isActive 
                  ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50" 
                  : "text-green-600 hover:text-green-700 hover:bg-green-50"
                }
              >
                {account.isActive ? (
                  <>
                    <ToggleRight className="h-4 w-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-4 w-4 mr-2" />
                    Activate
                  </>
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
                  onClick={handleToggleAccountStatus}
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
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
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
                  onClick={handleDeleteAccount}
                  className="flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-600"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Account Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Code</label>
              <p className="text-lg font-mono">{account.code}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Name</label>
              <p className="text-lg font-semibold">{account.name}</p>
            </div>
            
            {account.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-sm">{account.description}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">
                <Badge variant={account.isActive ? "default" : "secondary"}>
                  {account.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Classification */}
        <Card>
          <CardHeader>
            <CardTitle>Account Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Type</label>
              <div className="mt-1">
                <Badge variant="secondary">
                  {formatAccountType(account.type)}
                </Badge>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Sub Type</label>
              <p className="text-sm">{formatAccountType(account.subType)}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Current Balance</label>
              <p className="text-2xl font-bold font-mono">
                {formatCurrency(account.balance)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
