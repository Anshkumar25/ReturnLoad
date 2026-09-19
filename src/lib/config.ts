// ---------------------------------------------------------------------
// App configuration — read from NEXT_PUBLIC_* environment variables.
// These decide the data backend (Supabase vs Demo Mode) and whether a
// live routing provider is available. Keys are NEVER hardcoded.
// ---------------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

/** True when valid-looking Supabase credentials are present. */
export const SUPABASE_CONFIGURED = supabaseUrl.startsWith("http") && supabaseAnonKey.length > 10;

/** True when a live routing/directions provider is configured. */
export const ROUTING_CONFIGURED = googleMapsKey.length > 0 || mapboxToken.length > 0;

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;
export const GOOGLE_MAPS_API_KEY = googleMapsKey;
export const MAPBOX_TOKEN = mapboxToken;

/** "supabase" when configured, otherwise the fully functional Demo Mode. */
export const APP_MODE: "supabase" | "demo" = SUPABASE_CONFIGURED ? "supabase" : "demo";

export const APP_NAME = "ReturnLoad";