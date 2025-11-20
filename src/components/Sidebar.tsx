import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Settings,
  ChevronRight,
  Repeat,
  BookOpenText,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { section: 'Income' },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Receive Payments', href: '/receive-payments', icon: DollarSign },
  { name: 'Proposals', href: '/proposals', icon: FileText },
  { name: 'Products & Services', href: '/products-services', icon: Package },
  { section: 'Expenses' },
  { name: 'Vendors', href: '/vendors', icon: Building2 },
  { name: 'Bills', href: '/bills', icon: FileText },
  { name: 'Bill Payments', href: '/bill-payments', icon: CreditCard },
  { section: 'Banking' },
  { name: 'Transactions', href: '/transactions', icon: TrendingDown },
  { name: 'Registers', href: '/registers', icon: BookOpen },
  { name: 'Reconciliations', href: '/reconciliations', icon: Landmark },
  { section: 'Accounting' },
  { name: 'Chart of Accounts', href: '/chart-of-accounts', icon: BookOpenText },
  { name: 'Journal Entries', href: '/journal-entries', icon: BookOpen },
  { name: 'Recurring Transactions', href: '/recurring-transactions', icon: Repeat },
  { section: 'Reporting' },
  { name: 'Profit & Loss', href: '/profit-loss', icon: TrendingUp },
  { name: 'Balance Sheet', href: '/balance-sheet', icon: FileText },
  { section: 'Settings' },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar = () => {
  const location = useLocation();

  return (
    <div className="flex h-screen w-64 flex-col bg-[#1B3F7A] border-r border-[#1B3F7A] relative overflow-hidden">
      {/* Header */}
      <div className="relative flex h-24 items-center justify-center px-6 border-b border-[#1B3F7A]/50">
        <img 
          src="/images/logo.png" 
          alt="JTM CPAS - The Business Accountants" 
          className="h-auto max-w-full max-h-14 object-contain"
        />
      </div>
      
      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4 relative">
        <nav className="space-y-1">
          {navigation.map((item, index) => {
            if ('section' in item) {
              return (
                <div key={index} className="pt-5 pb-2 px-3 first:pt-2">
                  <p className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">
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
                  'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#5A7BEF] text-white'
                    : 'text-white hover:bg-[#5A7BEF]/20'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.name}</span>
                {isActive && (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer / User Profile */}
      <div className="relative border-t border-white/10 p-4 bg-[#1B3F7A]/50">
        <div className="flex items-center gap-3 text-white group cursor-pointer hover:bg-white/5 rounded-lg p-2 -m-2 transition-all duration-300">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center shadow-lg ring-2 ring-white/20 group-hover:ring-white/30 transition-all duration-300 group-hover:scale-105">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-400 rounded-full border-2 border-[#1B3F7A]"></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate group-hover:text-white transition-colors">system user</p>
            <p className="text-xs text-white/60 truncate group-hover:text-white/80 transition-colors">system</p>
          </div>
        </div>
      </div>
    </div>
  );
};