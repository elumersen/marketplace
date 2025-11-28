import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Invoice, CreateInvoiceData, Customer, Item, Account } from '@/types/api.types';
import { invoiceAPI, customerAPI, itemAPI, accountAPI, getErrorMessage } from '@/lib/api';

interface InvoiceFormProps {
  initialData?: Partial<CreateInvoiceData & { id?: string }>;
  onSuccess: (invoice: Invoice) => void;
  onCancel: () => void;
  isEditing?: boolean;
  invoiceId?: string;
}

interface InvoiceLineForm {
  itemId: string;
  accountId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
  isEditing = false,
  invoiceId,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [incomeAccounts, setIncomeAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    invoiceNumber: initialData?.invoiceNumber || '',
    customerId: initialData?.customerId || '',
    invoiceDate: initialData?.invoiceDate ? new Date(initialData.invoiceDate) : new Date(),
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: initialData?.status || 'SENT',
    notes: initialData?.notes || '',
  });

  const [lines, setLines] = useState<InvoiceLineForm[]>(() => {
    if (initialData?.lines && initialData.lines.length > 0) {
      return initialData.lines.map(line => ({
        itemId: line.itemId,
        accountId: line.accountId,
        description: line.description || '',
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        amount: line.quantity * line.unitPrice,
      }));
    }
    return [];
  });

  const [newLine, setNewLine] = useState<Partial<InvoiceLineForm>>({
    itemId: '',
    accountId: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customersRes, itemsRes, accountsRes] = await Promise.all([
        customerAPI.getAll(),
        itemAPI.getAll(),
        accountAPI.getAll({ type: 'Income', all: 'true' }),
      ]);

      setCustomers(customersRes.data || []);
      setItems((itemsRes as any).items || itemsRes || []);
      setIncomeAccounts(accountsRes.data || []);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelect = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      setNewLine({
        ...newLine,
        itemId: item.id,
        unitPrice: item.amount,
        description: item.description || item.name,
        accountId: (item as any).incomeAccountId || '',
      });
    }
  };

  const addLine = () => {
    if (!newLine.itemId || !newLine.quantity || !newLine.unitPrice) {
      setError('Please fill in all required fields for the line item');
      return;
    }

    const amount = Number((newLine.quantity! * newLine.unitPrice!).toFixed(2));
    setLines([...lines, {
      itemId: newLine.itemId!,
      accountId: newLine.accountId,
      description: newLine.description || '',
      quantity: newLine.quantity!,
      unitPrice: newLine.unitPrice!,
      amount,
    }]);

    setNewLine({
      itemId: '',
      accountId: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
    });
    setItemDialogOpen(false);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof InvoiceLineForm, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].amount = Number((updated[index].quantity * updated[index].unitPrice).toFixed(2));
    }
    
    setLines(updated);
  };

  const calculateTotals = () => {
    const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
    const total = subtotal;
    return { subtotal, total };
  };

  const generateInvoiceNumber = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `INV-${year}${month}${day}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.customerId) {
      setError('Please select a customer');
      return;
    }

    if (lines.length === 0) {
      setError('Please add at least one line item');
      return;
    }

    if (!formData.invoiceNumber && !isEditing) {
      formData.invoiceNumber = generateInvoiceNumber();
    }

    try {
      setLoading(true);
      const invoiceData: CreateInvoiceData = {
        invoiceNumber: formData.invoiceNumber,
        customerId: formData.customerId,
        invoiceDate: formData.invoiceDate.toISOString(),
        dueDate: formData.dueDate.toISOString(),
        status: formData.status as any,
        notes: formData.notes || undefined,
        lines: lines.map(line => ({
          itemId: line.itemId,
          accountId: line.accountId,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
      };

      let invoice: Invoice;
      if (isEditing && invoiceId) {
        const response = await invoiceAPI.update(invoiceId, invoiceData);
        invoice = response.invoice;
      } else {
        const response = await invoiceAPI.create(invoiceData);
        invoice = response.invoice;
      }

      onSuccess(invoice);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const { total } = calculateTotals();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{isEditing ? 'Edit Invoice' : 'Create New Invoice'}</CardTitle>
            </div>
            <Button type="button" variant="ghost" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number *</Label>
              <Input
                id="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                disabled={isEditing}
                placeholder="Auto-generated"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerId">Customer *</Label>
              <Select
                value={formData.customerId}
                onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date *</Label>
              <DatePicker
                date={formData.invoiceDate}
                setDate={(date) => setFormData({ ...formData, invoiceDate: date || new Date() })}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <DatePicker
                date={formData.dueDate}
                setDate={(date) => setFormData({ ...formData, dueDate: date || new Date() })}
                className="w-full"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItemDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {lines.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No line items added. Click "Add Item" to add items to this invoice.</AlertDescription>
              </Alert>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-24">Qty</TableHead>
                      <TableHead className="w-32">Price</TableHead>
                      <TableHead className="w-32">Amount</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, index) => {
                      const item = line.itemId ? items.find(i => i.id === line.itemId) : null;
                      const itemName = item?.name || (line as any).itemName || 'Unknown';
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {itemName}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={line.description}
                              onChange={(e) => updateLine(index, 'description', e.target.value)}
                              className="max-w-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.quantity}
                              onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(e) => updateLine(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell className="font-mono">
                            ${line.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLine(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="font-mono">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Additional notes or comments..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : isEditing ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Line Item</DialogTitle>
            <DialogDescription>Select an item to add to this invoice</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newItemId">Item *</Label>
              <Select
                value={newLine.itemId || ''}
                onValueChange={handleItemSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - ${item.amount.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newLine.itemId && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newQuantity">Quantity *</Label>
                  <Input
                    id="newQuantity"
                    type="number"
                    step="0.01"
                    value={newLine.quantity || 1}
                    onChange={(e) => setNewLine({ ...newLine, quantity: parseFloat(e.target.value) || 1 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newUnitPrice">Unit Price *</Label>
                  <Input
                    id="newUnitPrice"
                    type="number"
                    step="0.01"
                    value={newLine.unitPrice || 0}
                    onChange={(e) => setNewLine({ ...newLine, unitPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newDescription">Description</Label>
                  <Input
                    id="newDescription"
                    value={newLine.description || ''}
                    onChange={(e) => setNewLine({ ...newLine, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newAccountId">Income Account</Label>
                  <Select
                    value={newLine.accountId || ''}
                    onValueChange={(value) => setNewLine({ ...newLine, accountId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {incomeAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={addLine} disabled={!newLine.itemId || !newLine.quantity || !newLine.unitPrice}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
};

