import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  ShoppingCart,
  Package,
  RotateCcw,
  Upload,
  Download,
  Settings,
  LogOut,
  TrendingUp,
  ChevronDown,
  Store,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { logout, user } = useAuth();
  const { companies } = useData();
  const navigate = useNavigate();
  const [openCompanies, setOpenCompanies] = React.useState<string[]>([]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleCompany = (companyId: string) => {
    setOpenCompanies(prev => 
      prev.includes(companyId) 
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/analytics', icon: TrendingUp, label: 'P&L Analytics' },
    { to: '/companies', icon: Building2, label: 'Companies' },
    { to: '/orders', icon: ShoppingCart, label: 'Orders' },
    { to: '/inventory', icon: Package, label: 'Inventory' },
    { to: '/returns', icon: RotateCcw, label: 'Returns' },
    { to: '/upload', icon: Upload, label: 'Upload Data' },
    { to: '/downloads', icon: Download, label: 'Downloads' },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-72 bg-sidebar border-r border-sidebar-border transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-sidebar-border">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold gradient-text">SellSync</span>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Companies section */}
            {companies.length > 0 && (
              <div className="mt-6 pt-4 border-t border-sidebar-border">
                <p className="px-3 mb-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                  Companies
                </p>
                <div className="space-y-1">
                  {companies.map((company) => (
                    <Collapsible
                      key={company.id}
                      open={openCompanies.includes(company.id)}
                      onOpenChange={() => toggleCompany(company.id)}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-4 h-4" />
                          <span className="truncate max-w-[140px]">{company.name}</span>
                        </div>
                        <ChevronDown className={cn(
                          "w-4 h-4 transition-transform duration-200",
                          openCompanies.includes(company.id) && "rotate-180"
                        )} />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-6 mt-1 space-y-1">
                        {company.platforms.length > 0 ? (
                          company.platforms.map((platform) => (
                            <NavLink
                              key={platform.id}
                              to={`/platform/${platform.id}`}
                              onClick={onClose}
                              className={({ isActive }) => cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                                isActive 
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                              )}
                            >
                              <Store className="w-4 h-4" />
                              <span className="truncate">{platform.name}</span>
                            </NavLink>
                          ))
                        ) : (
                          <p className="px-3 py-2 text-xs text-sidebar-foreground/40">
                            No platforms yet
                          </p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>

          {/* User section */}
          <div className="p-3 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.username}
                </p>
                <p className="text-xs text-sidebar-foreground/50">Administrator</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
