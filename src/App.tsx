import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SelfHostProvider } from "@/contexts/SelfHostContext";
import { LeagueProvider } from "@/contexts/LeagueContext";
import Navbar from "@/components/Navbar";
import FloatingChat from "@/components/FloatingChat";
import CookieBanner from "@/components/CookieBanner";

import { useExtensionNotifications } from "@/hooks/useExtensionNotifications";
import { PagePermissionsProvider, ProtectedRoute } from "@/components/ProtectedRoute";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import SubmitMatchPage from "./pages/SubmitMatchPage";
const Index = lazy(() => import("./pages/Index"));
const TablesPage = lazy(() => import("./pages/TablesPage"));
const MatchesPage = lazy(() => import("./pages/MatchesPage"));
const PlayersPage = lazy(() => import("./pages/PlayersPage"));
const PlayerProfilePage = lazy(() => import("./pages/PlayerProfilePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const StatsPage = lazy(() => import("./pages/StatsPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const MyMatchesPage = lazy(() => import("./pages/MyMatchesPage"));
const HeadToHeadPage = lazy(() => import("./pages/HeadToHeadPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const HallOfFamePage = lazy(() => import("./pages/HallOfFamePage"));
const AchievementsPage = lazy(() => import("./pages/AchievementsPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const AnnouncementsPage = lazy(() => import("./pages/AnnouncementsPage"));
const ReportBugPage = lazy(() => import("./pages/ReportBugPage"));
const DownloadsPage = lazy(() => import("./pages/DownloadsPage"));
const HowToPlayPage = lazy(() => import("./pages/HowToPlayPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const WeeklyChallengesPage = lazy(() => import("./pages/WeeklyChallengesPage"));
const RulesPage = lazy(() => import("./pages/RulesPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
import Footer from "./components/Footer";
import { ReactNode } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        cacheTime: 1000 * 60 * 30, // 30 minutes
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        retry: 1,
      },
  },
});

function ExtensionNotifier() {
  useExtensionNotifications();
  return null;
}

const P = ({ path, children }: { path: string; children: ReactNode }) => (
  <ProtectedRoute path={path}>{children}</ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SelfHostProvider>
        <AuthProvider>
          <LeagueProvider>
            <PagePermissionsProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ExtensionNotifier />
              <Navbar />
              <FloatingChat />
              <CookieBanner />
              <Suspense fallback={<Skeleton className="h-screen w-full" />}>
              <Routes>
                <Route path="/" element={<P path="/"><Index /></P>} />
                <Route path="/tables" element={<P path="/tables"><TablesPage /></P>} />
                <Route path="/matches" element={<P path="/matches"><MatchesPage /></P>} />
                <Route path="/players" element={<P path="/players"><PlayersPage /></P>} />
                <Route path="/players/:id" element={<P path="/players"><PlayerProfilePage /></P>} />
                <Route path="/my-matches" element={<P path="/my-matches"><MyMatchesPage /></P>} />
                <Route path="/h2h" element={<P path="/h2h"><HeadToHeadPage /></P>} />
                <Route path="/calendar" element={<P path="/calendar"><CalendarPage /></P>} />
                <Route path="/hall-of-fame" element={<P path="/hall-of-fame"><HallOfFamePage /></P>} />
                <Route path="/achievements" element={<P path="/achievements"><AchievementsPage /></P>} />
                <Route path="/chat" element={<P path="/chat"><ChatPage /></P>} />
                <Route path="/announcements" element={<P path="/announcements"><AnnouncementsPage /></P>} />
                <Route path="/submit" element={<P path="/submit"><SubmitMatchPage /></P>} />
                <Route path="/login" element={<P path="/login"><LoginPage /></P>} />
                <Route path="/admin" element={<P path="/admin"><AdminPage /></P>} />
                <Route path="/stats" element={<P path="/stats"><StatsPage /></P>} />
                <Route path="/reset-password" element={<P path="/reset-password"><ResetPasswordPage /></P>} />
                <Route path="/settings" element={<P path="/settings"><SettingsPage /></P>} />
                <Route path="/report-bug" element={<P path="/report-bug"><ReportBugPage /></P>} />
                <Route path="/downloads" element={<P path="/downloads"><DownloadsPage /></P>} />
                <Route path="/how-to-play" element={<P path="/how-to-play"><HowToPlayPage /></P>} />
                <Route path="/challenges" element={<P path="/challenges"><WeeklyChallengesPage /></P>} />
                <Route path="/rules" element={<P path="/rules"><RulesPage /></P>} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              <Footer />
            </BrowserRouter>
            </PagePermissionsProvider>
          </LeagueProvider>
        </AuthProvider>
      </SelfHostProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
