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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Vendor } from "@/types/api.types";
import { vendorAPI, getErrorMessage } from "@/lib/api";
import {
  Search,
  Plus,
  Edit,
  Eye,
  MoreHorizontal,
  Building2,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface VendorListProps {
  onView?: (vendor: Vendor) => void;
  onEdit?: (vendor: Vendor) => void;
  onCreateNew?: () => void;
  refreshSignal?: number;
}

export const VendorList: React.FC<VendorListProps> = ({
  onView,
  onEdit,
  onCreateNew,
  refreshSignal = 0,
}) => {
  const isMobile = useIsMobile();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await vendorAPI.getAll();
      setVendors(response.data ?? []);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error("Failed to load vendors:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = useMemo(() => {
    if (!searchTerm) return vendors;
    const lower = searchTerm.toLowerCase();
    return vendors.filter((vendor) => {
      const name = vendor.name.toLowerCase();
      const email = vendor.email?.toLowerCase() ?? "";
      const phone = vendor.phone?.toLowerCase() ?? "";
      const address = vendor.address?.toLowerCase() ?? "";
      const city = vendor.city?.toLowerCase() ?? "";
      const state = vendor.state?.toLowerCase() ?? "";
      return (
        name.includes(lower) ||
        email.includes(lower) ||
        phone.includes(lower) ||
        address.includes(lower) ||
        city.includes(lower) ||
        state.includes(lower)
      );
    });
  }, [vendors, searchTerm]);

  const handleDelete = (id: string) => {
    setVendorToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!vendorToDelete) return;
    try {
      await vendorAPI.delete(vendorToDelete);
      loadVendors();
    } catch (err) {
      console.error("Failed to delete vendor:", getErrorMessage(err));
    } finally {
      setVendorToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const formatAddress = (vendor: Vendor) => {
    const parts = [
      vendor.address,
      vendor.city,
      vendor.state,
      vendor.zipCode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "—";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Vendors
            </CardTitle>
            <Button onClick={onCreateNew} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Vendor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="space-y-2 w-full md:max-w-md">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder={isDesktop ? "Search by name, email, phone, or address..." : "Search vendors..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-xs sm:text-sm placeholder:text-xs sm:placeholder:text-sm"
                />
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No vendors found</p>
              <p className="text-sm">Create your first vendor to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="whitespace-nowrap">Email</TableHead>
                    <TableHead className="whitespace-nowrap">Phone</TableHead>
                    <TableHead className="whitespace-nowrap">Address</TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {vendor.name}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {vendor.email || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {vendor.phone || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatAddress(vendor)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onView && (
                              <DropdownMenuItem onClick={() => onView(vendor)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => onEdit?.(vendor)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(vendor.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this vendor?
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
