import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTheme } from "@/contexts/ThemeContext";
import { LayoutDashboard, PanelLeft, Users, BarChart3, Calendar, LayoutGrid, Settings as SettingsIcon, Moon, Sun } from "lucide-react";
import { CSSProperties, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import NotificationCenter from "./NotificationCenter";
import { useLumoData } from "@/contexts/LumoDataContext";
import { buildPerformanceAlerts } from "@/lib/performanceMetrics";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";

const mainMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Atendentes", path: "/attendants" },
  { icon: BarChart3, label: "Desempenho", path: "/performance" },
  { icon: Calendar, label: "Ausências", path: "/absences" },
  { icon: LayoutGrid, label: "Estruturas", path: "/structure" },
];

const settingsMenuItem = {
  icon: SettingsIcon,
  label: "Configurações",
  path: "/settings",
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const SIDEBAR_WIDTH_VERSION = "compact-v1";
const SIDEBAR_WIDTH_VERSION_KEY = "sidebar-width-version";
const DEFAULT_WIDTH = 212;
const MIN_WIDTH = 168;
const MAX_WIDTH = 360;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const version = localStorage.getItem(SIDEBAR_WIDTH_VERSION_KEY);
    if (version !== SIDEBAR_WIDTH_VERSION) {
      localStorage.setItem(SIDEBAR_WIDTH_VERSION_KEY, SIDEBAR_WIDTH_VERSION);
      localStorage.removeItem(SIDEBAR_WIDTH_KEY);
    }
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user } = useAuth();
  const { todayIndicators } = useLumoData();
  const performanceAlerts = useMemo(
    () => buildPerformanceAlerts(todayIndicators),
    [todayIndicators]
  );
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem =
    mainMenuItems.find(item => item.path === location) ??
    (location === settingsMenuItem.path ? settingsMenuItem : undefined);
  const isStructurePage = location === "/structure";

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const renderMenuButton = (item: (typeof mainMenuItems)[number]) => {
    const isActive = location === item.path;
    return (
      <SidebarMenuItem key={item.path}>
        <SidebarMenuButton
          isActive={isActive}
          onClick={() => setLocation(item.path)}
          tooltip={item.label}
          className={
            isActive
              ? "h-9 text-sm font-semibold bg-blue-600 text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white"
              : "h-9 text-sm font-medium text-sidebar-foreground hover:bg-blue-100 hover:text-blue-900 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-900"
          }
        >
          <item.icon
            className={
              isActive
                ? "h-4 w-4 text-white"
                : "h-4 w-4 text-slate-600 group-hover/menu-button:text-blue-900"
            }
          />
          <span>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-sidebar-border bg-sidebar [box-shadow:var(--shadow-surface)]"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-12 justify-center bg-sidebar border-b border-sidebar-border">
            <div className="flex items-center gap-2 px-1.5 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent/20 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-sidebar-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base font-bold tracking-tight truncate text-sidebar-foreground">
                    Lumo
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 bg-sidebar">
            <SidebarMenu className="px-1.5 py-2">
              {mainMenuItems.map(renderMenuButton)}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="mt-auto p-2 bg-sidebar border-t border-sidebar-border space-y-1.5">
            <button
              onClick={() => {
                if (toggleTheme) {
                  toggleTheme();
                }
              }}
              className="w-full h-8 flex items-center justify-center rounded-lg hover:bg-sidebar-accent/10 transition-colors text-sidebar-foreground group-data-[collapsible=icon]:justify-center"
              title={`Mudar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <SidebarMenu className="px-0">
              {renderMenuButton(settingsMenuItem)}
            </SidebarMenu>
            <div className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 w-full">
              <Avatar className="h-7 w-7 border border-sidebar-accent/30 shrink-0 bg-sidebar-accent/20">
                <AvatarFallback className="text-sm font-bold text-blue-700 dark:text-blue-200">
                  {(user?.name ?? "Gestor").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium truncate leading-none text-sidebar-foreground">
                  {user?.name || "Gestor"}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate mt-1">
                  {user?.email || "—"}
                </p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-sidebar-accent/40 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset
        className={cn(isStructurePage && "h-svh max-h-svh overflow-hidden")}
      >
        <div className="flex border-b border-border h-12 shrink-0 items-center justify-between bg-card/95 px-3 md:px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur z-40 [box-shadow:var(--shadow-surface)]">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="h-8 w-8 rounded-lg border border-border bg-card [box-shadow:var(--shadow-surface)] hover:bg-muted/40 transition-colors shrink-0" />
            <span className="tracking-tight text-foreground text-base font-medium truncate">
              {activeMenuItem?.label ?? "Lumo"}
            </span>
          </div>
          <NotificationCenter alerts={performanceAlerts} />
        </div>
        <main
          className={cn(
            "flex-1 bg-background",
            isStructurePage
              ? "flex min-h-0 flex-col overflow-hidden p-2 md:p-3"
              : "p-3 md:p-4"
          )}
        >
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
