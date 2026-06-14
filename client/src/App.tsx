import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LumoDataProvider } from "./contexts/LumoDataContext";
import { UserPreferencesProvider } from "./contexts/UserPreferencesContext";
import { PeriodFilterProvider } from "./contexts/PeriodFilterContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Attendants from "./pages/Attendants";
import Performance from "./pages/Performance";
import Absences from "./pages/Absences";
import Settings from "./pages/Settings";
import Structure from "./pages/Structure";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={() => <DashboardLayout><Dashboard /></DashboardLayout>} />
      <Route path={"/attendants"} component={() => <DashboardLayout><Attendants /></DashboardLayout>} />
      <Route path={"/performance"} component={() => <DashboardLayout><Performance /></DashboardLayout>} />
      <Route path={"/absences"} component={() => <DashboardLayout><Absences /></DashboardLayout>} />
      <Route path={"/structure"} component={() => <DashboardLayout><Structure /></DashboardLayout>} />
      <Route path={"/settings"} component={() => <DashboardLayout><Settings /></DashboardLayout>} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable
      >
        <LumoDataProvider>
          <PeriodFilterProvider>
            <UserPreferencesProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
            </UserPreferencesProvider>
          </PeriodFilterProvider>
        </LumoDataProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
