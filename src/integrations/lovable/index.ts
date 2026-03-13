// Lovable OAuth integration removed — using standard Supabase Auth.
// This file is kept as a stub for compatibility.

export const lovable = {
  auth: {
    signInWithOAuth: async (_provider: string, _opts?: any) => {
      return { error: new Error("Lovable OAuth removed. Use standard Supabase Auth.") };
    },
  },
};
