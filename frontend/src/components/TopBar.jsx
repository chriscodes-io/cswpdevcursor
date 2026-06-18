import React from 'react';
import { Search, Sun, Moon, Bell, User } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const TopBar = ({ theme, onThemeToggle, searchQuery, setSearchQuery, currentUser, onLogout }) => {

  return (
    <div className="sticky top-0 z-40 backdrop-blur-sm bg-background/85 border-b border-border" data-testid="topbar">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4 flex-1">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tasks, employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full text-sm"
              data-testid="search-input"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onThemeToggle}
            data-testid="theme-toggle"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </Button>

          <Button variant="ghost" size="icon" data-testid="notifications-button">
            <Bell className="w-5 h-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="user-menu-trigger">
                <User className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{currentUser?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{currentUser?.email || ''}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="profile-menu-item">Profile</DropdownMenuItem>
              <DropdownMenuItem data-testid="settings-menu-item">Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} data-testid="logout-menu-item">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
