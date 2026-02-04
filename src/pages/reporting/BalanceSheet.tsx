import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { reportAPI, getErrorMessage } from "@/lib/api";
import {
  Account,
  AccountType,
  BalanceSheetReportResponse,
  BalanceSheetTransactionsResponse,
  ReportDisplayBy,
} from "@/types/api.types";
import { getSubTypeOrder } from "@/lib/accountOrdering";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";

interface SubTypeGroup {
  subType: string;
  accounts: Account[];
}

interface ReportRow {
  id: string;
  type: "section" | "subtype" | "account" | "total" | "summary";
  label: string;
  level: number;
  account?: Account;
  accounts?: Account[];
}

const BALANCE_SHEET_TYPES: AccountType[] = [
  AccountType.Fixed_Assets,
  AccountType.Current_Assets,
  AccountType.Current_Liabilities,
  AccountType.Long_Term_Liabilities,
  AccountType.Equity,
];

const SUBTYPE_MAPPING: Record<string, string[]> = {
  [AccountType.Fixed_Assets]: [
    "Property_Plant_Equipment",
    "Accumulated_Amortization",
    "Accumulated_Depreciation",
    "Other_Fixed_Assets",
    "Intangible_Assets",
  ],
  [AccountType.Current_Assets]: [
    "Cash_Cash_Equivalents",
    "Accounts_Receivable",
    "Other_Current_Assets",
    "Undeposited_Funds",
  ],
  [AccountType.Current_Liabilities]: [
    "Accounts_Payable",
    "Credit_Card",
    "Other_Current_Liabilities",
  ],
  [AccountType.Long_Term_Liabilities]: ["Long_Term_Liabilities"],
  [AccountType.Equity]: [
    "Other_Equity",
    "Retained_Earnings",
    "Contributions",
    "Distributions",
    "Net_Income",
  ],
};

const PRESET_OPTIONS = [
  { value: "custom", label: "Custom dates" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "this_week_to_date", label: "This week to date" },
  { value: "this_month", label: "This month" },
  { value: "this_month_to_date", label: "This month to date" },
  { value: "this_quarter", label: "This quarter" },
  { value: "this_quarter_to_date", label: "This quarter to date" },
  { value: "this_year", label: "This year" },
  { value: "this_year_to_date", label: "This year to date" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_week", label: "Last week" },
  { value: "last_month", label: "Last month" },
  { value: "last_quarter", label: "Last quarter" },
  { value: "last_year", label: "Last year" },
];

const DISPLAY_BY_OPTIONS: { value: ReportDisplayBy; label: string }[] = [
  { value: "total", label: "Total" },
  { value: "months", label: "Months" },
  { value: "quarters", label: "Quarters" },
  { value: "years", label: "Years" },
];

const COMPARISON_OPTIONS = [
  { value: "none", label: "None" },
  { value: "previous_period", label: "Previous period" },
  { value: "custom_period", label: "Custom period" },
];

const formatCurrency = (amount: number) => {
  const n = Math.abs(amount) < 1e-10 ? 0 : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

const formatAccountType = (type: string) =>
  type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

const formatDateParam = (date?: Date) =>
  date ? format(date, "yyyy-MM-dd") : undefined;

const parseBackendDateToLocal = (value?: string | null): Date | undefined => {
  if (!value) return undefined;
  const dateOnly = value.slice(0, 10);
  const [y, m, d] = dateOnly.split("-").map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return undefined;
  return new Date(y, m - 1, d);
};

const formatBackendDateForDisplay = (value?: string | null): string | null => {
  if (!value) return null;
  const dateOnly = value.slice(0, 10);
  const [y, m, d] = dateOnly.split("-").map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
  return format(new Date(y, m - 1, d), "MMM d, yyyy");
};

function buildSubTypeGroups(
  type: AccountType,
  accounts: Account[]
): SubTypeGroup[] {
  const subTypeMap = new Map<string, Account[]>();
  const expectedSubTypes = SUBTYPE_MAPPING[type] || [];
  expectedSubTypes.forEach((subType) => subTypeMap.set(subType, []));
  accounts.forEach((acc) => {
    const subType = acc.subType || "Other";
    if (!subTypeMap.has(subType)) subTypeMap.set(subType, []);
    subTypeMap.get(subType)!.push(acc);
  });
  return Array.from(subTypeMap.entries())
    .filter(([, accs]) => accs.length > 0)
    .sort((a, b) => {
      const aOrder = getSubTypeOrder(a[0]);
      const bOrder = getSubTypeOrder(b[0]);
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aIndex = expectedSubTypes.indexOf(a[0]);
      const bIndex = expectedSubTypes.indexOf(b[0]);
      if (aIndex === -1 && bIndex === -1) return a[0].localeCompare(b[0]);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    })
    .map(([subType, accs]) => ({
      subType,
      accounts: accs,
    }));
}

/** Inline drilldown: transactions for one account in report date range (balance-sheet API with accountId). */
const BalanceSheetAccountDrilldown = ({
  account,
  appliedStartDate,
  appliedEndDate,
}: {
  account: Account;
  appliedStartDate: Date | undefined;
  appliedEndDate: Date | undefined;
}) => {
  const { toast } = useToast();
  const [detailTransactions, setDetailTransactions] = useState<
    {
      id: string;
      date: string;
      type: string;
      entryNumber: string | null;
      description: string;
      debit: number;
      credit: number;
      amount: number;
    }[]
  >([]);
  const [detailLoading, setDetailLoading] = useState(true);
  const lastSuccessKeyRef = useRef<string>("");

  useEffect(() => {
    if (!appliedStartDate || !appliedEndDate) {
      setDetailLoading(false);
      return;
    }
    const controller = new AbortController();
    const key = `${
      account.id
    }|${appliedStartDate.getTime()}|${appliedEndDate.getTime()}`;
    if (lastSuccessKeyRef.current === key) {
      setDetailLoading(false);
      return () => controller.abort();
    }
    (async () => {
      try {
        setDetailLoading(true);
        const params: Record<string, string> = {
          accountId: account.id,
          startDate: formatDateParam(appliedStartDate) as string,
          endDate: formatDateParam(appliedEndDate) as string,
        };
        const response = await reportAPI.getBalanceSheet(params, {
          signal: controller.signal,
        });
        const data = response as BalanceSheetTransactionsResponse;
        setDetailTransactions(data.transactions || []);
        lastSuccessKeyRef.current = key;
      } catch (err) {
        const isAbort =
          (err as { name?: string })?.name === "CanceledError" ||
          (err as { name?: string })?.name === "AbortError";
        if (!isAbort) {
          toast({
            variant: "destructive",
            title: "Error",
            description: getErrorMessage(err),
          });
        }
      } finally {
        setDetailLoading(false);
      }
    })();
    return () => controller.abort();
  }, [
    account.id,
    appliedStartDate?.getTime(),
    appliedEndDate?.getTime(),
    toast,
  ]);

  const detailRunningBalances = useMemo(() => {
    let running = 0;
    return detailTransactions.map((txn) => {
      running += txn.amount || 0;
      return running;
    });
  }, [detailTransactions]);

  const detailTotal = useMemo(
    () => detailTransactions.reduce((sum, txn) => sum + (txn.amount || 0), 0),
    [detailTransactions]
  );

  return (
    <div className="space-y-2">
      <div className="rounded-md border bg-background overflow-x-auto overflow-y-auto max-h-[380px] min-w-0">
        <Table className="text-sm w-max min-w-full">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="h-8 px-2 whitespace-nowrap min-w-[110px] text-sm">
                Date
              </TableHead>
              <TableHead className="h-8 px-2 whitespace-nowrap min-w-[120px] text-sm">
                Type
              </TableHead>
              <TableHead className="h-8 px-2 whitespace-nowrap min-w-[110px] text-sm">
                Entry #
              </TableHead>
              <TableHead className="h-8 px-2 whitespace-nowrap min-w-[260px] text-sm">
                Description
              </TableHead>
              <TableHead className="h-8 px-2 text-right whitespace-nowrap min-w-[110px] text-sm">
                Debit
              </TableHead>
              <TableHead className="h-8 px-2 text-right whitespace-nowrap min-w-[110px] text-sm">
                Credit
              </TableHead>
              <TableHead className="h-8 px-2 text-right whitespace-nowrap min-w-[120px] text-sm">
                Amount
              </TableHead>
              <TableHead className="h-8 px-2 text-right whitespace-nowrap min-w-[120px] text-sm">
                Balance
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detailLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="px-2 py-1">
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <Skeleton className="h-4 w-64" />
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right">
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right">
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <>
                {detailTransactions.map((txn, index) => {
                  const date = txn.date ? new Date(txn.date) : null;
                  const amountNegative = (txn.amount || 0) < 0;
                  return (
                    <TableRow
                      key={`${txn.id}-${txn.entryNumber ?? ""}-${txn.date}`}
                    >
                      <TableCell className="px-2 py-1 whitespace-nowrap">
                        {date && !Number.isNaN(date.getTime())
                          ? format(date, "MM/dd/yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="px-2 py-1 whitespace-nowrap capitalize">
                        {txn.type?.replace(/_/g, " ") || "—"}
                      </TableCell>
                      <TableCell className="px-2 py-1 whitespace-nowrap font-mono">
                        {txn.entryNumber || "—"}
                      </TableCell>
                      <TableCell className="px-2 py-1 whitespace-nowrap">
                        {txn.description || "—"}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-right whitespace-nowrap font-mono tabular-nums">
                        {txn.debit ? formatCurrency(txn.debit) : "—"}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-right whitespace-nowrap font-mono tabular-nums">
                        {txn.credit ? formatCurrency(txn.credit) : "—"}
                      </TableCell>
                      <TableCell
                        className={`px-2 py-1 text-right whitespace-nowrap font-mono tabular-nums ${
                          amountNegative ? "text-red-600" : ""
                        }`}
                      >
                        {formatCurrency(txn.amount || 0)}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-right whitespace-nowrap font-mono tabular-nums">
                        {formatCurrency(detailRunningBalances[index] || 0)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {detailTransactions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-sm text-muted-foreground py-4"
                    >
                      No transactions for this period.
                    </TableCell>
                  </TableRow>
                )}
                {detailTransactions.length > 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="px-2 py-2 text-right font-semibold whitespace-nowrap"
                    >
                      Total for {account.name}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-right whitespace-nowrap font-mono font-semibold tabular-nums">
                      {formatCurrency(detailTotal)}
                    </TableCell>
                    <TableCell className="px-2 py-2" />
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export const BalanceSheet = () => {
  const { toast } = useToast();
  const [report, setReport] = useState<BalanceSheetReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState("this_year_to_date");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [displayBy, setDisplayBy] = useState<ReportDisplayBy>("total");
  const [comparisonType, setComparisonType] = useState("none");
  const [comparisonStartDate, setComparisonStartDate] = useState<
    Date | undefined
  >();
  const [comparisonEndDate, setComparisonEndDate] = useState<
    Date | undefined
  >();
  const [comparisonMode, setComparisonMode] = useState<"amount" | "percent">(
    "amount"
  );
  const [appliedPreset, setAppliedPreset] = useState("this_year_to_date");
  const [appliedStartDate, setAppliedStartDate] = useState<Date | undefined>();
  const [appliedEndDate, setAppliedEndDate] = useState<Date | undefined>();
  const [appliedDisplayBy, setAppliedDisplayBy] =
    useState<ReportDisplayBy>("total");
  const [appliedComparisonType, setAppliedComparisonType] = useState("none");
  const [appliedComparisonStartDate, setAppliedComparisonStartDate] = useState<
    Date | undefined
  >();
  const [appliedComparisonEndDate, setAppliedComparisonEndDate] = useState<
    Date | undefined
  >();
  const [expandedTypes, setExpandedTypes] = useState<Set<AccountType>>(
    new Set(BALANCE_SHEET_TYPES)
  );
  const [expandedSubTypes, setExpandedSubTypes] = useState<Set<string>>(
    new Set()
  );
  const [expandedAccountIds, setExpandedAccountIds] = useState<Set<string>>(
    new Set()
  );

  const reportStartDate = useMemo(
    () => startDate ?? parseBackendDateToLocal(report?.startDate),
    [startDate, report?.startDate]
  );
  const reportEndDate = useMemo(
    () => endDate ?? parseBackendDateToLocal(report?.endDate),
    [endDate, report?.endDate]
  );

  const loadReport = async () => {
    if (appliedPreset === "custom" && (!appliedStartDate || !appliedEndDate)) {
      setLoading(false);
      return;
    }
    if (
      appliedComparisonType === "custom_period" &&
      (!appliedComparisonStartDate || !appliedComparisonEndDate)
    ) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (appliedPreset && appliedPreset !== "custom")
        params.preset = appliedPreset;
      if (appliedPreset === "custom" && appliedStartDate && appliedEndDate) {
        params.startDate = formatDateParam(appliedStartDate) as string;
        params.endDate = formatDateParam(appliedEndDate) as string;
      }
      if (appliedDisplayBy) params.displayBy = appliedDisplayBy;
      if (appliedComparisonType !== "none")
        params.comparison = appliedComparisonType;
      if (
        appliedComparisonType === "custom_period" &&
        appliedComparisonStartDate &&
        appliedComparisonEndDate
      ) {
        params.comparisonStartDate = formatDateParam(
          appliedComparisonStartDate
        ) as string;
        params.comparisonEndDate = formatDateParam(
          appliedComparisonEndDate
        ) as string;
      }
      const data = (await reportAPI.getBalanceSheet(
        params
      )) as BalanceSheetReportResponse;
      setReport(data);
      if (appliedPreset !== "custom" && data.startDate && data.endDate) {
        const nextStart = parseBackendDateToLocal(data.startDate);
        const nextEnd = parseBackendDateToLocal(data.endDate);
        if (nextStart) setStartDate(nextStart);
        if (nextEnd) setEndDate(nextEnd);
      }
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

  useEffect(() => {
    loadReport();
  }, [
    appliedPreset,
    appliedDisplayBy,
    appliedComparisonType,
    appliedComparisonStartDate,
    appliedComparisonEndDate,
    ...(appliedPreset === "custom" ? [appliedStartDate, appliedEndDate] : []),
  ]);

  const handleSave = () => {
    if (preset === "custom" && (!startDate || !endDate)) {
      toast({
        variant: "destructive",
        title: "Invalid dates",
        description: "Please select both From and To dates for custom period.",
      });
      return;
    }
    if (
      comparisonType === "custom_period" &&
      (!comparisonStartDate || !comparisonEndDate)
    ) {
      toast({
        variant: "destructive",
        title: "Invalid comparison dates",
        description: "Please select both Comparison from and to dates.",
      });
      return;
    }
    setAppliedPreset(preset);
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setAppliedDisplayBy(displayBy);
    setAppliedComparisonType(comparisonType);
    setAppliedComparisonStartDate(comparisonStartDate);
    setAppliedComparisonEndDate(comparisonEndDate);
  };

  const DEFAULTS = {
    preset: "this_year_to_date" as const,
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    displayBy: "total" as ReportDisplayBy,
    comparisonType: "none" as const,
    comparisonStartDate: undefined as Date | undefined,
    comparisonEndDate: undefined as Date | undefined,
  };

  const handleClear = () => {
    setPreset(DEFAULTS.preset);
    setStartDate(DEFAULTS.startDate);
    setEndDate(DEFAULTS.endDate);
    setDisplayBy(DEFAULTS.displayBy);
    setComparisonType(DEFAULTS.comparisonType);
    setComparisonStartDate(DEFAULTS.comparisonStartDate);
    setComparisonEndDate(DEFAULTS.comparisonEndDate);
    setAppliedPreset(DEFAULTS.preset);
    setAppliedStartDate(DEFAULTS.startDate);
    setAppliedEndDate(DEFAULTS.endDate);
    setAppliedDisplayBy(DEFAULTS.displayBy);
    setAppliedComparisonType(DEFAULTS.comparisonType);
    setAppliedComparisonStartDate(DEFAULTS.comparisonStartDate);
    setAppliedComparisonEndDate(DEFAULTS.comparisonEndDate);
  };

  const hasNonDefaultFilters =
    appliedPreset !== DEFAULTS.preset ||
    appliedDisplayBy !== DEFAULTS.displayBy ||
    appliedComparisonType !== DEFAULTS.comparisonType;

  const handlePresetChange = (value: string) => {
    setPreset(value);
    if (value !== "custom") {
      setStartDate(undefined);
      setEndDate(undefined);
    }
  };

  const handleDateChange = (type: "start" | "end", date?: Date) => {
    setPreset("custom");
    if (type === "start") setStartDate(date);
    else setEndDate(date);
  };

  const toggleType = (type: AccountType) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const toggleSubType = (key: string) => {
    setExpandedSubTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAccount = (accountId: string) => {
    setExpandedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  };

  const periodGroups = useMemo(() => {
    if (!report) return [];
    const groups: Array<{
      key: string;
      label: string;
      displayLabel: string;
      index: number;
    }> = [];
    if (appliedDisplayBy !== "total" && report.periodBreakdown) {
      report.periodBreakdown.forEach((period, index) => {
        const displayLabel =
          appliedDisplayBy === "months" || appliedDisplayBy === "quarters"
            ? period.label.toUpperCase()
            : period.label;
        groups.push({
          key: period.label,
          label: period.label,
          displayLabel,
          index,
        });
      });
      groups.push({
        key: "total",
        label: "Total",
        displayLabel: "Total",
        index: -1,
      });
      return groups;
    }
    return [{ key: "total", label: "Total", displayLabel: "Total", index: -1 }];
  }, [report, appliedDisplayBy]);

  const getAccountValue = (accountId: string, groupKey: string) => {
    if (!report) return 0;
    if (groupKey === "total") return report.accountBalances?.[accountId] ?? 0;
    return report.periodBalances?.[accountId]?.[groupKey] ?? 0;
  };

  const getComparisonValue = (
    accountId: string,
    groupKey: string
  ): number | null => {
    if (!report || appliedComparisonType === "none") return null;
    if (groupKey === "total")
      return report.comparisonBalances?.[accountId] ?? null;
    return report.comparisonPeriodBalances?.[accountId]?.[groupKey] ?? null;
  };

  const PERCENT_NA = NaN;
  const formatValue = (
    value: number | null,
    mode: "currency" | "percent" = "currency"
  ) => {
    if (value === null) return "—";
    if (mode === "percent" && Number.isNaN(value)) return "N/A";
    if (Number.isNaN(value)) return "—";
    if (mode === "percent") return formatPercent(value);
    return formatCurrency(value);
  };

  const getChangeValue = (
    current: number,
    previous: number | null
  ): number | null => {
    if (previous === null) return null;
    if (comparisonMode === "percent") {
      if (previous === 0) return current === 0 ? 0 : PERCENT_NA;
      return ((current - previous) / Math.abs(previous)) * 100;
    }
    return current - previous;
  };

  const sumAccounts = (
    accounts: Account[] = [],
    groupKey: string,
    useComparison = false
  ) =>
    accounts.reduce((sum, account) => {
      const value = useComparison
        ? getComparisonValue(account.id, groupKey) ?? 0
        : getAccountValue(account.id, groupKey);
      return sum + value;
    }, 0);

  const accountsByType = useMemo(() => {
    const grouped: Record<AccountType, Account[]> = {
      [AccountType.Fixed_Assets]: [],
      [AccountType.Current_Assets]: [],
      [AccountType.Current_Liabilities]: [],
      [AccountType.Long_Term_Liabilities]: [],
      [AccountType.Equity]: [],
      [AccountType.Income]: [],
      [AccountType.Other_Income]: [],
      [AccountType.Expense]: [],
      [AccountType.Other_Expense]: [],
      [AccountType.Cost_of_Goods_Sold]: [],
    };
    report?.accounts.forEach((account) => {
      if (grouped[account.type]) grouped[account.type].push(account);
    });
    return grouped;
  }, [report]);

  const netIncome = report?.netIncome ?? 0;

  const equityAccountsExcludingNetIncome = useMemo(
    () =>
      (accountsByType[AccountType.Equity] || []).filter(
        (a) => a.subType !== "Net_Income"
      ),
    [accountsByType]
  );

  const buildRows = (): ReportRow[] => {
    const rows: ReportRow[] = [];
    const addTypeSection = (type: AccountType) => {
      const accounts = accountsByType[type] || [];
      const equityExcludeNetIncome =
        type === AccountType.Equity
          ? accounts.filter((a) => a.subType !== "Net_Income")
          : accounts;
      if (equityExcludeNetIncome.length === 0 && type !== AccountType.Equity)
        return;
      const sectionLabel = formatAccountType(type);
      rows.push({
        id: `section-${type}`,
        type: "section",
        label: sectionLabel,
        level: 0,
        accounts: equityExcludeNetIncome,
      });

      buildSubTypeGroups(type, equityExcludeNetIncome).forEach((subGroup) => {
        const subKey = `${type}-${subGroup.subType}`;
        const subtypeLabel = formatAccountType(subGroup.subType);
        const isRedundant = subtypeLabel === sectionLabel;
        if (!isRedundant) {
          rows.push({
            id: `subtype-${subKey}`,
            type: "subtype",
            label: subtypeLabel,
            level: 1,
            accounts: subGroup.accounts,
          });
        }
        subGroup.accounts.forEach((account) => {
          rows.push({
            id: account.id,
            type: "account",
            label: account.code
              ? `${account.code} - ${account.name}`
              : account.name,
            level: isRedundant ? 1 : 2,
            account,
          });
        });
      });
    };

    addTypeSection(AccountType.Fixed_Assets);
    addTypeSection(AccountType.Current_Assets);
    rows.push({
      id: "total-assets",
      type: "total",
      label: "Total Assets",
      level: 0,
      accounts: [
        ...(accountsByType[AccountType.Fixed_Assets] || []),
        ...(accountsByType[AccountType.Current_Assets] || []),
      ],
    });

    addTypeSection(AccountType.Current_Liabilities);
    addTypeSection(AccountType.Long_Term_Liabilities);
    rows.push({
      id: "total-liabilities",
      type: "total",
      label: "Total Liabilities",
      level: 0,
      accounts: [
        ...(accountsByType[AccountType.Current_Liabilities] || []),
        ...(accountsByType[AccountType.Long_Term_Liabilities] || []),
      ],
    });

    addTypeSection(AccountType.Equity);
    rows.push({
      id: "net-income-row",
      type: "summary",
      label: "Net Income",
      level: 0,
      accounts: [],
    });
    rows.push({
      id: "total-equity",
      type: "total",
      label: "Total Equity",
      level: 0,
      accounts: [...(accountsByType[AccountType.Equity] || [])],
    });
    rows.push({
      id: "total-liabilities-equity",
      type: "total",
      label: "Total Liabilities & Equity",
      level: 0,
      accounts: [
        ...(accountsByType[AccountType.Current_Liabilities] || []),
        ...(accountsByType[AccountType.Long_Term_Liabilities] || []),
        ...(accountsByType[AccountType.Equity] || []),
      ],
    });
    return rows;
  };

  const rows = useMemo(buildRows, [accountsByType, report?.accountBalances]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (row.type === "section") return true;
      if (row.type === "subtype") {
        const parentType = row.id
          .replace("subtype-", "")
          .split("-")[0] as AccountType;
        return expandedTypes.has(parentType);
      }
      if (row.type === "account" && row.account) {
        const parentType = row.account.type;
        if (!expandedTypes.has(parentType)) return false;
        if (row.account.subType && parentType) {
          const subKey = `${parentType}-${row.account.subType}`;
          if (
            formatAccountType(row.account.subType) ===
            formatAccountType(parentType)
          )
            return true;
          return expandedSubTypes.has(subKey);
        }
        return true;
      }
      return true;
    });
  }, [rows, expandedTypes, expandedSubTypes]);

  const sectionRowIds = useMemo(
    () => visibleRows.filter((r) => r.type === "section").map((r) => r.id),
    [visibleRows]
  );
  const sectionRowIdsWithSpacer = useMemo(
    () => new Set(sectionRowIds.slice(1)),
    [sectionRowIds]
  );

  const mainColSpan =
    appliedComparisonType === "none"
      ? 1 + periodGroups.length
      : 1 + periodGroups.length * 3;

  const renderRowValues = (row: ReportRow) => {
    return periodGroups.map((group, i) => {
      const leftBorder = i > 0 ? "border-l border-border" : "";
      let currentValue: number | null = row.account
        ? getAccountValue(row.account.id, group.key)
        : null;
      if (row.type === "total" || row.type === "summary") {
        if (row.id === "total-assets") {
          currentValue = sumAccounts(
            [
              ...(accountsByType[AccountType.Fixed_Assets] || []),
              ...(accountsByType[AccountType.Current_Assets] || []),
            ],
            group.key
          );
        } else if (row.id === "total-liabilities") {
          currentValue = sumAccounts(
            [
              ...(accountsByType[AccountType.Current_Liabilities] || []),
              ...(accountsByType[AccountType.Long_Term_Liabilities] || []),
            ],
            group.key
          );
        } else if (row.id === "net-income-row") {
          currentValue = group.key === "total" ? netIncome : null;
        } else if (row.id === "total-equity") {
          const equitySum = sumAccounts(
            equityAccountsExcludingNetIncome,
            group.key
          );
          currentValue =
            group.key === "total" ? equitySum + netIncome : equitySum;
        } else if (row.id === "total-liabilities-equity") {
          currentValue = sumAccounts(
            [
              ...(accountsByType[AccountType.Current_Liabilities] || []),
              ...(accountsByType[AccountType.Long_Term_Liabilities] || []),
              ...equityAccountsExcludingNetIncome,
            ],
            group.key
          );
          if (group.key === "total")
            currentValue = (currentValue ?? 0) + netIncome;
        } else {
          currentValue = sumAccounts(row.accounts || [], group.key);
        }
      }
      const computedCurrent = currentValue ?? 0;
      const comparisonValue =
        appliedComparisonType === "none"
          ? null
          : row.account
          ? getComparisonValue(row.account.id, group.key)
          : row.id === "net-income-row"
          ? null
          : row.id === "total-assets"
          ? sumAccounts(
              [
                ...(accountsByType[AccountType.Fixed_Assets] || []),
                ...(accountsByType[AccountType.Current_Assets] || []),
              ],
              group.key,
              true
            )
          : row.id === "total-liabilities"
          ? sumAccounts(
              [
                ...(accountsByType[AccountType.Current_Liabilities] || []),
                ...(accountsByType[AccountType.Long_Term_Liabilities] || []),
              ],
              group.key,
              true
            )
          : row.id === "total-equity"
          ? sumAccounts(equityAccountsExcludingNetIncome, group.key, true) +
            (group.key === "total" ? netIncome : 0)
          : row.id === "total-liabilities-equity"
          ? sumAccounts(
              [
                ...(accountsByType[AccountType.Current_Liabilities] || []),
                ...(accountsByType[AccountType.Long_Term_Liabilities] || []),
                ...equityAccountsExcludingNetIncome,
              ],
              group.key,
              true
            ) + (group.key === "total" ? netIncome : 0)
          : sumAccounts(row.accounts || [], group.key, true);
      const computedComparison = comparisonValue ?? null;
      const changeValue = getChangeValue(computedCurrent, computedComparison);
      const negativeClass =
        computedCurrent < 0 && Math.abs(computedCurrent) >= 1e-10
          ? "text-destructive"
          : "";
      const comparisonNegativeClass =
        computedComparison !== null &&
        computedComparison < 0 &&
        Math.abs(computedComparison) >= 1e-10
          ? "text-destructive"
          : "";
      const changeNegativeClass =
        changeValue !== null &&
        changeValue < 0 &&
        Math.abs(changeValue) >= 1e-10
          ? "text-destructive"
          : "";

      if (appliedComparisonType === "none") {
        return (
          <TableCell
            key={`${row.id}-${group.key}`}
            className={`px-3 py-1.5 text-right font-mono text-sm tabular-nums ${leftBorder} ${negativeClass}`}
          >
            {formatValue(computedCurrent)}
          </TableCell>
        );
      }
      return (
        <Fragment key={`${row.id}-${group.key}`}>
          <TableCell
            className={`px-3 py-1.5 text-right font-mono text-sm tabular-nums ${leftBorder} ${negativeClass}`}
          >
            {formatValue(computedCurrent)}
          </TableCell>
          <TableCell
            className={`px-3 py-1.5 text-right font-mono text-sm tabular-nums text-muted-foreground border-l border-border ${comparisonNegativeClass}`}
          >
            {formatValue(computedComparison)}
          </TableCell>
          <TableCell
            className={`px-3 py-1.5 text-right font-mono text-sm tabular-nums border-l border-border ${changeNegativeClass}`}
          >
            {formatValue(
              changeValue,
              comparisonMode === "percent" ? "percent" : "currency"
            )}
          </TableCell>
        </Fragment>
      );
    });
  };

  const totalAssets = useMemo(() => {
    return sumAccounts(
      [
        ...(accountsByType[AccountType.Fixed_Assets] || []),
        ...(accountsByType[AccountType.Current_Assets] || []),
      ],
      "total"
    );
  }, [accountsByType, report?.accountBalances]);

  const totalLiabilitiesAndEquity = useMemo(() => {
    const liab = sumAccounts(
      [
        ...(accountsByType[AccountType.Current_Liabilities] || []),
        ...(accountsByType[AccountType.Long_Term_Liabilities] || []),
      ],
      "total"
    );
    const equity =
      sumAccounts(equityAccountsExcludingNetIncome, "total") + netIncome;
    return liab + equity;
  }, [
    accountsByType,
    equityAccountsExcludingNetIncome,
    report?.accountBalances,
    netIncome,
  ]);

  const balanceDifference = totalAssets - totalLiabilitiesAndEquity;

  const isBalanced = Math.abs(balanceDifference) <= 0.01;

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-6">
        <Card>
          <CardHeader className="space-y-4">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="min-w-0 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(12)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell
                        className={
                          i % 3 === 1
                            ? "pl-6"
                            : i % 3 === 2
                            ? "pl-10"
                            : undefined
                        }
                      >
                        <Skeleton
                          className={`h-5 ${
                            i % 3 === 0 ? "w-48" : i % 3 === 1 ? "w-36" : "w-32"
                          }`}
                        />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="w-full min-w-0">
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No report data available.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:flex-wrap">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl break-words">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                Balance Sheet
              </CardTitle>
              {report?.startDate && report?.endDate && (
                <div className="mt-1 min-w-0 break-words">
                  <p className="text-sm text-muted-foreground">
                    As of {formatBackendDateForDisplay(report.endDate)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Balances are running balances as of the end date. Start date
                    only affects transaction detail when you expand an account.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isBalanced ? (
            <Alert
              variant="destructive"
              className="min-w-0 py-3 px-4 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:top-3.5 [&>svg~*]:pl-7 [&>svg+div]:translate-y-0"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <AlertDescription className="min-w-0 break-words text-base leading-snug">
                <strong>Balance Sheet Out of Balance:</strong> Total Assets (
                {formatCurrency(totalAssets)}) does not equal Total Liabilities
                & Equity ({formatCurrency(totalLiabilitiesAndEquity)}).
                Difference: {formatCurrency(Math.abs(balanceDifference))}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert
              variant="default"
              className="min-w-0 border-green-500/50 bg-green-50 text-green-800 dark:border-green-500/50 dark:bg-green-950/30 dark:text-green-200 py-3 px-4 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:top-3.5 [&>svg~*]:pl-7 [&>svg+div]:translate-y-0 [&>svg]:text-green-600 dark:[&>svg]:text-green-400"
            >
              <CheckCircle className="h-4 w-4 shrink-0" />
              <AlertDescription className="min-w-0 break-words text-base leading-snug">
                <strong>Balance Sheet is balanced.</strong> Total Assets and
                Total Liabilities & Equity both equal{" "}
                {formatCurrency(totalAssets)}.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="min-w-0 sm:col-span-2 lg:col-span-2">
              <label className="text-sm font-medium">Report period</label>
              <Select value={preset} onValueChange={handlePresetChange}>
                <SelectTrigger className="mt-1 w-full min-w-0">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <label className="text-sm font-medium">From</label>
              <DatePicker
                date={reportStartDate}
                setDate={(date) => handleDateChange("start", date)}
              />
            </div>
            <div className="min-w-0">
              <label className="text-sm font-medium">To</label>
              <DatePicker
                date={reportEndDate}
                setDate={(date) => handleDateChange("end", date)}
              />
            </div>
            <div className="min-w-0">
              <label className="text-sm font-medium">Display columns by</label>
              <Select
                value={displayBy}
                onValueChange={(value) =>
                  setDisplayBy(value as ReportDisplayBy)
                }
              >
                <SelectTrigger className="mt-1 w-full min-w-0">
                  <SelectValue placeholder="Display by" />
                </SelectTrigger>
                <SelectContent>
                  {DISPLAY_BY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <label className="text-sm font-medium">Comparison</label>
              <Select value={comparisonType} onValueChange={setComparisonType}>
                <SelectTrigger className="mt-1 w-full min-w-0">
                  <SelectValue placeholder="Comparison" />
                </SelectTrigger>
                <SelectContent>
                  {COMPARISON_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {comparisonType !== "none" && (
              <div className="min-w-0 sm:col-span-2 md:col-span-1">
                <label className="text-sm font-medium">Change type</label>
                <Select
                  value={comparisonMode}
                  onValueChange={(value) =>
                    setComparisonMode(value as "amount" | "percent")
                  }
                >
                  <SelectTrigger className="mt-1 w-full min-w-0">
                    <SelectValue placeholder="Change type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount">$ Change</SelectItem>
                    <SelectItem value="percent">% Change</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {comparisonType === "custom_period" && (
              <>
                <div className="min-w-0 lg:col-start-3">
                  <label className="text-sm font-medium">Comparison from</label>
                  <DatePicker
                    date={comparisonStartDate}
                    setDate={(date) => setComparisonStartDate(date)}
                  />
                </div>
                <div className="min-w-0 lg:col-start-4">
                  <label className="text-sm font-medium">Comparison to</label>
                  <DatePicker
                    date={comparisonEndDate}
                    setDate={(date) => setComparisonEndDate(date)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {hasNonDefaultFilters && (
              <Button variant="outline" size="sm" onClick={handleClear}>
                Clear filters
              </Button>
            )}
            <Button size="sm" onClick={handleSave}>
              Save filters
            </Button>
          </div>

          <div className="min-w-0 w-full overflow-x-auto overflow-y-visible rounded-md bg-background">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                {appliedComparisonType === "none" ? (
                  <TableRow>
                    <TableHead
                      className={
                        appliedDisplayBy !== "total"
                          ? "h-10 px-3 min-w-[280px] sticky left-0 z-20 bg-background"
                          : "h-10 px-3 min-w-[280px]"
                      }
                    >
                      Account
                    </TableHead>
                    {periodGroups.map((group) => (
                      <TableHead
                        key={group.key}
                        className="h-10 px-3 text-right"
                      >
                        {group.displayLabel}
                      </TableHead>
                    ))}
                  </TableRow>
                ) : (
                  <>
                    <TableRow>
                      <TableHead
                        className={
                          appliedDisplayBy !== "total"
                            ? "h-10 px-3 min-w-[280px] sticky left-0 z-20 bg-background"
                            : "h-10 px-3 min-w-[280px]"
                        }
                      >
                        Account
                      </TableHead>
                      {periodGroups.map((group) => (
                        <TableHead
                          key={group.key}
                          colSpan={3}
                          className="h-10 px-3 text-center"
                        >
                          {group.displayLabel}
                        </TableHead>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableHead
                        className={
                          appliedDisplayBy !== "total"
                            ? "h-10 px-3 min-w-[280px] sticky left-0 z-20 bg-background"
                            : "h-10 px-3"
                        }
                      />
                      {periodGroups.map((group) => (
                        <Fragment key={group.key}>
                          <TableHead className="h-9 text-right px-3 py-1.5 text-xs uppercase text-muted-foreground">
                            {group.key === "total" ? "Total" : "CURRENT"}
                          </TableHead>
                          <TableHead className="h-9 text-right px-3 py-1.5 text-xs uppercase text-muted-foreground border-l border-border">
                            {group.key === "total"
                              ? "Previous Total"
                              : "Previous"}
                          </TableHead>
                          <TableHead className="h-9 text-right px-3 py-1.5 text-xs uppercase text-muted-foreground border-l border-border">
                            {comparisonMode === "percent"
                              ? "% Change (PP)"
                              : "$ Change (PP)"}
                          </TableHead>
                        </Fragment>
                      ))}
                    </TableRow>
                  </>
                )}
              </TableHeader>
              <TableBody>
                {visibleRows.map((row) => {
                  const isSection = row.type === "section";
                  const isSubtotal = row.type === "total";
                  const isSummary = row.type === "summary";
                  const isAccountRow = row.type === "account" && !!row.account;
                  const showSectionSpacer =
                    isSection && sectionRowIdsWithSpacer.has(row.id);
                  const isAccountRowExpanded =
                    isAccountRow && expandedAccountIds.has(row.account!.id);
                  const indentClass =
                    row.level === 0
                      ? "pl-4"
                      : row.level === 1
                      ? "pl-8"
                      : "pl-12";
                  const parentType = row.id.replace(
                    "section-",
                    ""
                  ) as AccountType;
                  const subKey =
                    row.type === "subtype"
                      ? row.id.replace("subtype-", "")
                      : "";
                  const hasToggle =
                    row.type === "section" || row.type === "subtype";
                  const isExpanded =
                    row.type === "section"
                      ? expandedTypes.has(parentType)
                      : row.type === "subtype"
                      ? expandedSubTypes.has(subKey)
                      : true;

                  const handleRowClick = () => {
                    if (hasToggle) {
                      if (row.type === "section") toggleType(parentType);
                      else toggleSubType(subKey);
                      return;
                    }
                    if (isAccountRow) toggleAccount(row.account!.id);
                  };

                  return (
                    <Fragment key={row.id}>
                      {showSectionSpacer && (
                        <TableRow className="border-0 hover:bg-transparent">
                          <TableCell colSpan={mainColSpan} className="p-0">
                            <div className="h-8" />
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow
                        className={[
                          isSection
                            ? "bg-muted font-semibold uppercase cursor-pointer hover:bg-muted/80"
                            : "",
                          isSubtotal ? "font-bold" : "",
                          isSummary ? "bg-primary/10 font-bold" : "",
                          row.type === "subtype" || row.type === "section"
                            ? "cursor-pointer"
                            : "",
                          isAccountRow
                            ? "cursor-pointer hover:bg-muted/40"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={handleRowClick}
                      >
                        <TableCell
                          className={`${indentClass} pr-3 py-1.5 ${
                            appliedDisplayBy !== "total"
                              ? "sticky left-0 z-10 bg-background border-r border-border"
                              : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {hasToggle && (
                              <span
                                className="text-muted-foreground shrink-0"
                                aria-hidden
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </span>
                            )}
                            {!hasToggle && isAccountRow && (
                              <span
                                className="text-muted-foreground shrink-0"
                                aria-hidden
                              >
                                {isAccountRowExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </span>
                            )}
                            <span className={isSection ? "uppercase" : ""}>
                              {row.label}
                            </span>
                          </div>
                        </TableCell>
                        {renderRowValues(row)}
                      </TableRow>
                      {isAccountRowExpanded && row.account && (
                        <TableRow>
                          <TableCell
                            colSpan={mainColSpan}
                            className="min-w-0 overflow-hidden p-0"
                          >
                            <div className="min-w-0 border-t bg-muted/10 p-2 sm:p-3">
                              <BalanceSheetAccountDrilldown
                                account={row.account}
                                appliedStartDate={
                                  appliedStartDate ??
                                  reportStartDate ??
                                  undefined
                                }
                                appliedEndDate={
                                  appliedEndDate ?? reportEndDate ?? undefined
                                }
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
