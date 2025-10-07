import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  FileText,
  DollarSign,
  Package,
  TrendingDown,
  Building2,
  CreditCard,
  Landmark,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { section: 'Income' },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Receive Payments', href: '/receive-payments', icon: DollarSign },
  { name: 'Items & Services', href: '/items-services', icon: Package },
  { section: 'Expenses' },
  { name: 'Vendors', href: '/vendors', icon: Building2 },
  { name: 'Bills', href: '/bills', icon: FileText },
  { name: 'Bill Payments', href: '/bill-payments', icon: CreditCard },
  { section: 'Banking' },
  { name: 'Transactions', href: '/transactions', icon: TrendingDown },
  { name: 'Registers', href: '/registers', icon: BookOpen },
  { name: 'Reconciliations', href: '/reconciliations', icon: Landmark },
  { section: 'Accounting' },
  { name: 'Chart of Accounts', href: '/chart-of-accounts', icon: BarChart3 },
  { name: 'Journal Entries', href: '/journal-entries', icon: BookOpen },
  { section: 'Reporting' },
  { name: 'Profit & Loss', href: '/profit-loss', icon: TrendingUp },
  { name: 'Balance Sheet', href: '/balance-sheet', icon: FileText },
  { section: 'Settings' },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar = () => {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-sidebar-foreground">JTM Ledger</h1>
      </div>
      
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigation.map((item, index) => {
            if ('section' in item) {
              return (
                <div key={index} className="pt-4 pb-2 px-3">
                  <p className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                    {item.section}
                  </p>
                </div>
              );
            }

            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};