import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { ArrowLeft } from 'lucide-react';

// Form schema for account creation/editing
const accountFormSchema = z.object({
  code: z.string().min(1, 'Account code is required'),
  name: z.string().min(1, 'Account name is required'),
  type: z.nativeEnum(AccountType, {
    message: 'Please select an account type',
  }),
  subType: z.string().min(1, 'Sub type is required'),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface ChartOfAccountsFormProps {
  initialData?: Partial<AccountFormValues>;
  onSuccess: (account: Account) => void;
  onCancel: () => void;
  isEditing?: boolean;
  accountId?: string;
}

export const ChartOfAccountsForm = ({ 
  initialData, 
  onSuccess, 
  onCancel, 
  isEditing = false,
  accountId 
}: ChartOfAccountsFormProps) => {
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

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      code: initialData?.code || '',
      name: initialData?.name || '',
      type: initialData?.type || AccountType.Current_Assets,
      subType: initialData?.subType || '',
    },
  });

  const formatAccountType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleSubmit = async (values: AccountFormValues) => {
    try {
      let response;
      if (isEditing && accountId) {
        response = await accountAPI.update(accountId, values);
      } else {
        response = await accountAPI.create(values);
      }
      
      toast({
        variant: "success",
        title: "Success",
        description: response.message,
      });
      
      onSuccess(response.data);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: getErrorMessage(err),
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onCancel}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Edit Account' : 'Create New Account'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update account information' : 'Add a new account to your chart of accounts'}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                >
                  {isEditing ? 'Update Account' : 'Create Account'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
