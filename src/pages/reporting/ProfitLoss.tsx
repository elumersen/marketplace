import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { reportAPI, getErrorMessage } from '@/lib/api';
import {
  Account,
  AccountType,
  ProfitLossReportResponse,
  ProfitLossTransaction,
  ReportDisplayBy,
} from '@/types/api.types';
import { getSubTypeOrder } from '@/lib/accountOrdering';
import { ChevronDown, ChevronRight, Download, TrendingUp } from 'lucide-react';

interface SubTypeGroup {
  subType: string;
  accounts: Account[];
}

interface ReportRow {
  id: string;
  type: 'section' | 'subtype' | 'account' | 'total' | 'summary';
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
  { value: 'custom', label: 'Custom dates' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This week' },
  { value: 'this_week_to_date', label: 'This week to date' },
  { value: 'this_month', label: 'This month' },
  { value: 'this_month_to_date', label: 'This month to date' },
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'this_quarter_to_date', label: 'This quarter to date' },
  { value: 'this_year', label: 'This year' },
  { value: 'this_year_to_date', label: 'This year to date' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_week', label: 'Last week' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_quarter', label: 'Last quarter' },
  { value: 'last_year', label: 'Last year' },
];

const DISPLAY_BY_OPTIONS: { value: ReportDisplayBy; label: string }[] = [
  { value: 'total', label: 'Total' },
  { value: 'months', label: 'Months' },
  { value: 'quarters', label: 'Quarters' },
  { value: 'years', label: 'Years' },
];

const COMPARISON_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'previous_period', label: 'Previous period' },
  { value: 'custom_period', label: 'Custom period' },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

const formatAccountType = (type: string) =>
  type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

const formatDateParam = (date?: Date) =>
  date ? format(date, 'yyyy-MM-dd') : undefined;

const parseDate = (value?: string | null) =>
  value ? new Date(value) : undefined;

const buildSubTypeGroups = (accounts: Account[]): SubTypeGroup[] => {
  const subTypeMap = new Map<string, Account[]>();

  accounts.forEach((acc) => {
    const subType = acc.subType || 'Other';
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

export const ProfitLoss = () => {
  const { toast } = useToast();
  const [report, setReport] = useState<ProfitLossReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState('this_year_to_date');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [displayBy, setDisplayBy] = useState<ReportDisplayBy>('total');
  const [comparisonType, setComparisonType] = useState('none');
  const [comparisonStartDate, setComparisonStartDate] = useState<Date | undefined>();
  const [comparisonEndDate, setComparisonEndDate] = useState<Date | undefined>();
  const [comparisonMode, setComparisonMode] = useState<'amount' | 'percent'>('amount');
  const [expandedTypes, setExpandedTypes] = useState<Set<AccountType>>(new Set(PROFIT_LOSS_TYPES));
  const [expandedSubTypes, setExpandedSubTypes] = useState<Set<string>>(new Set());
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [detailTransactions, setDetailTransactions] = useState<ProfitLossTransaction[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPreset, setDetailPreset] = useState('custom');
  const [detailStartDate, setDetailStartDate] = useState<Date | undefined>();
  const [detailEndDate, setDetailEndDate] = useState<Date | undefined>();

  const loadReport = async () => {
    if (preset === 'custom' && (!startDate || !endDate)) {
      return;
    }

    if (comparisonType === 'custom_period' && (!comparisonStartDate || !comparisonEndDate)) {
      return;
    }

    try {
      setLoading(true);

      const params: Record<string, string> = {};
      if (preset && preset !== 'custom') {
        params.preset = preset;
      }
      if (preset === 'custom' && startDate && endDate) {
        params.startDate = formatDateParam(startDate) as string;
        params.endDate = formatDateParam(endDate) as string;
      }
      if (displayBy) {
        params.displayBy = displayBy;
      }
      if (comparisonType !== 'none') {
        params.comparison = comparisonType;
      }
      if (comparisonType === 'custom_period' && comparisonStartDate && comparisonEndDate) {
        params.comparisonStartDate = formatDateParam(comparisonStartDate) as string;
        params.comparisonEndDate = formatDateParam(comparisonEndDate) as string;
      }

      const data = (await reportAPI.getProfitLoss(params)) as ProfitLossReportResponse;
      setReport(data);
      if (preset !== 'custom' && data.startDate && data.endDate) {
        const nextStart = parseDate(data.startDate);
        const nextEnd = parseDate(data.endDate);
        setStartDate((prev) => {
          if (!nextStart) return prev;
          if (prev && prev.getTime() === nextStart.getTime()) return prev;
          return nextStart;
        });
        setEndDate((prev) => {
          if (!nextEnd) return prev;
          if (prev && prev.getTime() === nextEnd.getTime()) return prev;
          return nextEnd;
        });
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDetailTransactions = async (account: Account, signal?: AbortSignal) => {
    if (detailPreset === 'custom' && (!detailStartDate || !detailEndDate)) {
      return;
    }

    try {
      setDetailLoading(true);
      const params: Record<string, string> = { accountId: account.id };
      if (detailPreset !== 'custom') {
        params.preset = detailPreset;
      } else if (detailStartDate && detailEndDate) {
        params.startDate = formatDateParam(detailStartDate) as string;
        params.endDate = formatDateParam(detailEndDate) as string;
      }

      const response = await reportAPI.getProfitLoss(params, signal ? { signal } : undefined);
      const data = response as { transactions?: ProfitLossTransaction[]; startDate: string; endDate: string };
      setDetailTransactions(data.transactions || []);
      // Only update date state when value actually changed to avoid re-triggering the effect (and a refetch/blink)
      const nextStart = parseDate(data.startDate);
      const nextEnd = parseDate(data.endDate);
      setDetailStartDate((prev) => (prev?.getTime() !== nextStart?.getTime() ? nextStart : prev));
      setDetailEndDate((prev) => (prev?.getTime() !== nextEnd?.getTime() ? nextEnd : prev));
    } catch (err) {
      const isAbort = (err as { name?: string })?.name === 'CanceledError' || (err as { code?: string })?.code === 'ERR_CANCELED';
      if (!isAbort) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: getErrorMessage(err),
        });
      }
    } finally {
      setDetailLoading(false);
    }
  };

  // Only depend on startDate/endDate when preset is 'custom' to avoid refetch when we sync dates from report response
  useEffect(() => {
    if (selectedAccount) return;
    loadReport();
  }, [
    preset,
    displayBy,
    comparisonType,
    comparisonStartDate,
    comparisonEndDate,
    selectedAccount,
    ...(preset === 'custom' ? [startDate, endDate] : []),
  ]);

  useEffect(() => {
    if (!selectedAccount) return;
    const controller = new AbortController();
    loadDetailTransactions(selectedAccount, controller.signal);
    return () => controller.abort();
  }, [selectedAccount, detailPreset, detailStartDate, detailEndDate]);

  const handlePresetChange = (value: string) => {
    setPreset(value);
    if (value !== 'custom') {
      setStartDate(undefined);
      setEndDate(undefined);
    }
  };

  const handleDateChange = (type: 'start' | 'end', date?: Date) => {
    setPreset('custom');
    if (type === 'start') {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
  };

  const handleDetailPresetChange = (value: string) => {
    setDetailPreset(value);
    if (value !== 'custom') {
      setDetailStartDate(undefined);
      setDetailEndDate(undefined);
    }
  };

  const handleDetailDateChange = (type: 'start' | 'end', date?: Date) => {
    setDetailPreset('custom');
    if (type === 'start') {
      setDetailStartDate(date);
    } else {
      setDetailEndDate(date);
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

  const reportStartDate = useMemo(() => parseDate(report?.startDate), [report]);
  const reportEndDate = useMemo(() => parseDate(report?.endDate), [report]);

  const periodGroups = useMemo(() => {
    if (!report) return [];
    const groups: Array<{ key: string; label: string; index: number }> = [];
    if (displayBy !== 'total' && report.periodBreakdown) {
      report.periodBreakdown.forEach((period, index) => {
        groups.push({ key: period.label, label: period.label, index });
      });
      groups.push({ key: 'total', label: 'Total', index: -1 });
      return groups;
    }
    return [{ key: 'total', label: 'Total', index: -1 }];
  }, [report, displayBy]);

  const getAccountValue = (accountId: string, groupKey: string) => {
    if (!report) return 0;
    if (groupKey === 'total') {
      return report.accountBalances?.[accountId] ?? 0;
    }
    return report.periodBalances?.[accountId]?.[groupKey] ?? 0;
  };

  const getComparisonValue = (accountId: string, groupKey: string) => {
    if (!report || comparisonType === 'none') return null;

    if (groupKey === 'total') {
      return report.comparisonBalances?.[accountId] ?? null;
    }

    return report.comparisonPeriodBalances?.[accountId]?.[groupKey] ?? null;
  };

  const formatValue = (value: number | null, mode: 'currency' | 'percent' = 'currency') => {
    if (value === null || Number.isNaN(value)) {
      return '—';
    }
    if (mode === 'percent') {
      return formatPercent(value);
    }
    return formatCurrency(value);
  };

  const getChangeValue = (current: number, previous: number | null) => {
    if (previous === null) return null;
    if (comparisonMode === 'percent') {
      if (previous === 0) return null;
      return ((current - previous) / Math.abs(previous)) * 100;
    }
    return current - previous;
  };

  const sumAccounts = (accounts: Account[] = [], groupKey: string, useComparison = false) =>
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
        type: 'section',
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
            type: 'subtype',
            label: subtypeLabel,
            level: 1,
            accounts: subGroup.accounts,
          });
        }

        subGroup.accounts.forEach((account) => {
          rows.push({
            id: account.id,
            type: 'account',
            label: account.code ? `${account.code} - ${account.name}` : account.name,
            level: isRedundantSubtype ? 1 : 2,
            account,
          });
        });
      });
    };

    // Order per requirements: Income → COGS → Gross Profit → Expenses → Other Income → Other Expense → Net Income
    addTypeSection(AccountType.Income);
    rows.push({
      id: 'total-income',
      type: 'total',
      label: 'Total Income',
      level: 0,
      accounts: accountsByType[AccountType.Income],
    });

    addTypeSection(AccountType.Cost_of_Goods_Sold);
    rows.push({
      id: 'total-cogs',
      type: 'total',
      label: 'Total Cost of Goods Sold',
      level: 0,
      accounts: accountsByType[AccountType.Cost_of_Goods_Sold],
    });

    rows.push({
      id: 'gross-profit',
      type: 'summary',
      label: 'Gross Profit',
      level: 0,
      accounts: [
        ...(accountsByType[AccountType.Income] || []),
        ...(accountsByType[AccountType.Cost_of_Goods_Sold] || []),
      ],
    });

    addTypeSection(AccountType.Expense);
    rows.push({
      id: 'total-expense',
      type: 'total',
      label: 'Total Expenses',
      level: 0,
      accounts: accountsByType[AccountType.Expense],
    });

    addTypeSection(AccountType.Other_Income);
    rows.push({
      id: 'total-other-income',
      type: 'total',
      label: 'Total Other Income',
      level: 0,
      accounts: accountsByType[AccountType.Other_Income],
    });

    addTypeSection(AccountType.Other_Expense);
    rows.push({
      id: 'total-other-expense',
      type: 'total',
      label: 'Total Other Expense',
      level: 0,
      accounts: accountsByType[AccountType.Other_Expense],
    });

    rows.push({
      id: 'net-income',
      type: 'summary',
      label: 'Net Income',
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
      if (row.type === 'section') return true;
      if (row.type === 'subtype') {
        const parentType = row.id.replace('subtype-', '').split('-')[0] as AccountType;
        return expandedTypes.has(parentType);
      }
      if (row.type === 'account') {
        const parentType = row.account?.type;
        if (parentType && !expandedTypes.has(parentType)) return false;
        if (row.account?.subType && parentType) {
          const subKey = `${parentType}-${row.account.subType}`;
          if (formatAccountType(row.account.subType) === formatAccountType(parentType)) return true;
          return expandedSubTypes.has(subKey);
        }
        return true;
      }
      return true;
    });
  }, [rows, expandedTypes, expandedSubTypes]);

  const renderRowValues = (row: ReportRow) => {
    return periodGroups.map((group) => {
      const currentValue = row.account
        ? getAccountValue(row.account.id, group.key)
        : row.type === 'summary'
          ? null
          : sumAccounts(row.accounts || [], group.key);

      const comparisonValue = comparisonType === 'none'
        ? null
        : row.account
          ? getComparisonValue(row.account.id, group.key)
          : row.type === 'summary'
            ? null
            : sumAccounts(row.accounts || [], group.key, true);

      let computedCurrent = currentValue ?? 0;
      let computedComparison = comparisonValue;

      if (row.id === 'gross-profit') {
        const income = sumAccounts(accountsByType[AccountType.Income], group.key);
        const cogs = sumAccounts(accountsByType[AccountType.Cost_of_Goods_Sold], group.key);
        computedCurrent = income - cogs;
        if (comparisonType !== 'none') {
          const incomeComp = sumAccounts(accountsByType[AccountType.Income], group.key, true);
          const cogsComp = sumAccounts(accountsByType[AccountType.Cost_of_Goods_Sold], group.key, true);
          computedComparison = incomeComp - cogsComp;
        }
      }

      if (row.id === 'net-income') {
        const income = sumAccounts(accountsByType[AccountType.Income], group.key);
        const otherIncome = sumAccounts(accountsByType[AccountType.Other_Income], group.key);
        const cogs = sumAccounts(accountsByType[AccountType.Cost_of_Goods_Sold], group.key);
        const expense = sumAccounts(accountsByType[AccountType.Expense], group.key);
        const otherExpense = sumAccounts(accountsByType[AccountType.Other_Expense], group.key);
        computedCurrent = income + otherIncome - cogs - expense - otherExpense;

        if (comparisonType !== 'none') {
          const incomeComp = sumAccounts(accountsByType[AccountType.Income], group.key, true);
          const otherIncomeComp = sumAccounts(accountsByType[AccountType.Other_Income], group.key, true);
          const cogsComp = sumAccounts(accountsByType[AccountType.Cost_of_Goods_Sold], group.key, true);
          const expenseComp = sumAccounts(accountsByType[AccountType.Expense], group.key, true);
          const otherExpenseComp = sumAccounts(accountsByType[AccountType.Other_Expense], group.key, true);
          computedComparison = incomeComp + otherIncomeComp - cogsComp - expenseComp - otherExpenseComp;
        }
      }

      const changeValue = comparisonType === 'none'
        ? null
        : getChangeValue(computedCurrent, computedComparison);

      if (comparisonType === 'none') {
        return (
          <TableCell key={`${row.id}-${group.key}`} className="text-right font-mono text-sm">
            {formatValue(computedCurrent)}
          </TableCell>
        );
      }

      return (
        <TableCell key={`${row.id}-${group.key}`} className="p-0">
          <div className="grid grid-cols-3">
            <div className="px-3 py-2 text-right font-mono text-sm">
              {formatValue(computedCurrent)}
            </div>
            <div className="px-3 py-2 text-right font-mono text-sm text-muted-foreground">
              {formatValue(computedComparison)}
            </div>
            <div className="px-3 py-2 text-right font-mono text-sm">
              {formatValue(changeValue, comparisonMode === 'percent' ? 'percent' : 'currency')}
            </div>
          </div>
        </TableCell>
      );
    });
  };

  const handleExportCsv = () => {
    if (!report) return;

    const headers: string[] = ['Account'];
    periodGroups.forEach((group) => {
      if (comparisonType === 'none') {
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
          : row.type === 'summary'
            ? null
            : sumAccounts(row.accounts || [], group.key);

        const comparisonValue = comparisonType === 'none'
          ? null
          : row.account
            ? getComparisonValue(row.account.id, group.key)
            : row.type === 'summary'
              ? null
              : sumAccounts(row.accounts || [], group.key, true);

        let computedCurrent = currentValue ?? 0;
        let computedComparison = comparisonValue;

        if (row.id === 'gross-profit') {
          const income = sumAccounts(accountsByType[AccountType.Income], group.key);
          const cogs = sumAccounts(accountsByType[AccountType.Cost_of_Goods_Sold], group.key);
          computedCurrent = income - cogs;
          if (comparisonType !== 'none') {
            const incomeComp = sumAccounts(accountsByType[AccountType.Income], group.key, true);
            const cogsComp = sumAccounts(accountsByType[AccountType.Cost_of_Goods_Sold], group.key, true);
            computedComparison = incomeComp - cogsComp;
          }
        }

        if (row.id === 'net-income') {
          const income = sumAccounts(accountsByType[AccountType.Income], group.key);
          const otherIncome = sumAccounts(accountsByType[AccountType.Other_Income], group.key);
          const cogs = sumAccounts(accountsByType[AccountType.Cost_of_Goods_Sold], group.key);
          const expense = sumAccounts(accountsByType[AccountType.Expense], group.key);
          const otherExpense = sumAccounts(accountsByType[AccountType.Other_Expense], group.key);
          computedCurrent = income + otherIncome - cogs - expense - otherExpense;

          if (comparisonType !== 'none') {
            const incomeComp = sumAccounts(accountsByType[AccountType.Income], group.key, true);
            const otherIncomeComp = sumAccounts(accountsByType[AccountType.Other_Income], group.key, true);
            const cogsComp = sumAccounts(accountsByType[AccountType.Cost_of_Goods_Sold], group.key, true);
            const expenseComp = sumAccounts(accountsByType[AccountType.Expense], group.key, true);
            const otherExpenseComp = sumAccounts(accountsByType[AccountType.Other_Expense], group.key, true);
            computedComparison = incomeComp + otherIncomeComp - cogsComp - expenseComp - otherExpenseComp;
          }
        }

        if (comparisonType === 'none') {
          values.push(computedCurrent.toFixed(2));
        } else {
          const changeValue = getChangeValue(computedCurrent, computedComparison);
          values.push(computedCurrent.toFixed(2));
          values.push((computedComparison ?? 0).toFixed(2));
          values.push(changeValue === null ? '' : changeValue.toFixed(2));
        }
      });
      return values;
    });

    const csvContent = [headers, ...allRows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `profit-loss-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAccountClick = (account: Account) => {
    setSelectedAccount(account);
    setDetailPreset(preset);
    setDetailStartDate(reportStartDate);
    setDetailEndDate(reportEndDate);
  };

  if (selectedAccount) {
    const runningBalances = detailTransactions.reduce<number[]>((acc, txn, index) => {
      const prev = index === 0 ? 0 : acc[index - 1];
      acc.push(prev + (txn.amount || 0));
      return acc;
    }, []);

    return (
      <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 space-y-6 min-w-0">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:flex-wrap">
              <div className="min-w-0">
                <Button variant="ghost" className="px-0 text-sm -ml-1" onClick={() => setSelectedAccount(null)}>
                  ← Back to summary report
                </Button>
                <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl break-words mt-1">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                  {selectedAccount.name}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-start">
              <div className="min-w-0 space-y-1.5">
                <label className="text-sm font-medium block">Report period</label>
                <Select value={detailPreset} onValueChange={handleDetailPresetChange}>
                  <SelectTrigger className="w-full min-w-0 h-9">
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
              <div className="min-w-0 space-y-1.5">
                <label className="text-sm font-medium block">From</label>
                <div className="w-full min-w-0 [&_button]:h-9">
                  <DatePicker date={detailStartDate} setDate={(date) => handleDetailDateChange('start', date)} />
                </div>
              </div>
              <div className="min-w-0 space-y-1.5">
                <label className="text-sm font-medium block">To</label>
                <div className="w-full min-w-0 [&_button]:h-9">
                  <DatePicker date={detailEndDate} setDate={(date) => handleDetailDateChange('end', date)} />
                </div>
              </div>
            </div>

            {detailLoading ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Entry #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(6)].map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Entry #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailTransactions.map((txn, index) => (
                      <TableRow key={txn.id}>
                        <TableCell>{format(new Date(txn.date), 'MM/dd/yyyy')}</TableCell>
                        <TableCell className="capitalize">{txn.type.replace(/_/g, ' ')}</TableCell>
                        <TableCell>{txn.entryNumber || '—'}</TableCell>
                        <TableCell>{txn.description || '—'}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(txn.debit || 0)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(txn.credit || 0)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(txn.amount || 0)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(runningBalances[index] || 0)}</TableCell>
                      </TableRow>
                    ))}
                    {detailTransactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                          No transactions for this period.
                        </TableCell>
                      </TableRow>
                    )}
                    {detailTransactions.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-right font-semibold">
                          Total for {selectedAccount.name}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(detailTransactions.reduce((sum, txn) => sum + (txn.amount || 0), 0))}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 space-y-6 min-w-0">
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
                      <TableCell className={index % 3 === 1 ? 'pl-6' : index % 3 === 2 ? 'pl-10' : undefined}>
                        <Skeleton className={`h-5 ${index % 3 === 0 ? 'w-48' : index % 3 === 1 ? 'w-36' : 'w-32'}`} />
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
      <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No report data available.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 space-y-6 min-w-0">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:flex-wrap">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl break-words">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                Profit and Loss
              </CardTitle>
              {reportStartDate && reportEndDate && (
                <p className="text-sm text-muted-foreground mt-1 break-words">
                  {format(reportStartDate, 'MMMM d, yyyy')} - {format(reportEndDate, 'MMMM d, yyyy')}
                </p>
              )}
            </div>
            <Button variant="outline" onClick={handleExportCsv} className="gap-2 w-full sm:w-auto shrink-0">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
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
              <DatePicker date={startDate} setDate={(date) => handleDateChange('start', date)} />
            </div>
            <div className="min-w-0">
              <label className="text-sm font-medium">To</label>
              <DatePicker date={endDate} setDate={(date) => handleDateChange('end', date)} />
            </div>
            <div className="min-w-0">
              <label className="text-sm font-medium">Display columns by</label>
              <Select value={displayBy} onValueChange={(value) => setDisplayBy(value as ReportDisplayBy)}>
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
            {comparisonType !== 'none' && (
              <div className="min-w-0 sm:col-span-2 md:col-span-1">
                <label className="text-sm font-medium">Change type</label>
                <Select value={comparisonMode} onValueChange={(value) => setComparisonMode(value as 'amount' | 'percent')}>
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
            {comparisonType === 'custom_period' && (
              <>
                <div className="min-w-0 lg:col-start-3">
                  <label className="text-sm font-medium">Comparison from</label>
                  <DatePicker date={comparisonStartDate} setDate={(date) => setComparisonStartDate(date)} />
                </div>
                <div className="min-w-0 lg:col-start-4">
                  <label className="text-sm font-medium">Comparison to</label>
                  <DatePicker date={comparisonEndDate} setDate={(date) => setComparisonEndDate(date)} />
                </div>
              </>
            )}
          </div>

          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                {comparisonType === 'none' ? (
                  <TableRow>
                    <TableHead className="min-w-[280px]">Account</TableHead>
                    {periodGroups.map((group) => (
                      <TableHead key={group.key} className="text-right">
                        {group.label}
                      </TableHead>
                    ))}
                  </TableRow>
                ) : (
                  <>
                    <TableRow>
                      <TableHead className="min-w-[280px]">Account</TableHead>
                      {periodGroups.map((group) => (
                        <TableHead key={group.key} colSpan={3} className="text-center">
                          {group.label}
                        </TableHead>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableHead />
                      {periodGroups.map((group) => {
                        const comparisonEntry = report?.comparisonPeriodBreakdown?.find(
                          (entry) => entry.mainLabel === group.label
                        );
                        const previousLabel = comparisonEntry?.label || 'Previous';
                        
                        return (
                          <TableHead key={`${group.key}-current`} colSpan={3} className="p-0">
                            <div className="grid grid-cols-3 text-xs uppercase text-muted-foreground">
                              <div className="px-3 py-2 text-right">Current</div>
                              <div className="px-3 py-2 text-right">{previousLabel}</div>
                              <div className="px-3 py-2 text-right">
                                {comparisonMode === 'percent' ? '% Change' : '$ Change'}
                              </div>
                            </div>
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </>
                )}
              </TableHeader>
              <TableBody>
                {visibleRows.map((row) => {
                  const isSection = row.type === 'section';
                  const isSubtotal = row.type === 'total';
                  const isSummary = row.type === 'summary';
                  const indentClass = row.level === 0 ? 'pl-4' : row.level === 1 ? 'pl-8' : 'pl-12';
                  const parentType = row.id.replace('section-', '') as AccountType;
                  const subKey = row.type === 'subtype' ? row.id.replace('subtype-', '') : '';
                  const hasToggle = row.type === 'section' || row.type === 'subtype';
                  const isExpanded = row.type === 'section'
                    ? expandedTypes.has(parentType)
                    : row.type === 'subtype'
                      ? expandedSubTypes.has(subKey)
                      : true;

                  const handleRowClick = () => {
                    if (hasToggle) {
                      if (row.type === 'section') toggleType(parentType);
                      else toggleSubType(subKey);
                    } else if (row.account) {
                      handleAccountClick(row.account);
                    }
                  };

                  return (
                    <TableRow
                      key={row.id}
                      className={[
                        isSection ? 'bg-muted font-semibold uppercase cursor-pointer hover:bg-muted/80' : '',
                        isSubtotal ? 'font-bold' : '',
                        isSummary ? 'bg-primary/10 font-bold' : '',
                        row.type === 'account' ? 'cursor-pointer hover:bg-muted/20' : '',
                        (row.type === 'subtype' || row.type === 'section') ? 'cursor-pointer' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={handleRowClick}
                    >
                      <TableCell className={`${indentClass} py-2`}>
                        <div className="flex items-center gap-2">
                          {hasToggle && (
                            <span className="text-muted-foreground shrink-0" aria-hidden>
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </span>
                          )}
                          <span className={isSection ? 'uppercase' : ''}>{row.label}</span>
                        </div>
                      </TableCell>
                      {renderRowValues(row)}
                    </TableRow>
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
