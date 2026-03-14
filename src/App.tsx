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
import Index from "./pages/Index";
import TablesPage from "./pages/TablesPage";
import MatchesPage from "./pages/MatchesPage";
import PlayersPage from "./pages/PlayersPage";
import PlayerProfilePage from "./pages/PlayerProfilePage";
import SubmitMatchPage from "./pages/SubmitMatchPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import StatsPage from "./pages/StatsPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SettingsPage from "./pages/SettingsPage";
import MyMatchesPage from "./pages/MyMatchesPage";
import HeadToHeadPage from "./pages/HeadToHeadPage";
import CalendarPage from "./pages/CalendarPage";
import HallOfFamePage from "./pages/HallOfFamePage";
import AchievementsPage from "./pages/AchievementsPage";
import ChatPage from "./pages/ChatPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import ReportBugPage from "./pages/ReportBugPage";
import DownloadsPage from "./pages/DownloadsPage";
import HowToPlayPage from "./pages/HowToPlayPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import WeeklyChallengesPage from "./pages/WeeklyChallengesPage";
import RulesPage from "./pages/RulesPage";
import NotFound from "./pages/NotFound";
import Footer from "./components/Footer";
import { ReactNode } from "react";
import Index from "./pages/Index";
import TablesPage from "./pages/TablesPage";
import MatchesPage from "./pages/MatchesPage";
import PlayersPage from "./pages/PlayersPage";
import PlayerProfilePage from "./pages/PlayerProfilePage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import StatsPage from "./pages/StatsPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SettingsPage from "./pages/SettingsPage";
import MyMatchesPage from "./pages/MyMatchesPage";
import HeadToHeadPage from "./pages/HeadToHeadPage";
import CalendarPage from "./pages/CalendarPage";
import HallOfFamePage from "./pages/HallOfFamePage";
import AchievementsPage from "./pages/AchievementsPage";
import ChatPage from "./pages/ChatPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import ReportBugPage from "./pages/ReportBugPage";
import DownloadsPage from "./pages/DownloadsPage";
import HowToPlayPage from "./pages/HowToPlayPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import WeeklyChallengesPage from "./pages/WeeklyChallengesPage";
import RulesPage from "./pages/RulesPage";
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
