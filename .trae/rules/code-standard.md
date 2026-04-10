Language: TypeScript strict mode. No `any` types.
All KIE.ai API calls must go through /lib/kie/ only. Never call KIE directly from components or API routes.
All Supabase server-side calls use /lib/supabase/server.ts.
All Supabase client-side calls use /lib/supabase/client.ts.
Never use SUPABASE_SERVICE_ROLE_KEY in client-side code or NEXT_PUBLIC_ variables.
Use async/await, never .then() chains.