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
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#DBDBDB] bg-white px-8">
      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9EA2AD]" />
          <input
            type="text"
            placeholder="Search by name and etc"
            className="w-full h-10 pl-10 pr-4 rounded-md border border-[#DBDBDB] bg-white text-sm focus:outline-none focus:border-[#5A7BEF] transition-all placeholder:text-[#9EA2AD]"
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative rounded-md hover:bg-[#ECF0F3] transition-all duration-200"
        >
          <Bell className="h-5 w-5 text-[#1A1A1A]" />
        </Button>

        {/* Settings */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-md hover:bg-[#ECF0F3] transition-all duration-200"
          onClick={() => navigate('/settings')}
        >
          <Settings className="h-5 w-5 text-[#1A1A1A]" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:ring-2 hover:ring-[#5A7BEF]/30 transition-all">
              <Avatar className="h-10 w-10 border-2 border-[#DBDBDB]">
                <AvatarFallback className="bg-[#1B3F7A] text-white font-semibold">
                  {user ? getInitials(user.email) : 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2 shadow-xl border-[#DBDBDB]">
            <DropdownMenuLabel className="p-3">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-[#1A1A1A]">{user?.firstName || 'User'}</p>
                <p className="text-xs text-[#9EA2AD]">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#DBDBDB]" />
            <DropdownMenuItem 
              onClick={() => navigate('/settings')}
              className="p-3 rounded-lg hover:bg-[#ECF0F3] hover:text-[#1B3F7A] cursor-pointer transition-colors group"
            >
              <User className="mr-3 h-4 w-4 text-[#9EA2AD] group-hover:text-[#1B3F7A]" />
              <span className="font-medium">Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#DBDBDB]" />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="p-3 rounded-lg hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors group"
            >
              <LogOut className="mr-3 h-4 w-4 text-[#9EA2AD] group-hover:text-red-600" />
              <span className="font-medium">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};