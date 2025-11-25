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
import { Bill, CreateBillData, Vendor, Item } from '@/types/api.types';
import { billAPI, vendorAPI, itemAPI, getErrorMessage } from '@/lib/api';

interface BillFormProps {
  initialData?: Partial<CreateBillData & { id?: string }>;
  onSuccess: (bill: Bill) => void;
  onCancel: () => void;
  isEditing?: boolean;
  billId?: string;
}

interface BillLineForm {
  itemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export const BillForm: React.FC<BillFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
  isEditing = false,
  billId,
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    billNumber: initialData?.billNumber || '',
    vendorId: initialData?.vendorId || '',
    billDate: initialData?.billDate ? new Date(initialData.billDate) : new Date(),
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: initialData?.status || 'DRAFT',
    taxAmount: initialData?.taxAmount || 0,
    notes: initialData?.notes || '',
  });

  const [lines, setLines] = useState<BillLineForm[]>(() => {
    if (initialData?.lines && initialData.lines.length > 0) {
      return initialData.lines.map(line => ({
        itemId: line.itemId,
        description: line.description || '',
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        amount: line.quantity * line.unitPrice,
      }));
    }
    return [];
  });

  const [newLine, setNewLine] = useState<Partial<BillLineForm>>({
    itemId: '',
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
      const [vendorsRes, itemsRes] = await Promise.all([
        vendorAPI.getAll(),
        itemAPI.getAll(),
      ]);

      setVendors(vendorsRes.data || []);
      setItems((itemsRes as any).items || itemsRes || []);
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
      description: newLine.description || '',
      quantity: newLine.quantity!,
      unitPrice: newLine.unitPrice!,
      amount,
    }]);

    setNewLine({
      itemId: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
    });
    setItemDialogOpen(false);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof BillLineForm, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].amount = Number((updated[index].quantity * updated[index].unitPrice).toFixed(2));
    }
    
    setLines(updated);
  };

  const calculateTotals = () => {
    const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
    const tax = formData.taxAmount || 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const generateBillNumber = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `BILL-${year}${month}${day}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.vendorId) {
      setError('Please select a vendor');
      return;
    }

    if (lines.length === 0) {
      setError('Please add at least one line item');
      return;
    }

    let billNumber = formData.billNumber;
    if (!billNumber && !isEditing) {
      billNumber = generateBillNumber();
    }

    try {
      setLoading(true);
      const billData: CreateBillData = {
        billNumber: billNumber,
        vendorId: formData.vendorId,
        billDate: formData.billDate.toISOString(),
        dueDate: formData.dueDate.toISOString(),
        status: formData.status as any,
        taxAmount: formData.taxAmount,
        notes: formData.notes || undefined,
        lines: lines.map(line => ({
          itemId: line.itemId,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
      };

      let bill: Bill;
      if (isEditing && billId) {
        const response = await billAPI.update(billId, billData);
        bill = response.bill;
      } else {
        const response = await billAPI.create(billData);
        bill = response.bill;
      }

      onSuccess(bill);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, total } = calculateTotals();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{isEditing ? 'Edit Bill' : 'Create New Bill'}</CardTitle>
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
              <Label htmlFor="billNumber">Bill Number *</Label>
              <Input
                id="billNumber"
                value={formData.billNumber}
                onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                disabled={isEditing}
                placeholder="Auto-generated"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendorId">Vendor *</Label>
              <Select
                value={formData.vendorId}
                onValueChange={(value) => setFormData({ ...formData, vendorId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
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
                  <SelectItem value="OPEN">Open</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billDate">Bill Date *</Label>
              <DatePicker
                date={formData.billDate}
                setDate={(date) => setFormData({ ...formData, billDate: date || new Date() })}
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
                <AlertDescription>No line items added. Click "Add Item" to add items to this bill.</AlertDescription>
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
                      const itemName = item?.name || 'Unknown';
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
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <Label htmlFor="taxAmount">Tax Amount:</Label>
                <Input
                  id="taxAmount"
                  type="number"
                  step="0.01"
                  value={formData.taxAmount}
                  onChange={(e) => setFormData({ ...formData, taxAmount: parseFloat(e.target.value) || 0 })}
                  className="w-24 h-8"
                />
              </div>
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
              {loading ? 'Saving...' : isEditing ? 'Update Bill' : 'Create Bill'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Line Item</DialogTitle>
            <DialogDescription>Select an item to add to this bill</DialogDescription>
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

