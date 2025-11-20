import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '@/lib/utils';
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
  Settings,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Repeat,
  BookOpenText,
  LogOut,
  BarChart3,
  FileCheck,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  section: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const navigation: (NavSection | NavItem)[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  {
    section: 'Income',
    icon: TrendingUp,
    items: [
      { name: 'Customers', href: '/customers', icon: Users },
      { name: 'Invoices', href: '/invoices', icon: FileText },
      { name: 'Receive Payments', href: '/receive-payments', icon: DollarSign },
      { name: 'Proposals', href: '/proposals', icon: FileText },
      { name: 'Products & Services', href: '/products-services', icon: Package },
    ],
  },
  {
    section: 'Expenses',
    icon: TrendingDown,
    items: [
      { name: 'Vendors', href: '/vendors', icon: Building2 },
      { name: 'Bills', href: '/bills', icon: FileText },
      { name: 'Bill Payments', href: '/bill-payments', icon: CreditCard },
      { name: '1099s', href: '/1099s', icon: FileCheck },
    ],
  },
  {
    section: 'Banking',
    icon: Landmark,
    items: [
      { name: 'Transactions', href: '/transactions', icon: TrendingDown },
      { name: 'Registers', href: '/registers', icon: BookOpen },
      { name: 'Reconciliations', href: '/reconciliations', icon: Landmark },
    ],
  },
  {
    section: 'Accounting',
    icon: BookOpenText,
    items: [
      { name: 'Chart of Accounts', href: '/chart-of-accounts', icon: BookOpenText },
      { name: 'Journal Entries', href: '/journal-entries', icon: BookOpen },
      { name: 'Recurring Transactions', href: '/recurring-transactions', icon: Repeat },
    ],
  },
  {
    section: 'Reporting',
    icon: BarChart3,
    items: [
      { name: 'Profit & Loss', href: '/profit-loss', icon: TrendingUp },
      { name: 'Balance Sheet', href: '/balance-sheet', icon: FileText },
    ],
  },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showUserMenu, setShowUserMenu] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Check if any item in a section is active
  const isSectionActive = (section: NavSection) => {
    return section.items.some((item) => location.pathname === item.href);
  };

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
          {navigation.map((item) => {
            // Handle regular nav items (like Dashboard)
            if ('name' in item && 'href' in item) {
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
                  <span className="flex-1 text-left mt-0.5 text-xs font-semibold uppercase tracking-wider">{item.name}</span>
                  {isActive && (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </Link>
              );
            }

            // Handle collapsible sections
            if ('section' in item) {
              const isExpanded = expandedSections.has(item.section);
              const hasActiveItem = isSectionActive(item);
              const SectionIcon = item.icon;

              return (
                <div key={item.section} className="pt-5 first:pt-2">
                  <button
                    onClick={() => toggleSection(item.section)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      hasActiveItem
                        ? 'bg-[#5A7BEF]/30 text-white'
                        : 'text-white/90 hover:bg-[#5A7BEF]/20'
                    )}
                  >
                    <SectionIcon className="h-4 w-4" />
                    <span className="flex-1 text-left mt-0.5 text-xs font-semibold uppercase tracking-wider">
                      {item.section}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="mt-1 space-y-1 pl-3">
                      {item.items.map((navItem) => {
                        const Icon = navItem.icon;
                        const isActive = location.pathname === navItem.href;

                        return (
                          <Link
                            key={navItem.href}
                            to={navItem.href}
                            className={cn(
                              'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-[#5A7BEF] text-white'
                                : 'text-white/80 hover:bg-[#5A7BEF]/20 hover:text-white'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="flex-1 text-left mt-0.5">{navItem.name}</span>
                            {isActive && (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })}
        </nav>
      </ScrollArea>

      {/* Footer / User Profile with Settings & Logout */}
      <div className="relative border-t border-white/10 bg-[#1B3F7A]/50">
        {/* Settings & Logout Menu (expands upward) */}
        {showUserMenu && (
          <div className="absolute bottom-full left-0 right-0 bg-[#1B3F7A] border-b border-white/10">
            <Link
              to="/settings"
              onClick={() => setShowUserMenu(false)}
              className={cn(
                'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors mx-3 my-1',
                location.pathname === '/settings'
                  ? 'bg-[#5A7BEF] text-white'
                  : 'text-white hover:bg-[#5A7BEF]/20'
              )}
            >
              <Settings className="h-4 w-4" />
              <span className="flex-1 text-left mt-0.5 text-xs font-semibold uppercase tracking-wider">Settings</span>
              {location.pathname === '/settings' && (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </Link>
            <Link
              to="/"
              onClick={handleLogout}
              className="group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-white hover:bg-[#5A7BEF]/20 transition-colors mx-3 my-1"
            >
              <LogOut className="h-4 w-4" />
              <span className="flex-1 text-left mt-0.5 text-xs font-semibold uppercase tracking-wider">Logout</span>
            </Link>
          </div>
        )}

        {/* User Profile */}
        <div className="p-4 flex justify-center">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-3 text-white group cursor-pointer hover:bg-white/5 rounded-lg p-2 -m-2 transition-all duration-300"
          >
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center shadow-lg ring-2 ring-white/20 group-hover:ring-white/30 transition-all duration-300 group-hover:scale-105">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-400 rounded-full border-2 border-[#1B3F7A]"></div>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold truncate group-hover:text-white transition-colors">system user</p>
              <p className="text-xs text-white/60 truncate group-hover:text-white/80 transition-colors">system</p>
            </div>
            {showUserMenu ? (
              <ChevronUp className="h-4 w-4 text-white/60" />
            ) : (
              <ChevronDown className="h-4 w-4 text-white/60" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};