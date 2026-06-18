import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FolderKanban, ListChecks, Search, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Clients', icon: Users, path: '/clients' },
  { label: 'Projects', icon: FolderKanban, path: '/projects' },
  { label: 'Tasks', icon: ListChecks, path: '/tasks' },
  { label: 'SEO Audit', icon: Search, path: '/seo-audit' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

const Sidebar = ({ collapsed, onToggle }) => {
  // Memoize animation configs to prevent re-renders
  const sidebarAnimation = useMemo(() => ({
    initial: { width: collapsed ? 80 : 288 },
    animate: { width: collapsed ? 80 : 288 },
    transition: { duration: 0.22, ease: [0.2, 0.0, 0, 1] }
  }), [collapsed]);

  const logoAnimation = useMemo(() => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { delay: 0.1 }
  }), []);

  return (
    <motion.aside
      {...sidebarAnimation}
      className="bg-[#0c0c0c] border-r border-border flex flex-col h-full"
      data-testid="sidebar"
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <motion.div {...logoAnimation} className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-[7px] flex items-center justify-center font-mono-brand text-xs font-semibold text-primary-foreground shrink-0">
              CS
            </div>
            <div>
              <h1 className="text-[13px] font-medium tracking-tight">Chris Smith</h1>
              <p className="text-[10px] text-muted-foreground font-mono-brand">Technical SEO</p>
            </div>
          </motion.div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-primary rounded-[7px] flex items-center justify-center font-mono-brand text-xs font-semibold text-primary-foreground mx-auto">
            CS
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1" data-testid="sidebar-nav">
        {navItems.map((item, idx) => {
          const itemAnimation = {
            initial: { opacity: 0, x: -8 },
            animate: { opacity: 1, x: 0 },
            transition: { delay: idx * 0.02, duration: 0.22 }
          };

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
                }`
              }
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <motion.span {...itemAnimation}>
                  {item.label}
                </motion.span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 h-10 px-3 rounded-md text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-accent transition-colors"
          data-testid="sidebar-toggle"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
