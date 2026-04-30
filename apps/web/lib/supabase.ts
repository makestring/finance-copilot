import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Chave usada tanto no cookie quanto no middleware
export const SESSION_COOKIE = "sb-session";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

// Armazena a sessão em cookie para que o middleware consiga ler server-side
const cookieStorage = {
  getItem(key: string): string | null {
    if (typeof document === "undefined") return null;
    const m = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  },
  setItem(key: string, value: string): void {
    if (typeof document === "undefined") return;
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  },
  removeItem(key: string): void {
    if (typeof document === "undefined") return;
    document.cookie = `${key}=; path=/; max-age=0`;
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: cookieStorage,
    storageKey: SESSION_COOKIE,
  },
});
