import { useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/**
 * Hook that listens for browser extension messages about league match events
 * and shows toast notifications to the user.
 */
export function useExtensionNotifications() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;

      // League match result pushed from extension
      if (event.data?.type === "EDART_LEAGUE_MATCH_PUSH" && event.data?.payload) {
        const data = event.data.payload;
        const matchDesc = `${data.player1_name || "?"} vs ${data.player2_name || "?"}`;

        if (data.auto_submitted && data.status === "completed") {
          toast.success("🎯 Mecz ligowy zatwierdzony!", {
            description: `${matchDesc} — ${data.league_name || "Liga"}\nWynik zatwierdzony automatycznie!`,
            duration: 15000,
            action: data.edart_match_id
              ? {
                  label: "Zobacz wynik",
                  onClick: () => navigate(`/matches`),
                }
              : undefined,
          });
        } else if (data.auto_submitted) {
          toast.success("🎯 Mecz ligowy wysłany!", {
            description: `${matchDesc} — ${data.league_name || "Liga"}\nOczekuje na zatwierdzenie admina.`,
            duration: 15000,
            action: data.edart_match_id
              ? {
                  label: "Zobacz",
                  onClick: () => navigate(`/matches`),
                }
              : undefined,
          });
        } else if (data.submit_error) {
          // League match detected but auto-submit failed
          toast.warning("⚠️ Mecz ligowy wykryty!", {
            description: `${matchDesc} — ${data.league_name || "Liga"}\n${data.submit_error}`,
            duration: 20000,
            action: {
              label: "Wyślij ręcznie",
              onClick: () => navigate("/submit"),
            },
          });
        }
      }

      // Extension installed confirmation
      if (event.data?.type === "EDART_EXTENSION_INSTALLED") {
        console.log("[eDART] Wtyczka wykryta, wersja:", event.data.version);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate]);
}
