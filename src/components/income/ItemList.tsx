import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Item } from "@/types/api.types";
import { itemAPI, getErrorMessage } from "@/lib/api";
import { Search, Plus, Package, Trash2, ChevronDown, ChevronRight, MoreHorizontal, Edit } from "lucide-react";
import { ItemForm } from "./ItemForm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface ItemListProps {
  onCreateNew?: () => void;
  refreshSignal?: number;
}

export const ItemList: React.FC<ItemListProps> = ({
  onCreateNew,
  refreshSignal = 0,
}) => {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedMode, setExpandedMode] = useState<'view' | 'edit'>( 'view');
  const [showInlineForm, setShowInlineForm] = useState(false);

  useEffect(() => {
    loadItems();
  }, [refreshSignal]);

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await itemAPI.getAll({});
      setItems(response.items ?? []);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error("Failed to load items:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter((item) => {
      const name = item.name.toLowerCase();
      const description = item.description?.toLowerCase() ?? "";
      const sku = item.sku?.toLowerCase() ?? "";
      return name.includes(lower) || description.includes(lower) || sku.includes(lower);
    });
  }, [items, searchTerm]);

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount == null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleDelete = (item: Item) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await itemAPI.delete(itemToDelete.id);
      if (expandedId === itemToDelete.id) closeExpanded();
      loadItems();
      toast({
        variant: "success",
        title: "Success",
        description: "Item deleted successfully",
      });
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Failed to delete item:", message);
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    } finally {
      setItemToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      setExpandedMode('view');
    }
  };

  const openEdit = (id: string) => {
    setExpandedId(id);
    setExpandedMode('edit');
  };

  const closeExpanded = () => {
    setExpandedId(null);
  };

  const handleFormSuccess = (updatedItem: Item) => {
    setItems((prev) =>
      prev.map((i) => (i.id === updatedItem.id ? updatedItem : i))
    );
    closeExpanded();
    toast({
      variant: "success",
      title: "Success",
      description: "Item updated successfully",
    });
  };

  const handleNewItemClick = () => {
    if (onCreateNew) {
      onCreateNew();
    } else {
      setShowInlineForm(true);
    }
  };

  const handleInlineCreateSuccess = (item: Item) => {
    setItems((prev) => [...prev, item]);
    setShowInlineForm(false);
    toast({
      variant: "success",
      title: "Success",
      description: "Item created successfully",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold">
              <Package className="h-5 w-5" />
              Catalog
            </CardTitle>
            <Button onClick={handleNewItemClick} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-xs sm:text-sm placeholder:text-xs sm:placeholder:text-sm"
                />
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : filteredItems.length === 0 && !showInlineForm ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items found</p>
              <p className="text-sm">
                Create your first catalog item to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="whitespace-nowrap">Label/SKU</TableHead>
                    <TableHead className="whitespace-nowrap">Item</TableHead>
                    <TableHead className="whitespace-nowrap">Description</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Sales Price</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Purchase Price</TableHead>
                    <TableHead className="whitespace-nowrap">Sales Account</TableHead>
                    <TableHead className="whitespace-nowrap">Purchase Account</TableHead>
                    <TableHead className="text-right whitespace-nowrap w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showInlineForm && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={9} className="p-4">
                        <div className="bg-white border rounded-lg p-4">
                          <ItemForm
                            onSuccess={handleInlineCreateSuccess}
                            onCancel={() => setShowInlineForm(false)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredItems.map((item) => (
                    <React.Fragment key={item.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleExpand(item.id)}
                      >
                        <TableCell className="w-8 py-2">
                          {expandedId === item.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono whitespace-nowrap">
                          {item.sku || "—"}
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {item.name}
                        </TableCell>
                        <TableCell className="whitespace-nowrap max-w-[200px] truncate">
                          {item.description || "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap">
                          {formatCurrency(item.salesPrice)}
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap">
                          {formatCurrency(item.purchasePrice)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {item.incomeAccount
                            ? `${item.incomeAccount.code} - ${item.incomeAccount.name}`
                            : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {item.expenseAccount
                            ? `${item.expenseAccount.code} - ${item.expenseAccount.name}`
                            : "—"}
                        </TableCell>
                        <TableCell
                          className="text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEdit(item.id)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(item)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      {expandedId === item.id && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-muted/30 p-4">
                            {expandedMode === 'view' ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Label/SKU</span>
                                  <p className="font-medium mt-0.5">{item.sku || "—"}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Item</span>
                                  <p className="font-medium mt-0.5">{item.name}</p>
                                </div>
                                <div className="sm:col-span-2">
                                  <span className="text-muted-foreground">Description</span>
                                  <p className="font-medium mt-0.5">{item.description || "—"}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Sales Price</span>
                                  <p className="font-medium mt-0.5 font-mono">{formatCurrency(item.salesPrice)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Sales Account</span>
                                  <p className="font-medium mt-0.5">
                                    {item.incomeAccount
                                      ? `${item.incomeAccount.code} - ${item.incomeAccount.name}`
                                      : "—"}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Purchase Price</span>
                                  <p className="font-medium mt-0.5 font-mono">{formatCurrency(item.purchasePrice)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Purchase Account</span>
                                  <p className="font-medium mt-0.5">
                                    {item.expenseAccount
                                      ? `${item.expenseAccount.code} - ${item.expenseAccount.name}`
                                      : "—"}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 min-w-0">
                                <ItemForm
                                  initialData={{
                                    name: item.name,
                                    sku: item.sku ?? undefined,
                                    description: item.description ?? undefined,
                                    salesPrice: item.salesPrice ?? undefined,
                                    purchasePrice: item.purchasePrice ?? undefined,
                                    incomeAccountId: item.incomeAccountId ?? undefined,
                                    expenseAccountId: item.expenseAccountId ?? undefined,
                                  }}
                                  onSuccess={handleFormSuccess}
                                  onCancel={closeExpanded}
                                  isEditing
                                  itemId={item.id}
                                  compact
                                />
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{itemToDelete?.name}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
