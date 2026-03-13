// Lovable integration — stub kept for compatibility.
// Authentication is handled by standard Supabase Auth.
// Lovable Cloud handles backend, database, edge functions, and AI.

export const lovable = {
  auth: {
    signInWithOAuth: async (_provider: string, _opts?: any) => {
      return { error: new Error("Use standard Supabase Auth for authentication.") };
    },
  },
};
