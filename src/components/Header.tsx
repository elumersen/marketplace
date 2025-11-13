import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, LogOut, Bell, Search, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-xl px-8 shadow-sm">
      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Search transactions, invoices, customers..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border-2 border-slate-200 bg-white text-sm focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400 shadow-sm hover:border-slate-300"
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200 group"
        >
          <Bell className="h-5 w-5 text-slate-600 group-hover:text-indigo-600 transition-colors" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        </Button>

        {/* Settings */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200 group"
          onClick={() => navigate('/settings')}
        >
          <Settings className="h-5 w-5 text-slate-600 group-hover:text-indigo-600 transition-colors" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:ring-2 hover:ring-indigo-500/30 transition-all hover:scale-105">
              <Avatar className="h-10 w-10 border-2 border-indigo-200 shadow-md">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold">
                  {user ? getInitials(user.email) : 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2 shadow-xl border-slate-200">
            <DropdownMenuLabel className="p-3">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-slate-900">{user?.firstName || 'User'}</p>
                <p className="text-xs text-slate-500">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-200" />
            <DropdownMenuItem 
              onClick={() => navigate('/settings')}
              className="p-3 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer transition-colors group"
            >
              <User className="mr-3 h-4 w-4 text-slate-500 group-hover:text-indigo-600" />
              <span className="font-medium">Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-200" />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="p-3 rounded-lg hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors group"
            >
              <LogOut className="mr-3 h-4 w-4 text-slate-500 group-hover:text-red-600" />
              <span className="font-medium">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};