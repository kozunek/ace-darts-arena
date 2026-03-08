import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LeagueProvider } from "@/contexts/LeagueContext";
import Navbar from "@/components/Navbar";
import Index from "./pages/Index";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <LeagueProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Navbar />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/matches" element={<MatchesPage />} />
              <Route path="/players" element={<PlayersPage />} />
              <Route path="/players/:id" element={<PlayerProfilePage />} />
              <Route path="/my-matches" element={<MyMatchesPage />} />
              <Route path="/h2h" element={<HeadToHeadPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/hall-of-fame" element={<HallOfFamePage />} />
              <Route path="/submit" element={<SubmitMatchPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </LeagueProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
