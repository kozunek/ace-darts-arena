import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabase as defaultClient } from "@/integrations/supabase/client";

interface SelfHostConfig {
  customSupabaseUrl: string;
  customSupabaseAnonKey: string;
  customAiApiKey: string;
  customSiteUrl: string;
}

interface SelfHostContextType {
  config: SelfHostConfig;
  isSelfHosted: boolean;
  loading: boolean;
  customClient: SupabaseClient | null;
  /** Returns the active supabase client (custom if self-hosted, default otherwise) */
  activeClient: SupabaseClient;
}

const emptyCfg: SelfHostConfig = {
  customSupabaseUrl: "",
  customSupabaseAnonKey: "",
  customAiApiKey: "",
  customSiteUrl: "",
};

const SelfHostContext = createContext<SelfHostContextType>({
  config: emptyCfg,
  isSelfHosted: false,
  loading: true,
  customClient: null,
  activeClient: defaultClient,
});

const KEY_MAP: Record<string, keyof SelfHostConfig> = {
  custom_supabase_url: "customSupabaseUrl",
  custom_supabase_anon_key: "customSupabaseAnonKey",
  custom_ai_api_key: "customAiApiKey",
  custom_site_url: "customSiteUrl",
};

export const SelfHostProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<SelfHostConfig>(emptyCfg);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await defaultClient
          .from("app_config")
          .select("key, value");

        if (data) {
          const cfg = { ...emptyCfg };
          data.forEach((row: { key: string; value: string }) => {
            const field = KEY_MAP[row.key];
            if (field) cfg[field] = row.value ?? "";
          });
          setConfig(cfg);
        }
      } catch (e) {
        console.error("Failed to load self-host config:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const isSelfHosted = false; // Self-host wyłączony — zawsze używaj domyślnego Supabase

  const customClient = useMemo(() => {
    if (!isSelfHosted) return null;
    return createClient(config.customSupabaseUrl, config.customSupabaseAnonKey, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }, [isSelfHosted, config.customSupabaseUrl, config.customSupabaseAnonKey]);

  const activeClient = customClient ?? defaultClient;

  return (
    <SelfHostContext.Provider value={{ config, isSelfHosted, loading, customClient, activeClient }}>
      {children}
    </SelfHostContext.Provider>
  );
};

export const useSelfHost = () => useContext(SelfHostContext);
