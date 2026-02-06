import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
} from "date-fns";
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
  ProfitLossReportResponse,
  ProfitLossTransaction,
  ProfitLossTransactionsResponse,
  ReportDisplayBy,
} from "@/types/api.types";
import { getSubTypeOrder } from "@/lib/accountOrdering";
import { ChevronDown, ChevronRight, Download, TrendingUp } from "lucide-react";

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

const PROFIT_LOSS_TYPES: AccountType[] = [
  AccountType.Income,
  AccountType.Other_Income,
  AccountType.Cost_of_Goods_Sold,
  AccountType.Expense,
  AccountType.Other_Expense,
];

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

/**
 * Computes the start and end dates for a given preset based on today's date.
 * Returns undefined for custom preset (user must manually select dates).
 */
const getPresetDates = (
  preset: string
): { start: Date; end: Date } | undefined => {
  const today = new Date();

  switch (preset) {
    case "today":
      return { start: startOfDay(today), end: endOfDay(today) };
    case "yesterday": {
      const yesterday = subDays(today, 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    }
    case "this_week":
      return {
        start: startOfWeek(today, { weekStartsOn: 0 }),
        end: endOfWeek(today, { weekStartsOn: 0 }),
      };
    case "this_week_to_date":
      return {
        start: startOfWeek(today, { weekStartsOn: 0 }),
        end: endOfDay(today),
      };
    case "last_week": {
      const lastWeek = subWeeks(today, 1);
      return {
        start: startOfWeek(lastWeek, { weekStartsOn: 0 }),
        end: endOfWeek(lastWeek, { weekStartsOn: 0 }),
      };
    }
    case "this_month":
      return { start: startOfMonth(today), end: endOfMonth(today) };
    case "this_month_to_date":
      return { start: startOfMonth(today), end: endOfDay(today) };
    case "last_month": {
      const lastMonth = subMonths(today, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    case "this_quarter":
      return { start: startOfQuarter(today), end: endOfQuarter(today) };
    case "this_quarter_to_date":
      return { start: startOfQuarter(today), end: endOfDay(today) };
    case "last_quarter": {
      const lastQuarter = subQuarters(today, 1);
      return {
        start: startOfQuarter(lastQuarter),
        end: endOfQuarter(lastQuarter),
      };
    }
    case "this_year":
      return { start: startOfYear(today), end: endOfYear(today) };
    case "this_year_to_date":
      return { start: startOfYear(today), end: endOfDay(today) };
    case "last_year": {
      const lastYear = subYears(today, 1);
      return { start: startOfYear(lastYear), end: endOfYear(lastYear) };
    }
    case "custom":
    default:
      return undefined;
  }
};

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

/** Parse backend date string (YYYY-MM-DD or ISO) to a local Date for that calendar day only. Use for date pickers so they show the same day as the backend (no timezone rollover). */
const parseBackendDateToLocal = (value?: string | null): Date | undefined => {
  if (!value) return undefined;
  const dateOnly = value.slice(0, 10);
  const [y, m, d] = dateOnly.split("-").map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return undefined;
  return new Date(y, m - 1, d);
};

/** Format backend date string (YYYY-MM-DD or ISO) for display. No timezone conversion — uses backend year/month/day as-is. */
const formatBackendDateForDisplay = (value?: string | null): string | null => {
  if (!value) return null;
  const dateOnly = value.slice(0, 10);
  const [y, m, d] = dateOnly.split("-").map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = monthNames[m - 1];
  if (!month) return null;
  return `${month} ${d}, ${y}`;
};

const buildSubTypeGroups = (accounts: Account[]): SubTypeGroup[] => {
  const subTypeMap = new Map<string, Account[]>();

  accounts.forEach((acc) => {
    const subType = acc.subType || "Other";
    if (!subTypeMap.has(subType)) {
      subTypeMap.set(subType, []);
    }
    subTypeMap.get(subType)!.push(acc);
  });

  return Array.from(subTypeMap.entries())
    .sort((a, b) => {
      const aOrder = getSubTypeOrder(a[0]);
      const bOrder = getSubTypeOrder(b[0]);
      if (aOrder === bOrder) {
        return a[0].localeCompare(b[0]);
      }
      return aOrder - bOrder;
    })
    .map(([subType, accs]) => ({
      subType,
      accounts: accs,
    }));
};

const AccountDrilldownInline = ({
  account,
  initialPreset,
  initialStartDate,
  initialEndDate,
}: {
  account: Account;
  initialPreset: string;
  initialStartDate?: Date;
  initialEndDate?: Date;
}) => {
  const { toast } = useToast();
  const [detailPreset, setDetailPreset] = useState(initialPreset);
  const [detailStartDate, setDetailStartDate] = useState<Date | undefined>(
    initialStartDate
  );
  const [detailEndDate, setDetailEndDate] = useState<Date | undefined>(
    initialEndDate
  );
  const [detailTransactions, setDetailTransactions] = useState<
    ProfitLossTransaction[]
  >([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const lastSuccessKeyRef = useRef<string | null>(null);

  const detailRunningBalances = useMemo(() => {
    return detailTransactions.reduce<number[]>((acc, txn, index) => {
      const prev = index === 0 ? 0 : acc[index - 1];
      acc.push(prev + (txn.amount || 0));
      return acc;
    }, []);
  }, [detailTransactions]);

  const detailTotal = useMemo(() => {
    return detailTransactions.reduce((sum, txn) => sum + (txn.amount || 0), 0);
  }, [detailTransactions]);

  useEffect(() => {
    if (detailPreset === "custom" && (!detailStartDate || !detailEndDate)) {
      return;
    }

    const controller = new AbortController();
    const fetchKey =
      detailPreset === "custom"
        ? `${account.id}|custom|${detailStartDate?.getTime() ?? "na"}|${
            detailEndDate?.getTime() ?? "na"
          }`
        : `${account.id}|preset|${detailPreset}`;

    if (lastSuccessKeyRef.current === fetchKey) {
      return () => controller.abort();
    }

    (async () => {
      try {
        setDetailLoading(true);

        const params: Record<string, string> = { accountId: account.id };
        if (detailPreset !== "custom") {
          params.preset = detailPreset;
        } else if (detailStartDate && detailEndDate) {
          params.startDate = formatDateParam(detailStartDate) as string;
          params.endDate = formatDateParam(detailEndDate) as string;
        }

        const response = await reportAPI.getProfitLoss(params, {
          signal: controller.signal,
        });

        const data = response as ProfitLossTransactionsResponse;
        setDetailTransactions(data.transactions || []);

        const nextStart = parseBackendDateToLocal(data.startDate);
        const nextEnd = parseBackendDateToLocal(data.endDate);
        setDetailStartDate((prev) =>
          prev?.getTime() !== nextStart?.getTime() ? nextStart : prev
        );
        setDetailEndDate((prev) =>
          prev?.getTime() !== nextEnd?.getTime() ? nextEnd : prev
        );

        lastSuccessKeyRef.current = fetchKey;
      } catch (err) {
        const isAbort =
          (err as { name?: string })?.name === "CanceledError" ||
          (err as { name?: string })?.name === "AbortError" ||
          (err as { code?: string })?.code === "ERR_CANCELED";
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
    detailPreset,
    detailStartDate?.getTime(),
    detailEndDate?.getTime(),
    toast,
  ]);

  const handleDetailPresetChange = (value: string) => {
    setDetailPreset(value);
    if (value !== "custom") {
      setDetailStartDate(undefined);
      setDetailEndDate(undefined);
    }
  };

  const handleDetailDateChange = (type: "start" | "end", date?: Date) => {
    setDetailPreset("custom");
    if (type === "start") setDetailStartDate(date);
    else setDetailEndDate(date);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 w-full sm:w-[220px]">
          <label className="text-sm font-medium leading-none text-muted-foreground">
            Account period
          </label>
          <Select value={detailPreset} onValueChange={handleDetailPresetChange}>
            <SelectTrigger className="mt-1 h-8 w-full min-w-0 px-2 text-sm">
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
        <div className="min-w-0 w-full sm:w-[190px]">
          <label className="text-sm font-medium leading-none text-muted-foreground">
            From
          </label>
          <div className="mt-1">
            <DatePicker
              date={detailStartDate}
              setDate={(date) => handleDetailDateChange("start", date)}
              className="h-8 px-2 text-sm max-w-none"
            />
          </div>
        </div>
        <div className="min-w-0 w-full sm:w-[190px]">
          <label className="text-sm font-medium leading-none text-muted-foreground">
            To
          </label>
          <div className="mt-1">
            <DatePicker
              date={detailEndDate}
              setDate={(date) => handleDetailDateChange("end", date)}
              className="h-8 px-2 text-sm max-w-none"
            />
          </div>
        </div>
      </div>

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
              [...Array(3)].map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="px-2 py-1 whitespace-nowrap">
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell className="px-2 py-1 whitespace-nowrap">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="px-2 py-1 whitespace-nowrap">
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell className="px-2 py-1 whitespace-nowrap">
                    <Skeleton className="h-4 w-64" />
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right whitespace-nowrap">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right whitespace-nowrap">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right whitespace-nowrap">
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right whitespace-nowrap">
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
                        className={[
                          "px-2 py-1 text-right whitespace-nowrap font-mono tabular-nums",
                          amountNegative ? "text-red-600" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
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

export const ProfitLoss = () => {
  const { toast } = useToast();
  const [report, setReport] = useState<ProfitLossReportResponse | null>(null);
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
    new Set(PROFIT_LOSS_TYPES)
  );
  const [expandedSubTypes, setExpandedSubTypes] = useState<Set<string>>(
    new Set()
  );

  const [expandedAccountIds, setExpandedAccountIds] = useState<Set<string>>(
    new Set()
  );

  const reportStartDate = useMemo(() => {
    return startDate ?? parseBackendDateToLocal(report?.startDate);
  }, [startDate, report?.startDate]);

  const reportEndDate = useMemo(() => {
    return endDate ?? parseBackendDateToLocal(report?.endDate);
  }, [endDate, report?.endDate]);

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
      if (appliedPreset && appliedPreset !== "custom") {
        params.preset = appliedPreset;
      }
      if (appliedPreset === "custom" && appliedStartDate && appliedEndDate) {
        params.startDate = formatDateParam(appliedStartDate) as string;
        params.endDate = formatDateParam(appliedEndDate) as string;
      }
      if (appliedDisplayBy) {
        params.displayBy = appliedDisplayBy;
      }
      if (appliedComparisonType !== "none") {
        params.comparison = appliedComparisonType;
      }
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

      const data = (await reportAPI.getProfitLoss(
        params
      )) as ProfitLossReportResponse;
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
        description:
          "Please select both Comparison from and Comparison to dates.",
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
      const dates = getPresetDates(value);
      if (dates) {
        setStartDate(dates.start);
        setEndDate(dates.end);
      } else {
        setStartDate(undefined);
        setEndDate(undefined);
      }
    }
  };

  const handleDateChange = (type: "start" | "end", date?: Date) => {
    setPreset("custom");
    if (type === "start") {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
  };

  const toggleType = (type: AccountType) => {
    const next = new Set(expandedTypes);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    setExpandedTypes(next);
  };

  const toggleSubType = (key: string) => {
    const next = new Set(expandedSubTypes);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setExpandedSubTypes(next);
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
    if (groupKey === "total") {
      return report.accountBalances?.[accountId] ?? 0;
    }
    return report.periodBalances?.[accountId]?.[groupKey] ?? 0;
  };

  const getComparisonValue = (accountId: string, groupKey: string) => {
    if (!report || appliedComparisonType === "none") return null;

    if (groupKey === "total") {
      return report.comparisonBalances?.[accountId] ?? null;
    }

    return report.comparisonPeriodBalances?.[accountId]?.[groupKey] ?? null;
  };

  /** Sentinel for "percent change undefined" (e.g. previous = 0, current > 0). */
  const PERCENT_NA = NaN;

  const formatValue = (
    value: number | null,
    mode: "currency" | "percent" = "currency"
  ) => {
    if (value === null) return "—";
    if (mode === "percent" && Number.isNaN(value)) return "N/A";
    if (Number.isNaN(value)) return "—";
    if (mode === "percent") {
      return formatPercent(value);
    }
    return formatCurrency(value);
  };

  const getChangeValue = (
    current: number,
    previous: number | null
  ): number | null => {
    if (previous === null) return null;
    if (comparisonMode === "percent") {
      if (previous === 0) {
        if (current === 0) return 0;
        return PERCENT_NA;
      }
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
      [AccountType.Income]: [],
      [AccountType.Other_Income]: [],
      [AccountType.Cost_of_Goods_Sold]: [],
      [AccountType.Expense]: [],
      [AccountType.Other_Expense]: [],
      [AccountType.Current_Assets]: [],
      [AccountType.Fixed_Assets]: [],
      [AccountType.Current_Liabilities]: [],
      [AccountType.Long_Term_Liabilities]: [],
      [AccountType.Equity]: [],
    };

    report?.accounts.forEach((account) => {
      grouped[account.type] = grouped[account.type] || [];
      grouped[account.type].push(account);
    });

    return grouped;
  }, [report]);

  const buildRows = () => {
    const rows: ReportRow[] = [];

    const addTypeSection = (type: AccountType) => {
      const accounts = accountsByType[type] || [];
      if (!accounts.length) return;
      const sectionLabel = formatAccountType(type);
      rows.push({
        id: `section-${type}`,
        type: "section",
        label: sectionLabel,
        level: 0,
        accounts,
      });

      buildSubTypeGroups(accounts).forEach((subGroup) => {
        const subKey = `${type}-${subGroup.subType}`;
        const subtypeLabel = formatAccountType(subGroup.subType);
        const isRedundantSubtype = subtypeLabel === sectionLabel;

        if (!isRedundantSubtype) {
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
            level: isRedundantSubtype ? 1 : 2,
            account,
          });
        });
      });
    };

  
    addTypeSection(AccountType.Income);
    rows.push({
      id: "total-income",
      type: "total",
      label: "Total Income",
      level: 0,
      accounts: accountsByType[AccountType.Income],
    });

    addTypeSection(AccountType.Cost_of_Goods_Sold);
    rows.push({
      id: "total-cogs",
      type: "total",
      label: "Total Cost of Goods Sold",
      level: 0,
      accounts: accountsByType[AccountType.Cost_of_Goods_Sold],
    });

    rows.push({
      id: "gross-profit",
      type: "summary",
      label: "Gross Profit",
      level: 0,
      accounts: [
        ...(accountsByType[AccountType.Income] || []),
        ...(accountsByType[AccountType.Cost_of_Goods_Sold] || []),
      ],
    });

    addTypeSection(AccountType.Expense);
    rows.push({
      id: "total-expense",
      type: "total",
      label: "Total Expenses",
      level: 0,
      accounts: accountsByType[AccountType.Expense],
    });

    addTypeSection(AccountType.Other_Income);
    rows.push({
      id: "total-other-income",
      type: "total",
      label: "Total Other Income",
      level: 0,
      accounts: accountsByType[AccountType.Other_Income],
    });

    addTypeSection(AccountType.Other_Expense);
    rows.push({
      id: "total-other-expense",
      type: "total",
      label: "Total Other Expense",
      level: 0,
      accounts: accountsByType[AccountType.Other_Expense],
    });

    rows.push({
      id: "net-income",
      type: "summary",
      label: "Net Income",
      level: 0,
      accounts: [
        ...(accountsByType[AccountType.Income] || []),
        ...(accountsByType[AccountType.Other_Income] || []),
        ...(accountsByType[AccountType.Cost_of_Goods_Sold] || []),
        ...(accountsByType[AccountType.Expense] || []),
        ...(accountsByType[AccountType.Other_Expense] || []),
      ],
    });

    return rows;
  };

  const rows = useMemo(buildRows, [accountsByType]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (row.type === "section") return true;
      if (row.type === "subtype") {
        const parentType = row.id
          .replace("subtype-", "")
          .split("-")[0] as AccountType;
        return expandedTypes.has(parentType);
      }
      if (row.type === "account") {
        const parentType = row.account?.type;
        if (parentType && !expandedTypes.has(parentType)) return false;
        if (row.account?.subType && parentType) {
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

  const sectionRowIds = useMemo(() => {
    return visibleRows
      .filter((row) => row.type === "section")
      .map((row) => row.id);
  }, [visibleRows]);

  const sectionRowIdsWithSpacer = useMemo(() => {
    return new Set(sectionRowIds.slice(1));
  }, [sectionRowIds]);

  const mainColSpan =
    appliedComparisonType === "none"
      ? 1 + periodGroups.length
      : 1 + periodGroups.length * 3;

  const renderRowValues = (row: ReportRow) => {
    return periodGroups.map((group, i) => {
      const leftBorder = i > 0 ? "border-l border-border" : "";
      const currentValue = row.account
        ? getAccountValue(row.account.id, group.key)
        : row.type === "summary"
        ? null
        : sumAccounts(row.accounts || [], group.key);

      const comparisonValue =
        appliedComparisonType === "none"
          ? null
          : row.account
          ? getComparisonValue(row.account.id, group.key)
          : row.type === "summary"
          ? null
          : sumAccounts(row.accounts || [], group.key, true);

      let computedCurrent = currentValue ?? 0;
      let computedComparison = comparisonValue;

      if (row.id === "gross-profit") {
        const income = sumAccounts(
          accountsByType[AccountType.Income],
          group.key
        );
        const cogs = sumAccounts(
          accountsByType[AccountType.Cost_of_Goods_Sold],
          group.key
        );
        computedCurrent = income + cogs;
        if (appliedComparisonType !== "none") {
          const incomeComp = sumAccounts(
            accountsByType[AccountType.Income],
            group.key,
            true
          );
          const cogsComp = sumAccounts(
            accountsByType[AccountType.Cost_of_Goods_Sold],
            group.key,
            true
          );
          computedComparison = incomeComp + cogsComp;
        }
      }

      if (row.id === "net-income") {
        const income = sumAccounts(
          accountsByType[AccountType.Income],
          group.key
        );
        const otherIncome = sumAccounts(
          accountsByType[AccountType.Other_Income],
          group.key
        );
        const cogs = sumAccounts(
          accountsByType[AccountType.Cost_of_Goods_Sold],
          group.key
        );
        const expense = sumAccounts(
          accountsByType[AccountType.Expense],
          group.key
        );
        const otherExpense = sumAccounts(
          accountsByType[AccountType.Other_Expense],
          group.key
        );
        computedCurrent = income + otherIncome + cogs + expense + otherExpense;

        if (appliedComparisonType !== "none") {
          const incomeComp = sumAccounts(
            accountsByType[AccountType.Income],
            group.key,
            true
          );
          const otherIncomeComp = sumAccounts(
            accountsByType[AccountType.Other_Income],
            group.key,
            true
          );
          const cogsComp = sumAccounts(
            accountsByType[AccountType.Cost_of_Goods_Sold],
            group.key,
            true
          );
          const expenseComp = sumAccounts(
            accountsByType[AccountType.Expense],
            group.key,
            true
          );
          const otherExpenseComp = sumAccounts(
            accountsByType[AccountType.Other_Expense],
            group.key,
            true
          );
          computedComparison =
            incomeComp +
            otherIncomeComp +
            cogsComp +
            expenseComp +
            otherExpenseComp;
        }
      }

      const changeValue =
        appliedComparisonType === "none"
          ? null
          : getChangeValue(computedCurrent, computedComparison);

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

  const handleExportCsv = () => {
    if (!report) return;

    const headers: string[] = ["Account"];
    periodGroups.forEach((group) => {
      if (appliedComparisonType === "none") {
        headers.push(group.label);
      } else {
        headers.push(`${group.label} - Current`);
        headers.push(`${group.label} - Previous`);
        headers.push(`${group.label} - Change`);
      }
    });

    const allRows = rows.map((row) => {
      const values: string[] = [row.label];
      periodGroups.forEach((group) => {
        const currentValue = row.account
          ? getAccountValue(row.account.id, group.key)
          : row.type === "summary"
          ? null
          : sumAccounts(row.accounts || [], group.key);

        const comparisonValue =
          appliedComparisonType === "none"
            ? null
            : row.account
            ? getComparisonValue(row.account.id, group.key)
            : row.type === "summary"
            ? null
            : sumAccounts(row.accounts || [], group.key, true);

        let computedCurrent = currentValue ?? 0;
        let computedComparison = comparisonValue;

        if (row.id === "gross-profit") {
          const income = sumAccounts(
            accountsByType[AccountType.Income],
            group.key
          );
          const cogs = sumAccounts(
            accountsByType[AccountType.Cost_of_Goods_Sold],
            group.key
          );
          computedCurrent = income + cogs;
          if (appliedComparisonType !== "none") {
            const incomeComp = sumAccounts(
              accountsByType[AccountType.Income],
              group.key,
              true
            );
            const cogsComp = sumAccounts(
              accountsByType[AccountType.Cost_of_Goods_Sold],
              group.key,
              true
            );
            computedComparison = incomeComp + cogsComp;
          }
        }

        if (row.id === "net-income") {
          const income = sumAccounts(
            accountsByType[AccountType.Income],
            group.key
          );
          const otherIncome = sumAccounts(
            accountsByType[AccountType.Other_Income],
            group.key
          );
          const cogs = sumAccounts(
            accountsByType[AccountType.Cost_of_Goods_Sold],
            group.key
          );
          const expense = sumAccounts(
            accountsByType[AccountType.Expense],
            group.key
          );
          const otherExpense = sumAccounts(
            accountsByType[AccountType.Other_Expense],
            group.key
          );
          computedCurrent =
            income + otherIncome + cogs + expense + otherExpense;

          if (appliedComparisonType !== "none") {
            const incomeComp = sumAccounts(
              accountsByType[AccountType.Income],
              group.key,
              true
            );
            const otherIncomeComp = sumAccounts(
              accountsByType[AccountType.Other_Income],
              group.key,
              true
            );
            const cogsComp = sumAccounts(
              accountsByType[AccountType.Cost_of_Goods_Sold],
              group.key,
              true
            );
            const expenseComp = sumAccounts(
              accountsByType[AccountType.Expense],
              group.key,
              true
            );
            const otherExpenseComp = sumAccounts(
              accountsByType[AccountType.Other_Expense],
              group.key,
              true
            );
            computedComparison =
              incomeComp +
              otherIncomeComp +
              cogsComp +
              expenseComp +
              otherExpenseComp;
          }
        }

        const changeValue = getChangeValue(computedCurrent, computedComparison);

        if (appliedComparisonType === "none") {
          values.push(computedCurrent.toFixed(2));
        } else {
          values.push(computedCurrent.toFixed(2));
          values.push((computedComparison ?? 0).toFixed(2));
          const changeDisplay =
            changeValue === null
              ? ""
              : Number.isNaN(changeValue)
              ? comparisonMode === "percent"
                ? "N/A"
                : ""
              : changeValue.toFixed(2);
          values.push(changeDisplay);
        }
      });
      return values;
    });

    const csvContent = [headers, ...allRows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `profit-loss-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-6">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:flex-wrap">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-9 w-28 shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
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
                  {[...Array(12)].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell
                        className={
                          index % 3 === 1
                            ? "pl-6"
                            : index % 3 === 2
                            ? "pl-10"
                            : undefined
                        }
                      >
                        <Skeleton
                          className={`h-5 ${
                            index % 3 === 0
                              ? "w-48"
                              : index % 3 === 1
                              ? "w-36"
                              : "w-32"
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
    <div className="w-full min-w-0 max-w-full space-y-6">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:flex-wrap">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl break-words">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                Profit and Loss
              </CardTitle>
              {report?.startDate && report?.endDate && (
                <p className="text-sm text-muted-foreground mt-1 break-words">
                  {formatBackendDateForDisplay(report.startDate)} -{" "}
                  {formatBackendDateForDisplay(report.endDate)}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={handleExportCsv}
              className="gap-2 w-full sm:w-auto shrink-0"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="min-w-0 space-y-6">
          <div className="grid min-w-0 max-w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="min-w-0">
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
                className="mt-1 w-full"
              />
            </div>
            <div className="min-w-0">
              <label className="text-sm font-medium">To</label>
              <DatePicker
                date={reportEndDate}
                setDate={(date) => handleDateChange("end", date)}
                className="mt-1 w-full"
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
              <div className="min-w-0">
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
                <div className="min-w-0">
                  <label className="text-sm font-medium">Comparison from</label>
                  <DatePicker
                    date={comparisonStartDate}
                    setDate={(date) => setComparisonStartDate(date)}
                    className="mt-1 w-full"
                  />
                </div>
                <div className="min-w-0">
                  <label className="text-sm font-medium">Comparison to</label>
                  <DatePicker
                    date={comparisonEndDate}
                    setDate={(date) => setComparisonEndDate(date)}
                    className="mt-1 w-full"
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
                          ? "h-10 px-2 sm:px-3 min-w-[200px] sm:min-w-[280px] sticky left-0 z-20 bg-background"
                          : "h-10 px-2 sm:px-3 min-w-[200px] sm:min-w-[280px]"
                      }
                    >
                      Account
                    </TableHead>
                    {periodGroups.map((group) => (
                      <TableHead
                        key={group.key}
                        className="h-10 px-2 text-right sm:px-3"
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
                            ? "h-10 px-2 sm:px-3 min-w-[200px] sm:min-w-[280px] sticky left-0 z-20 bg-background"
                            : "h-10 px-2 sm:px-3 min-w-[200px] sm:min-w-[280px]"
                        }
                      >
                        Account
                      </TableHead>
                      {periodGroups.map((group) => (
                        <TableHead
                          key={group.key}
                          colSpan={3}
                          className="h-10 px-2 sm:px-3 text-center"
                        >
                          {group.displayLabel}
                        </TableHead>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableHead
                        className={
                          appliedDisplayBy !== "total"
                            ? "h-10 px-2 sm:px-3 min-w-[200px] sm:min-w-[280px] sticky left-0 z-20 bg-background"
                            : "h-10 px-2 sm:px-3"
                        }
                      />
                      {periodGroups.map((group) => {
                        const isTotalGroup = group.key === "total";
                        const comparisonEntry =
                          report?.comparisonPeriodBreakdown?.find(
                            (entry) => entry.mainLabel === group.label
                          );
                        const previousLabel = comparisonEntry
                          ? `${comparisonEntry.label} (PP)`
                          : "Previous (PP)";
                        const changeLabel =
                          comparisonMode === "percent"
                            ? "% Change (PP)"
                            : "$ Change (PP)";

                        const firstSubLabel = isTotalGroup
                          ? "Total"
                          : "CURRENT";
                        const secondSubLabel = isTotalGroup
                          ? "Previous Total"
                          : previousLabel;

                        return (
                          <Fragment key={group.key}>
                            <TableHead className="h-9 text-right px-3 py-1.5 text-xs uppercase text-muted-foreground">
                              {firstSubLabel}
                            </TableHead>
                            <TableHead className="h-9 text-right px-3 py-1.5 text-xs uppercase text-muted-foreground border-l border-border">
                              {secondSubLabel}
                            </TableHead>
                            <TableHead className="h-9 text-right px-3 py-1.5 text-xs uppercase text-muted-foreground border-l border-border">
                              {changeLabel}
                            </TableHead>
                          </Fragment>
                        );
                      })}
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
                    if (isAccountRow) {
                      toggleAccount(row.account!.id);
                    }
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
                          className={`${indentClass} pr-2 sm:pr-3 py-1.5 min-w-0 ${
                            appliedDisplayBy !== "total"
                              ? "sticky left-0 z-10 bg-background border-r border-border"
                              : ""
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2">
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

                      {isAccountRowExpanded && (
                        <TableRow>
                          <TableCell
                            colSpan={
                              appliedComparisonType === "none"
                                ? 1 + periodGroups.length
                                : 1 + periodGroups.length * 3
                            }
                            className="min-w-0 overflow-hidden p-0"
                          >
                            <div className="min-w-0 border-t bg-muted/10 p-2 sm:p-3">
                              <AccountDrilldownInline
                                account={row.account!}
                                initialPreset={preset}
                                initialStartDate={reportStartDate}
                                initialEndDate={reportEndDate}
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
