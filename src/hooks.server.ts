import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

export const handle: Handle = async ({ event, resolve }) => {
  const supabaseUrl = env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY;

  event.locals.supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get: (key) => event.cookies.get(key),
        set: (key, value, options) =>
          event.cookies.set(key, value, { ...options, path: '/' }),
        remove: (key, options) =>
          event.cookies.delete(key, { ...options, path: '/' })
      },
      global: { fetch: event.fetch }
    }
  );

  return resolve(event);
};
