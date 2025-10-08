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
  Sparkles,
  ChevronRight,
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
    <div className="flex h-screen w-64 flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50 relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5"></div>
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-500/10 to-transparent"></div>
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl"></div>
      
      {/* Header */}
      <div className="relative flex h-20 items-center px-6 border-b border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2 shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              JTM Ledger
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Financial Management</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4 relative">
        <nav className="space-y-1">
          {navigation.map((item, index) => {
            if ('section' in item) {
              return (
                <div key={index} className="pt-5 pb-2 px-3 first:pt-2">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-700 to-transparent"></div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {item.section}
                    </p>
                    <div className="h-px w-8 bg-gradient-to-r from-transparent to-slate-700"></div>
                  </div>
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
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 overflow-hidden',
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white shadow-lg shadow-indigo-500/10'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                )}
              >
                {/* Active Indicator */}
                {isActive && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 animate-pulse"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r-full shadow-lg shadow-indigo-500/50"></div>
                  </>
                )}
                
                {/* Icon with Animation */}
                <div className={cn(
                  'relative z-10 transition-all duration-300',
                  isActive 
                    ? 'text-indigo-400' 
                    : 'text-slate-400 group-hover:text-indigo-400 group-hover:scale-110'
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                
                {/* Text */}
                <span className="relative z-10 flex-1">{item.name}</span>
                
                {/* Hover Chevron */}
                <ChevronRight className={cn(
                  'h-3.5 w-3.5 transition-all duration-300 relative z-10',
                  isActive 
                    ? 'text-indigo-400 opacity-100 translate-x-0' 
                    : 'text-slate-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
                )} />
                
                {/* Hover Gradient Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer / Logout */}
      <div className="relative border-t border-slate-700/50 p-4 backdrop-blur-sm">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-12 rounded-xl bg-slate-800/50 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-pink-500/20 text-slate-300 hover:text-white border border-slate-700/50 hover:border-red-500/30 transition-all duration-300 group relative overflow-hidden"
          onClick={logout}
        >
          {/* Logout Button Gradient Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          
          <LogOut className="h-4 w-4 relative z-10 transition-transform duration-300 group-hover:scale-110 group-hover:text-red-400" />
          <span className="relative z-10 font-medium">Sign Out</span>
        </Button>
      </div>
    </div>
  );
};