import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { formatCurrency as formatCurrencyBase } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
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
import { Checkbox } from "@/components/ui/checkbox";
import { BookLockAuthDialog } from "@/components/common/BookLockAuthDialog";
import {
  Search,
  Plus,
  MoreHorizontal,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check,
  Edit,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  JournalEntry,
  JournalEntryStatus,
  JournalEntryQueryParams,
  Account,
  CreateJournalEntryData,
  UpdateJournalEntryData,
  CompanySettings,
} from "@/types/api.types";
import {
  journalEntryAPI,
  accountAPI,
  companySettingsAPI,
  getErrorMessage,
} from "@/lib/api";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface JournalEntryListProps {
  onCreateNew?: () => void;
  refreshSignal?: number;
}

interface JournalEntryLineForm {
  accountId: string;
  description: string;
  debit: number;
  credit: number;
}

const statusLabels: Record<JournalEntryStatus, string> = {
  [JournalEntryStatus.DRAFT]: "Draft",
  [JournalEntryStatus.POSTED]: "Posted",
  [JournalEntryStatus.VOID]: "Void",
};

export const JournalEntryList: React.FC<JournalEntryListProps> = ({
  onCreateNew,
  refreshSignal = 0,
}) => {
  const { toast } = useToast();
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<JournalEntryQueryParams>({
    startDate: "",
    endDate: "",
    status: undefined,
  });
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [journalEntryToDelete, setJournalEntryToDelete] = useState<
    string | null
  >(null);

  const [showInlineForm, setShowInlineForm] = useState(false);
  const [inlineFormData, setInlineFormData] = useState({
    entryNumber: "",
    entryDate: new Date().toISOString().split("T")[0],
    description: "",
    status: JournalEntryStatus.DRAFT,
    isAdjusting: false,
  });
  const [inlineFormDate, setInlineFormDate] = useState<Date | undefined>(
    new Date()
  );
  const [inlineFormLines, setInlineFormLines] = useState<
    JournalEntryLineForm[]
  >([
    { accountId: "", description: "", debit: 0, credit: 0 },
    { accountId: "", description: "", debit: 0, credit: 0 },
  ]);
  const [inlineFormLoading, setInlineFormLoading] = useState(false);
  const [inlineFormErrors, setInlineFormErrors] = useState<
    Record<string, string>
  >({});
  const [inlineFormAccountPopovers, setInlineFormAccountPopovers] = useState<
    Record<number, boolean>
  >({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntryPrefix, setJournalEntryPrefix] = useState<string>("");

  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(
    new Set()
  );

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingFormData, setEditingFormData] = useState<{
    entryNumber: string;
    entryDate: string;
    description: string;
    status: JournalEntryStatus;
    isAdjusting: boolean;
  } | null>(null);
  const [editingFormDate, setEditingFormDate] = useState<Date | undefined>(
    undefined
  );
  const [editingFormLines, setEditingFormLines] = useState<
    JournalEntryLineForm[]
  >([]);
  const [editingFormLoading, setEditingFormLoading] = useState(false);
  const [editingFormErrors, setEditingFormErrors] = useState<
    Record<string, string>
  >({});
  const [editingFormAccountPopovers, setEditingFormAccountPopovers] = useState<
    Record<number, boolean>
  >({});

  const [draftReminderOpen, setDraftReminderOpen] = useState(false);
  const [draftReminderEntryId, setDraftReminderEntryId] = useState<
    string | null
  >(null);
  const [draftReminderBusy, setDraftReminderBusy] = useState(false);
  const [draftReminderMode, setDraftReminderMode] = useState<
    "create" | "update" | null
  >(null);
  const draftReminderResolvedRef = useRef(false);

  const [companySettings, setCompanySettings] =
    useState<CompanySettings | null>(null);
  const [lockAuthDialogOpen, setLockAuthDialogOpen] = useState(false);
  const [lockDate, setLockDate] = useState<string | undefined>(undefined);
  const [pendingSaveMode, setPendingSaveMode] = useState<
    "create" | "update" | null
  >(null);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      startDate: startDate ? startDate.toISOString().split("T")[0] : "",
      endDate: endDate ? endDate.toISOString().split("T")[0] : "",
    }));
  }, [startDate, endDate]);

  useEffect(() => {
    loadJournalEntries();
  }, [filters, refreshSignal]);

  useEffect(() => {
    loadAccounts();
    loadCompanySettings();
  }, []);

  const loadCompanySettings = async () => {
    try {
      const response = await companySettingsAPI.getSettings();
      setCompanySettings(response.settings);
      const prefix = response.settings.journalEntryPrefix || "";
      setJournalEntryPrefix(prefix);
    } catch (error) {
      console.error("Failed to load company settings:", error);
    }
  };

  useEffect(() => {
    if (inlineFormDate) {
      setInlineFormData((prev) => ({
        ...prev,
        entryDate: inlineFormDate.toISOString().split("T")[0],
      }));
    }
  }, [inlineFormDate]);

  const loadJournalEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await journalEntryAPI.getAll(filters);
      setJournalEntries(response.journalEntries || []);
    } catch (error) {
      setError(getErrorMessage(error));
      console.error("Failed to load journal entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await accountAPI.getAll({ isActive: true, all: "true" });
      setAccounts(response.data || []);
    } catch (error) {
      console.error("Failed to load accounts:", error);
    }
  };

  const handleStatusUpdate = async (
    id: string,
    newStatus: JournalEntryStatus
  ) => {
    try {
      const response = await journalEntryAPI.updateStatus(id, newStatus);

      const statusLabels: Record<JournalEntryStatus, string> = {
        [JournalEntryStatus.DRAFT]: "reverted to draft",
        [JournalEntryStatus.POSTED]: "posted",
        [JournalEntryStatus.VOID]: "voided",
      };

      toast({
        variant: "success",
        title: "Success",
        description: `Journal entry ${statusLabels[newStatus]} successfully`,
      });

      if (response.journalEntry) {
        setJournalEntries((prevEntries) =>
          prevEntries.map((entry) =>
            entry.id === id ? response.journalEntry : entry
          )
        );
      }
    } catch (error) {
      console.error("Failed to update status:", getErrorMessage(error));
      toast({
        variant: "destructive",
        title: "Error",
        description: getErrorMessage(error),
      });
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

      toast({
        variant: "success",
        title: "Success",
        description: "Journal entry deleted successfully",
      });

      setJournalEntries((prevEntries) =>
        prevEntries.filter((entry) => entry.id !== journalEntryToDelete)
      );

      setExpandedEntries((prev) => {
        const newSet = new Set(prev);
        newSet.delete(journalEntryToDelete);
        return newSet;
      });
    } catch (error) {
      console.error("Failed to delete journal entry:", getErrorMessage(error));
      toast({
        variant: "destructive",
        title: "Error",
        description: getErrorMessage(error),
      });
    } finally {
      setDeleteDialogOpen(false);
      setJournalEntryToDelete(null);
    }
  };

  const toggleExpanded = (entryId: string) => {
    setExpandedEntries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
        if (editingEntryId === entryId) {
          handleCancelEdit();
        }
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const handleCreateNewInline = () => {
    setShowInlineForm(true);
    setInlineFormData({
      entryNumber: journalEntryPrefix || "",
      entryDate: new Date().toISOString().split("T")[0],
      description: "",
      status: JournalEntryStatus.DRAFT,
      isAdjusting: false,
    });
    setInlineFormDate(new Date());
    setInlineFormLines([
      { accountId: "", description: "", debit: 0, credit: 0 },
      { accountId: "", description: "", debit: 0, credit: 0 },
    ]);
    setInlineFormErrors({});
  };

  const handleCancelInlineForm = () => {
    setShowInlineForm(false);
    setInlineFormErrors({});
  };

  const addInlineFormLine = () => {
    setInlineFormLines([
      ...inlineFormLines,
      { accountId: "", description: "", debit: 0, credit: 0 },
    ]);
  };

  const removeInlineFormLine = (index: number) => {
    if (inlineFormLines.length > 2) {
      setInlineFormLines(inlineFormLines.filter((_, i) => i !== index));
    }
  };

  const updateInlineFormLine = (
    index: number,
    field: keyof JournalEntryLineForm,
    value: string | number
  ) => {
    const newLines = [...inlineFormLines];
    newLines[index] = { ...newLines[index], [field]: value };

    if (field === "debit" && typeof value === "number" && value > 0) {
      newLines[index].credit = 0;
    } else if (field === "credit" && typeof value === "number" && value > 0) {
      newLines[index].debit = 0;
    }

    setInlineFormLines(newLines);

    if (field === "accountId") {
      setInlineFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`line_${index}_account`];
        return newErrors;
      });
    } else if (field === "debit" || field === "credit") {
      setInlineFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`line_${index}_amount`];
        delete newErrors.balance;
        return newErrors;
      });
    }
  };

  const calculateInlineFormTotals = () => {
    const totalDebits = inlineFormLines.reduce(
      (sum, line) => sum + (line.debit || 0),
      0
    );
    const totalCredits = inlineFormLines.reduce(
      (sum, line) => sum + (line.credit || 0),
      0
    );
    return { totalDebits, totalCredits };
  };

  const isInlineFormValid = () => {
    if (inlineFormLines.length < 2) return false;

    const hasDebit = inlineFormLines.some((line) => (line.debit || 0) > 0);
    const hasCredit = inlineFormLines.some((line) => (line.credit || 0) > 0);
    if (!hasDebit || !hasCredit) return false;

    const { totalDebits, totalCredits } = calculateInlineFormTotals();
    if (Math.abs(totalDebits - totalCredits) > 0.01) return false;

    const hasMissingAccount = inlineFormLines.some((line) => !line.accountId);
    if (hasMissingAccount) return false;

    const hasZeroAmount = inlineFormLines.some(
      (line) => (line.debit || 0) === 0 && (line.credit || 0) === 0
    );
    if (hasZeroAmount) return false;

    return true;
  };

  const validateInlineForm = () => {
    const newErrors: Record<string, string> = {};

    if (inlineFormLines.length < 2) {
      newErrors.lines = "At least two line items are required";
    }

    inlineFormLines.forEach((line, index) => {
      if (!line.accountId) {
        newErrors[`line_${index}_account`] = "Account is required";
      }
      if (line.debit === 0 && line.credit === 0) {
        newErrors[`line_${index}_amount`] =
          "Either debit or credit amount is required";
      }
    });

    const { totalDebits, totalCredits } = calculateInlineFormTotals();
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      newErrors.balance = "Total debits and credits must be equal";
    }

    setInlineFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInlineFormSubmit = async (
    authPassword?: string,
    authPIN?: string,
    options?: { fromLockDialog?: boolean }
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!validateInlineForm()) {
      return { ok: false };
    }

    const dateStr = inlineFormData.entryDate?.split("T")[0];
    const requiresLockAuth = Boolean(
      companySettings?.hasLockBooksPassword || companySettings?.hasLockBooksPIN
    );

    if (dateStr && requiresLockAuth) {
      try {
        const lockCheck = await companySettingsAPI.checkDateLocked(dateStr);
        if (lockCheck.isLocked && !authPassword && !authPIN) {
          setPendingSaveMode("create");
          setLockDate(lockCheck.lockDate);
          setLockAuthDialogOpen(true);
          return { ok: false };
        }
      } catch {
        // If lock check fails, proceed (backend will still enforce when applicable)
      }
    }

    setInlineFormLoading(true);
    try {
      const submitData: CreateJournalEntryData = {
        entryNumber: inlineFormData.entryNumber || undefined,
        entryDate: inlineFormData.entryDate,
        description: inlineFormData.description || undefined,
        status: inlineFormData.status,
        isAdjusting: inlineFormData.isAdjusting,
        ...(authPassword ? { authPassword } : {}),
        ...(authPIN ? { authPIN } : {}),
        lines: inlineFormLines.map((line) => ({
          accountId: line.accountId,
          description: line.description || undefined,
          debit: line.debit,
          credit: line.credit,
        })),
      };

      const response = await journalEntryAPI.create(submitData);

      if (response.journalEntry) {
        setJournalEntries((prevEntries) => [
          response.journalEntry,
          ...prevEntries,
        ]);
      }

      setInlineFormLines([
        { accountId: "", description: "", debit: 0, credit: 0 },
        { accountId: "", description: "", debit: 0, credit: 0 },
      ]);
      setInlineFormAccountPopovers({});
      setShowInlineForm(false);

      if (response.journalEntry?.status === JournalEntryStatus.DRAFT) {
        draftReminderResolvedRef.current = false;
        setDraftReminderEntryId(response.journalEntry.id);
        setDraftReminderMode("create");
        setDraftReminderOpen(true);
      } else {
        toast({
          variant: "success",
          title: "Success",
          description: "Journal entry created successfully",
        });
      }
      return { ok: true };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      // If backend requires lock auth, prompt and retry
      const requiresLockAuth = Boolean(
        companySettings?.hasLockBooksPassword ||
          companySettings?.hasLockBooksPIN
      );
      const isLockAuthError =
        requiresLockAuth &&
        (axios.isAxiosError(error)
          ? error.response?.status === 403
          : errorMessage.includes("Authentication required") ||
            errorMessage.includes("Invalid authentication") ||
            errorMessage.toLowerCase().includes("credentials") ||
            errorMessage.includes("403"));

      if (isLockAuthError) {
        // If credentials were provided (dialog), keep dialog open and show inline error.
        if (authPassword || authPIN) {
          return {
            ok: false,
            error: "Incorrect PIN/password. Please try again.",
          };
        }
        setPendingSaveMode("create");
        setLockAuthDialogOpen(true);
        return { ok: false };
      }

      console.error("Failed to create journal entry:", errorMessage);
      if (!options?.fromLockDialog) {
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMessage,
        });
      }
      return { ok: false, error: errorMessage };
    } finally {
      setInlineFormLoading(false);
    }
  };

  const handleStartEdit = (entry: JournalEntry) => {
    if (entry.status === JournalEntryStatus.VOID) return;

    setEditingEntryId(entry.id);
    const dateOnly = entry.entryDate.split("T")[0];
    const [year, month, day] = dateOnly.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    setEditingFormData({
      entryNumber: entry.entryNumber,
      entryDate: entry.entryDate,
      description: entry.description || "",
      status: entry.status,
      isAdjusting: Boolean(entry.isAdjusting),
    });
    setEditingFormDate(date);
    setEditingFormLines(
      entry.lines?.map((line) => ({
        accountId: line.accountId,
        description: line.description || "",
        debit: line.debit,
        credit: line.credit,
      })) || []
    );
    setEditingFormErrors({});
  };

  const handleEdit = (entry: JournalEntry) => {
    if (entry.status === JournalEntryStatus.VOID) return;
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      next.add(entry.id);
      return next;
    });
    handleStartEdit(entry);
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditingFormData(null);
    setEditingFormDate(undefined);
    setEditingFormLines([]);
    setEditingFormErrors({});
  };

  const addEditingFormLine = () => {
    setEditingFormLines([
      ...editingFormLines,
      { accountId: "", description: "", debit: 0, credit: 0 },
    ]);
  };

  const removeEditingFormLine = (index: number) => {
    if (editingFormLines.length > 2) {
      setEditingFormLines(editingFormLines.filter((_, i) => i !== index));
    }
  };

  const updateEditingFormLine = (
    index: number,
    field: keyof JournalEntryLineForm,
    value: string | number
  ) => {
    const newLines = [...editingFormLines];
    newLines[index] = { ...newLines[index], [field]: value };

    if (field === "debit" && typeof value === "number" && value > 0) {
      newLines[index].credit = 0;
    } else if (field === "credit" && typeof value === "number" && value > 0) {
      newLines[index].debit = 0;
    }

    setEditingFormLines(newLines);

    if (field === "accountId") {
      setEditingFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`line_${index}_account`];
        return newErrors;
      });
    } else if (field === "debit" || field === "credit") {
      setEditingFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`line_${index}_amount`];
        delete newErrors.balance;
        return newErrors;
      });
    }
  };

  const calculateEditingFormTotals = () => {
    const totalDebits = editingFormLines.reduce(
      (sum, line) => sum + (line.debit || 0),
      0
    );
    const totalCredits = editingFormLines.reduce(
      (sum, line) => sum + (line.credit || 0),
      0
    );
    return { totalDebits, totalCredits };
  };

  const isEditingFormValid = () => {
    if (editingFormLines.length < 2) return false;

    const hasDebit = editingFormLines.some((line) => (line.debit || 0) > 0);
    const hasCredit = editingFormLines.some((line) => (line.credit || 0) > 0);
    if (!hasDebit || !hasCredit) return false;

    const { totalDebits, totalCredits } = calculateEditingFormTotals();
    if (Math.abs(totalDebits - totalCredits) > 0.01) return false;

    const hasMissingAccount = editingFormLines.some((line) => !line.accountId);
    if (hasMissingAccount) return false;

    const hasZeroAmount = editingFormLines.some(
      (line) => (line.debit || 0) === 0 && (line.credit || 0) === 0
    );
    if (hasZeroAmount) return false;

    return true;
  };

  const validateEditingForm = () => {
    const newErrors: Record<string, string> = {};

    if (!editingFormData?.entryDate) {
      newErrors.entryDate = "Entry date is required";
    }

    if (editingFormLines.length < 2) {
      newErrors.lines = "At least two line items are required";
    }

    editingFormLines.forEach((line, index) => {
      if (!line.accountId) {
        newErrors[`line_${index}_account`] = "Account is required";
      }
      if (line.debit === 0 && line.credit === 0) {
        newErrors[`line_${index}_amount`] =
          "Either debit or credit amount is required";
      }
    });

    const { totalDebits, totalCredits } = calculateEditingFormTotals();
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      newErrors.balance = "Total debits and credits must be equal";
    }

    setEditingFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveEdit = async (
    authPassword?: string,
    authPIN?: string,
    options?: { fromLockDialog?: boolean }
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!editingEntryId || !editingFormData) return { ok: false };
    if (!validateEditingForm()) {
      return { ok: false };
    }

    const dateStr = editingFormData.entryDate?.split("T")[0];
    const requiresLockAuth = Boolean(
      companySettings?.hasLockBooksPassword || companySettings?.hasLockBooksPIN
    );

    if (dateStr && requiresLockAuth) {
      try {
        const lockCheck = await companySettingsAPI.checkDateLocked(dateStr);
        if (lockCheck.isLocked && !authPassword && !authPIN) {
          setPendingSaveMode("update");
          setLockDate(lockCheck.lockDate);
          setLockAuthDialogOpen(true);
          return { ok: false };
        }
      } catch {
        // If lock check fails, proceed (backend will still enforce when applicable)
      }
    }

    setEditingFormLoading(true);
    try {
      const submitData: UpdateJournalEntryData = {
        entryNumber:
          editingFormData.entryNumber || journalEntryPrefix || undefined,
        entryDate: editingFormData.entryDate,
        description: editingFormData.description || undefined,
        status: editingFormData.status,
        isAdjusting: editingFormData.isAdjusting,
        ...(authPassword ? { authPassword } : {}),
        ...(authPIN ? { authPIN } : {}),
        lines: editingFormLines.map((line) => ({
          accountId: line.accountId,
          description: line.description || undefined,
          debit: line.debit,
          credit: line.credit,
        })),
      };

      const response = await journalEntryAPI.update(editingEntryId, submitData);

      if (response.journalEntry) {
        setJournalEntries((prevEntries) =>
          prevEntries.map((entry) => {
            if (entry.id === editingEntryId) {
              return {
                ...response.journalEntry,
                createdByUser: entry.createdByUser,
                updatedByUser: entry.updatedByUser,
              };
            }
            return entry;
          })
        );
      }

      setExpandedEntries((prev) => {
        const newSet = new Set(prev);
        newSet.delete(editingEntryId);
        return newSet;
      });

      handleCancelEdit();

      if (response.journalEntry?.status === JournalEntryStatus.DRAFT) {
        draftReminderResolvedRef.current = false;
        setDraftReminderEntryId(response.journalEntry.id);
        setDraftReminderMode("update");
        setDraftReminderOpen(true);
      } else {
        toast({
          variant: "success",
          title: "Success",
          description: "Journal entry updated successfully",
        });
      }
      return { ok: true };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      const requiresLockAuth = Boolean(
        companySettings?.hasLockBooksPassword ||
          companySettings?.hasLockBooksPIN
      );
      const isLockAuthError =
        requiresLockAuth &&
        (axios.isAxiosError(error)
          ? error.response?.status === 403
          : errorMessage.includes("Authentication required") ||
            errorMessage.includes("Invalid authentication") ||
            errorMessage.toLowerCase().includes("credentials") ||
            errorMessage.includes("403"));

      if (isLockAuthError) {
        if (authPassword || authPIN) {
          return {
            ok: false,
            error: "Incorrect PIN/password. Please try again.",
          };
        }
        setPendingSaveMode("update");
        setLockAuthDialogOpen(true);
        return { ok: false };
      }

      console.error("Failed to update journal entry:", errorMessage);
      if (!options?.fromLockDialog) {
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMessage,
        });
      }
      return { ok: false, error: errorMessage };
    } finally {
      setEditingFormLoading(false);
    }
  };

  useEffect(() => {
    if (editingFormDate && editingFormData) {
      setEditingFormData((prev) => ({
        ...prev!,
        entryDate: editingFormDate.toISOString().split("T")[0],
      }));
    }
  }, [editingFormDate]);

  const filteredEntries = journalEntries.filter((entry) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();

    if (entry.entryNumber.toLowerCase().includes(searchLower)) return true;

    if (
      entry.description &&
      entry.description.toLowerCase().includes(searchLower)
    )
      return true;

    if (entry.lines) {
      const accountNames = entry.lines
        .map((line) => {
          const account = accounts.find((acc) => acc.id === line.accountId);
          return account ? `${account.code} ${account.name}` : "";
        })
        .join(" ")
        .toLowerCase();

      if (accountNames.includes(searchLower)) return true;
    }

    return false;
  });

  const getStatusText = (status: JournalEntryStatus) => (
    <span className="text-base text-black">{statusLabels[status]}</span>
  );

  const formatCurrency = (amount: number) =>
    formatCurrencyBase(amount, { signedParenthesis: true });

  const calculateTotalAmount = (entry: JournalEntry) => {
    if (!entry.lines) return 0;
    return entry.lines.reduce((sum, line) => sum + line.debit, 0);
  };

  const handleDraftReminderPost = async () => {
    if (!draftReminderEntryId) return;
    try {
      setDraftReminderBusy(true);
      draftReminderResolvedRef.current = true;
      await handleStatusUpdate(draftReminderEntryId, JournalEntryStatus.POSTED);
      setDraftReminderOpen(false);
      setDraftReminderEntryId(null);
      setDraftReminderMode(null);
    } finally {
      setDraftReminderBusy(false);
    }
  };

  const handleDraftReminderNo = () => {
    if (draftReminderBusy) return;
    if (!draftReminderEntryId) {
      setDraftReminderOpen(false);
      setDraftReminderMode(null);
      return;
    }

    draftReminderResolvedRef.current = true;
    toast({
      variant: "success",
      title: "Success",
      description:
        draftReminderMode === "update"
          ? "Journal entry updated as Draft"
          : "Journal entry created as Draft",
    });
    setDraftReminderOpen(false);
    setDraftReminderEntryId(null);
    setDraftReminderMode(null);
  };

  const handleLockAuthDialogAuthenticate = async (
    password?: string,
    pin?: string
  ) => {
    const mode = pendingSaveMode;
    if (mode === "create") {
      return await handleInlineFormSubmit(password, pin, {
        fromLockDialog: true,
      });
    }
    if (mode === "update") {
      return await handleSaveEdit(password, pin, { fromLockDialog: true });
    }
    return { ok: false };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
              Journal Entries
            </CardTitle>
            <Button
              onClick={onCreateNew || handleCreateNewInline}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder={
                    isDesktop
                      ? "Search by entry number, description, or accounts..."
                      : "Search entries..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-xs sm:text-sm placeholder:text-xs sm:placeholder:text-sm"
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
                value={filters.status || "all"}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    status:
                      value === "all"
                        ? undefined
                        : (value as JournalEntryStatus),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value={JournalEntryStatus.DRAFT}>
                    Draft
                  </SelectItem>
                  <SelectItem value={JournalEntryStatus.POSTED}>
                    Posted
                  </SelectItem>
                  <SelectItem value={JournalEntryStatus.VOID}>Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="overflow-x-auto w-full">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">
                      Entry Number
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead className="whitespace-nowrap w-16 text-center">
                      Adjusting
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Description
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Amount
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Created By
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-28" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Skeleton className="h-5 w-6 mx-auto" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-5 w-20 ml-auto" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-5 w-8 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No journal entries found</p>
              <p className="text-sm">
                Create your first journal entry to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">
                      Entry Number
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead className="whitespace-nowrap w-16 text-center">
                      Adjusting
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Description
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Amount
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Created By
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showInlineForm && (
                    <TableRow className="bg-blue-50 hover:bg-blue-50">
                      <TableCell colSpan={8} className="p-4">
                        <div className="bg-white border rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
                            <div className="space-y-1">
                              <Label>Entry Number</Label>
                              <Input
                                value={inlineFormData.entryNumber}
                                onChange={(e) =>
                                  setInlineFormData({
                                    ...inlineFormData,
                                    entryNumber: e.target.value,
                                  })
                                }
                                placeholder="Auto-generated if empty"
                                className="h-10"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Date</Label>
                              <DatePicker
                                date={inlineFormDate}
                                setDate={setInlineFormDate}
                                className="w-full h-10"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Adjusting</Label>
                              <div className="flex h-10 items-center rounded-md border border-input bg-background px-3 py-2">
                                <Checkbox
                                  id="inline-isAdjusting"
                                  checked={inlineFormData.isAdjusting}
                                  className="scale-125"
                                  onCheckedChange={(checked) =>
                                    setInlineFormData({
                                      ...inlineFormData,
                                      isAdjusting: checked === true,
                                    })
                                  }
                                />
                                <span className="ml-2 text-sm text-foreground">
                                  Adjusting
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label>Description</Label>
                              <Input
                                value={inlineFormData.description}
                                onChange={(e) =>
                                  setInlineFormData({
                                    ...inlineFormData,
                                    description: e.target.value,
                                  })
                                }
                                placeholder="Entry description"
                                className="h-10"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Status</Label>
                              <Select
                                value={inlineFormData.status}
                                onValueChange={(value) =>
                                  setInlineFormData({
                                    ...inlineFormData,
                                    status: value as JournalEntryStatus,
                                  })
                                }
                              >
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={JournalEntryStatus.DRAFT}>
                                    Draft
                                  </SelectItem>
                                  <SelectItem value={JournalEntryStatus.POSTED}>
                                    Posted
                                  </SelectItem>
                                  <SelectItem value={JournalEntryStatus.VOID}>
                                    Void
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="mb-2">
                            <Label className="text-sm">
                              Journal Entry Lines
                            </Label>
                          </div>

                          <Table className="relative">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-black text-base">
                                  Account
                                </TableHead>
                                <TableHead className="text-black text-base">
                                  Description
                                </TableHead>
                                <TableHead className="text-right text-black text-base">
                                  Debit
                                </TableHead>
                                <TableHead className="text-right text-black text-base">
                                  Credit
                                </TableHead>
                                <TableHead className="w-24"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {inlineFormLines.map((line, index) => (
                                <React.Fragment key={index}>
                                  <TableRow>
                                    <TableCell>
                                      <div className="space-y-1">
                                        <Popover
                                          open={
                                            inlineFormAccountPopovers[index] ||
                                            false
                                          }
                                          onOpenChange={(open) =>
                                            setInlineFormAccountPopovers({
                                              ...inlineFormAccountPopovers,
                                              [index]: open,
                                            })
                                          }
                                        >
                                          <PopoverTrigger asChild>
                                            <Button
                                              variant="outline"
                                              role="combobox"
                                              className={cn(
                                                "h-8 w-full justify-between",
                                                !line.accountId &&
                                                  "text-muted-foreground",
                                                inlineFormErrors[
                                                  `line_${index}_account`
                                                ] && "border-destructive"
                                              )}
                                            >
                                              {(() => {
                                                const selectedAccount =
                                                  line.accountId
                                                    ? accounts.find(
                                                        (account) =>
                                                          account.id ===
                                                          line.accountId
                                                      )
                                                    : null;
                                                return selectedAccount
                                                  ? `${selectedAccount.code} - ${selectedAccount.name}`
                                                  : "Select account...";
                                              })()}
                                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent
                                            className="w-[400px] p-0"
                                            align="start"
                                          >
                                            <Command>
                                              <CommandInput placeholder="Search accounts..." />
                                              <CommandList>
                                                <CommandEmpty>
                                                  No accounts found.
                                                </CommandEmpty>
                                                <CommandGroup>
                                                  {accounts.map((account) => (
                                                    <CommandItem
                                                      key={account.id}
                                                      value={`${account.code} ${account.name}`}
                                                      onSelect={() => {
                                                        updateInlineFormLine(
                                                          index,
                                                          "accountId",
                                                          account.id
                                                        );
                                                        setInlineFormAccountPopovers(
                                                          {
                                                            ...inlineFormAccountPopovers,
                                                            [index]: false,
                                                          }
                                                        );
                                                      }}
                                                      className="cursor-pointer"
                                                    >
                                                      <Check
                                                        className={cn(
                                                          "mr-2 h-4 w-4",
                                                          line.accountId ===
                                                            account.id
                                                            ? "opacity-100"
                                                            : "opacity-0"
                                                        )}
                                                      />
                                                      <span className="font-medium">
                                                        {account.code}
                                                      </span>
                                                      <span className="ml-2">
                                                        {account.name}
                                                      </span>
                                                    </CommandItem>
                                                  ))}
                                                </CommandGroup>
                                              </CommandList>
                                            </Command>
                                          </PopoverContent>
                                        </Popover>
                                        {inlineFormErrors[
                                          `line_${index}_account`
                                        ] && (
                                          <p className="text-xs text-destructive">
                                            {
                                              inlineFormErrors[
                                                `line_${index}_account`
                                              ]
                                            }
                                          </p>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        value={line.description}
                                        onChange={(e) =>
                                          updateInlineFormLine(
                                            index,
                                            "description",
                                            e.target.value
                                          )
                                        }
                                        placeholder="Line description"
                                        className="w-full h-8"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <div className="space-y-1">
                                        <Input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={line.debit || ""}
                                          onChange={(e) =>
                                            updateInlineFormLine(
                                              index,
                                              "debit",
                                              parseFloat(e.target.value) || 0
                                            )
                                          }
                                          placeholder="0.00"
                                          className={cn(
                                            "text-right h-8",
                                            inlineFormErrors[
                                              `line_${index}_amount`
                                            ] && "border-destructive"
                                          )}
                                        />
                                        {inlineFormErrors[
                                          `line_${index}_amount`
                                        ] && (
                                          <p className="text-xs text-destructive">
                                            {
                                              inlineFormErrors[
                                                `line_${index}_amount`
                                              ]
                                            }
                                          </p>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={line.credit || ""}
                                        onChange={(e) =>
                                          updateInlineFormLine(
                                            index,
                                            "credit",
                                            parseFloat(e.target.value) || 0
                                          )
                                        }
                                        placeholder="0.00"
                                        className={cn(
                                          "text-right h-8",
                                          inlineFormErrors[
                                            `line_${index}_amount`
                                          ] && "border-destructive"
                                        )}
                                      />
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        type="button"
                                        onClick={() =>
                                          removeInlineFormLine(index)
                                        }
                                        size="icon"
                                        variant="outline"
                                        disabled={inlineFormLines.length <= 2}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                  {index === inlineFormLines.length - 1 &&
                                    inlineFormErrors.balance && (
                                      <TableRow>
                                        <TableCell
                                          colSpan={5}
                                          className="text-center"
                                        >
                                          <p className="text-sm text-destructive">
                                            {inlineFormErrors.balance}
                                          </p>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                </React.Fragment>
                              ))}
                              <TableRow>
                                <TableCell></TableCell>
                                <TableCell className="font-medium text-black text-base">
                                  Total
                                </TableCell>
                                <TableCell className="text-right font-mono text-green-600 text-base">
                                  {formatCurrency(
                                    calculateInlineFormTotals().totalDebits
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-mono text-green-600 text-base">
                                  {formatCurrency(
                                    calculateInlineFormTotals().totalCredits
                                  )}
                                </TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                          <div className="flex items-center justify-between mt-3 pl-2 pr-2">
                            <Button
                              type="button"
                              onClick={addInlineFormLine}
                              size="sm"
                              variant="outline"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Line
                            </Button>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => handleInlineFormSubmit()}
                                disabled={
                                  inlineFormLoading || !isInlineFormValid()
                                }
                                size="sm"
                              >
                                {inlineFormLoading ? "Saving..." : "Save"}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancelInlineForm}
                                size="sm"
                                disabled={inlineFormLoading}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {filteredEntries.map((entry) => {
                    const isExpanded = expandedEntries.has(entry.id);
                    const isEditing = editingEntryId === entry.id;

                    return (
                      <React.Fragment key={entry.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleExpanded(entry.id)}
                        >
                          <TableCell className="font-medium whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              )}
                              {entry.entryNumber}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {(() => {
                              const dateOnly = entry.entryDate.split("T")[0];
                              const [year, month, day] = dateOnly
                                .split("-")
                                .map(Number);
                              const date = new Date(year, month - 1, day);
                              return format(date, "MMM dd, yyyy");
                            })()}
                          </TableCell>
                          <TableCell
                            className="text-center whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex justify-center pointer-events-none cursor-default">
                              <Checkbox
                                checked={Boolean(entry.isAdjusting)}
                                className="h-5 w-6"
                                aria-label="Mark journal entry as adjusting"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {entry.description || "No description"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {getStatusText(entry.status)}
                          </TableCell>
                          <TableCell className="text-right font-mono whitespace-nowrap">
                            {formatCurrency(calculateTotalAmount(entry))}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {entry.createdByUser
                              ? `${entry.createdByUser.firstName || ""} ${
                                  entry.createdByUser.lastName || ""
                                }`.trim() || entry.createdByUser.email
                              : "Unknown"}
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
                                {entry.status === JournalEntryStatus.DRAFT && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleEdit(entry)}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleStatusUpdate(
                                          entry.id,
                                          JournalEntryStatus.POSTED
                                        )
                                      }
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Post
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleStatusUpdate(
                                          entry.id,
                                          JournalEntryStatus.VOID
                                        )
                                      }
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Void
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDelete(entry.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {entry.status === JournalEntryStatus.POSTED && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleEdit(entry)}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleStatusUpdate(
                                          entry.id,
                                          JournalEntryStatus.DRAFT
                                        )
                                      }
                                    >
                                      <RotateCcw className="h-4 w-4 mr-2" />
                                      Revert to Draft
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleStatusUpdate(
                                          entry.id,
                                          JournalEntryStatus.VOID
                                        )
                                      }
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Void
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDelete(entry.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {entry.status === JournalEntryStatus.VOID && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleStatusUpdate(
                                          entry.id,
                                          JournalEntryStatus.DRAFT
                                        )
                                      }
                                    >
                                      <RotateCcw className="h-4 w-4 mr-2" />
                                      Restore
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDelete(entry.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow className="bg-blue-50 hover:bg-blue-50">
                            <TableCell colSpan={8} className="p-4">
                              {isEditing ? (
                                <div className="bg-white border rounded-lg p-4">
                                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
                                    <div className="space-y-1">
                                      <Label>Entry Number</Label>
                                      <Input
                                        value={
                                          editingFormData?.entryNumber || ""
                                        }
                                        onChange={(e) =>
                                          setEditingFormData((prev) => ({
                                            ...prev!,
                                            entryNumber: e.target.value,
                                          }))
                                        }
                                        className="h-10"
                                        placeholder="Auto-generated if empty"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label>Date</Label>
                                      <DatePicker
                                        date={editingFormDate}
                                        setDate={setEditingFormDate}
                                        className="w-full h-10"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label>Adjusting</Label>
                                      <div className="flex h-10 items-center rounded-md border border-input bg-background px-3 py-2">
                                        <Checkbox
                                          id="edit-isAdjusting"
                                          checked={
                                            editingFormData?.isAdjusting ||
                                            false
                                          }
                                          className="scale-125"
                                          onCheckedChange={(checked) =>
                                            setEditingFormData((prev) => ({
                                              ...prev!,
                                              isAdjusting: checked === true,
                                            }))
                                          }
                                        />
                                        <span className="ml-2 text-sm text-foreground">
                                          Adjusting
                                        </span>
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <Label>Description</Label>
                                      <Input
                                        value={
                                          editingFormData?.description || ""
                                        }
                                        onChange={(e) =>
                                          setEditingFormData((prev) => ({
                                            ...prev!,
                                            description: e.target.value,
                                          }))
                                        }
                                        className="h-10"
                                        placeholder="Description"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label>Status</Label>
                                      <Select
                                        value={
                                          editingFormData?.status ||
                                          JournalEntryStatus.DRAFT
                                        }
                                        onValueChange={(value) =>
                                          setEditingFormData((prev) => ({
                                            ...prev!,
                                            status: value as JournalEntryStatus,
                                          }))
                                        }
                                      >
                                        <SelectTrigger className="h-10">
                                          <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem
                                            value={JournalEntryStatus.DRAFT}
                                          >
                                            Draft
                                          </SelectItem>
                                          <SelectItem
                                            value={JournalEntryStatus.POSTED}
                                          >
                                            Posted
                                          </SelectItem>
                                          <SelectItem
                                            value={JournalEntryStatus.VOID}
                                          >
                                            Void
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div className="mb-2">
                                    <Label className="text-sm text-base">
                                      Journal Entry Lines
                                    </Label>
                                  </div>

                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="text-black text-base">
                                          Account
                                        </TableHead>
                                        <TableHead className="text-black text-base">
                                          Description
                                        </TableHead>
                                        <TableHead className="text-right text-black text-base">
                                          Debit
                                        </TableHead>
                                        <TableHead className="text-right text-black text-base">
                                          Credit
                                        </TableHead>
                                        <TableHead className="w-24"></TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {editingFormLines.map((line, index) => (
                                        <React.Fragment key={index}>
                                          <TableRow>
                                            <TableCell>
                                              <div className="space-y-1">
                                                <Popover
                                                  open={
                                                    editingFormAccountPopovers[
                                                      index
                                                    ] || false
                                                  }
                                                  onOpenChange={(open) =>
                                                    setEditingFormAccountPopovers(
                                                      {
                                                        ...editingFormAccountPopovers,
                                                        [index]: open,
                                                      }
                                                    )
                                                  }
                                                >
                                                  <PopoverTrigger asChild>
                                                    <Button
                                                      variant="outline"
                                                      role="combobox"
                                                      className={cn(
                                                        "h-8 w-full justify-between",
                                                        !line.accountId &&
                                                          "text-muted-foreground",
                                                        editingFormErrors[
                                                          `line_${index}_account`
                                                        ] &&
                                                          "border-destructive"
                                                      )}
                                                    >
                                                      {(() => {
                                                        const selectedAccount =
                                                          line.accountId
                                                            ? accounts.find(
                                                                (account) =>
                                                                  account.id ===
                                                                  line.accountId
                                                              )
                                                            : null;
                                                        return selectedAccount
                                                          ? `${selectedAccount.code} - ${selectedAccount.name}`
                                                          : "Select account...";
                                                      })()}
                                                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                  </PopoverTrigger>
                                                  <PopoverContent
                                                    className="w-[400px] p-0"
                                                    align="start"
                                                  >
                                                    <Command>
                                                      <CommandInput placeholder="Search accounts..." />
                                                      <CommandList>
                                                        <CommandEmpty>
                                                          No accounts found.
                                                        </CommandEmpty>
                                                        <CommandGroup>
                                                          {accounts.map(
                                                            (account) => (
                                                              <CommandItem
                                                                key={account.id}
                                                                value={`${account.code} ${account.name}`}
                                                                onSelect={() => {
                                                                  updateEditingFormLine(
                                                                    index,
                                                                    "accountId",
                                                                    account.id
                                                                  );
                                                                  setEditingFormAccountPopovers(
                                                                    {
                                                                      ...editingFormAccountPopovers,
                                                                      [index]:
                                                                        false,
                                                                    }
                                                                  );
                                                                }}
                                                                className="cursor-pointer"
                                                              >
                                                                <Check
                                                                  className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    line.accountId ===
                                                                      account.id
                                                                      ? "opacity-100"
                                                                      : "opacity-0"
                                                                  )}
                                                                />
                                                                <span className="font-medium">
                                                                  {account.code}
                                                                </span>
                                                                <span className="ml-2">
                                                                  {account.name}
                                                                </span>
                                                              </CommandItem>
                                                            )
                                                          )}
                                                        </CommandGroup>
                                                      </CommandList>
                                                    </Command>
                                                  </PopoverContent>
                                                </Popover>
                                                {editingFormErrors[
                                                  `line_${index}_account`
                                                ] && (
                                                  <p className="text-xs text-destructive">
                                                    {
                                                      editingFormErrors[
                                                        `line_${index}_account`
                                                      ]
                                                    }
                                                  </p>
                                                )}
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                              <Input
                                                value={line.description}
                                                onChange={(e) =>
                                                  updateEditingFormLine(
                                                    index,
                                                    "description",
                                                    e.target.value
                                                  )
                                                }
                                                placeholder="Line description"
                                                className="w-full h-8"
                                              />
                                            </TableCell>
                                            <TableCell>
                                              <div className="space-y-1">
                                                <Input
                                                  type="number"
                                                  step="0.01"
                                                  min="0"
                                                  value={line.debit || ""}
                                                  onChange={(e) =>
                                                    updateEditingFormLine(
                                                      index,
                                                      "debit",
                                                      parseFloat(
                                                        e.target.value
                                                      ) || 0
                                                    )
                                                  }
                                                  placeholder="0.00"
                                                  className={cn(
                                                    "text-right h-8",
                                                    editingFormErrors[
                                                      `line_${index}_amount`
                                                    ] && "border-destructive"
                                                  )}
                                                />
                                                {editingFormErrors[
                                                  `line_${index}_amount`
                                                ] && (
                                                  <p className="text-xs text-destructive">
                                                    {
                                                      editingFormErrors[
                                                        `line_${index}_amount`
                                                      ]
                                                    }
                                                  </p>
                                                )}
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                              <div className="space-y-1">
                                                <Input
                                                  type="number"
                                                  step="0.01"
                                                  min="0"
                                                  value={line.credit || ""}
                                                  onChange={(e) =>
                                                    updateEditingFormLine(
                                                      index,
                                                      "credit",
                                                      parseFloat(
                                                        e.target.value
                                                      ) || 0
                                                    )
                                                  }
                                                  placeholder="0.00"
                                                  className={cn(
                                                    "text-right h-8",
                                                    editingFormErrors[
                                                      `line_${index}_amount`
                                                    ] && "border-destructive"
                                                  )}
                                                />
                                                {editingFormErrors[
                                                  `line_${index}_amount`
                                                ] && (
                                                  <p className="text-xs text-destructive">
                                                    {
                                                      editingFormErrors[
                                                        `line_${index}_amount`
                                                      ]
                                                    }
                                                  </p>
                                                )}
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <Button
                                                type="button"
                                                onClick={() =>
                                                  removeEditingFormLine(index)
                                                }
                                                size="icon"
                                                variant="outline"
                                                disabled={
                                                  editingFormLines.length <= 2
                                                }
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </TableCell>
                                          </TableRow>
                                          {index ===
                                            editingFormLines.length - 1 &&
                                            editingFormErrors.balance && (
                                              <TableRow>
                                                <TableCell
                                                  colSpan={5}
                                                  className="text-center"
                                                >
                                                  <p className="text-sm text-destructive">
                                                    {editingFormErrors.balance}
                                                  </p>
                                                </TableCell>
                                              </TableRow>
                                            )}
                                        </React.Fragment>
                                      ))}
                                      <TableRow>
                                        <TableCell></TableCell>
                                        <TableCell className="font-medium text-black text-base">
                                          Total
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-green-600 font-medium text-base">
                                          {formatCurrency(
                                            calculateEditingFormTotals()
                                              .totalDebits
                                          )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-green-600 font-medium text-base">
                                          {formatCurrency(
                                            calculateEditingFormTotals()
                                              .totalCredits
                                          )}
                                        </TableCell>
                                        <TableCell></TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                  <div className="flex items-center justify-between mt-3 pl-2 pr-2">
                                    <Button
                                      type="button"
                                      onClick={addEditingFormLine}
                                      size="sm"
                                      variant="outline"
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add Line
                                    </Button>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        onClick={() => handleSaveEdit()}
                                        disabled={
                                          editingFormLoading ||
                                          !isEditingFormValid()
                                        }
                                        size="sm"
                                      >
                                        {editingFormLoading
                                          ? "Saving..."
                                          : "Save"}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleCancelEdit}
                                        size="sm"
                                        disabled={editingFormLoading}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-white border rounded-lg p-4">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="text-black text-base">
                                          Account
                                        </TableHead>
                                        <TableHead className="text-black text-base">
                                          Description
                                        </TableHead>
                                        <TableHead className="text-right text-black text-base">
                                          Debit
                                        </TableHead>
                                        <TableHead className="text-right text-black text-base">
                                          Credit
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {entry.lines?.map((line, index) => (
                                        <TableRow key={line.id || index}>
                                          <TableCell>
                                            <span className="text-sm">
                                              {line.account?.code} -{" "}
                                              {line.account?.name}
                                            </span>
                                          </TableCell>
                                          <TableCell>
                                            <span className="text-sm">
                                              {line.description || "-"}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-sm">
                                            {line.debit > 0
                                              ? formatCurrency(line.debit)
                                              : "-"}
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-sm">
                                            {line.credit > 0
                                              ? formatCurrency(line.credit)
                                              : "-"}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                      <TableRow>
                                        <TableCell></TableCell>
                                        <TableCell className="font-medium text-base">
                                          Total
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-green-600 font-medium text-base">
                                          {formatCurrency(
                                            entry.lines?.reduce(
                                              (sum, line) => sum + line.debit,
                                              0
                                            ) || 0
                                          )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-green-600 font-medium text-base">
                                          {formatCurrency(
                                            entry.lines?.reduce(
                                              (sum, line) => sum + line.credit,
                                              0
                                            ) || 0
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={draftReminderOpen}
        onOpenChange={(open) => {
          if (!open && !draftReminderResolvedRef.current) {
            handleDraftReminderNo();
            return;
          }
          setDraftReminderOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Journal Entry Drafted</AlertDialogTitle>
            <AlertDialogDescription>
              This Journal Entry is now Drafted. Do you want to post now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={draftReminderBusy}
              onClick={handleDraftReminderNo}
            >
              No
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDraftReminderPost}
              disabled={draftReminderBusy}
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BookLockAuthDialog
        open={lockAuthDialogOpen}
        onOpenChange={(open) => {
          setLockAuthDialogOpen(open);
          if (!open) {
            setPendingSaveMode(null);
            setLockDate(undefined);
          }
        }}
        onAuthenticate={handleLockAuthDialogAuthenticate}
        settings={companySettings || undefined}
        lockDate={lockDate}
        title="Books Locked"
        description="The books are locked for this date. Enter your password/PIN to save these changes."
      />
    </div>
  );
};
