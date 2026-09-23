// Export types
export type { Database } from "../types/supabase.types";

// Framework-agnostic clients
export { type AdminClientOptions, createAdminClient } from "./admin";
export { createClient as createBrowserClient } from "./browser";
