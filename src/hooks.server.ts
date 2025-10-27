import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
  // Create a Supabase client for every request
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (key) => event.cookies.get(key),
        set: (key, value, options) =>
          event.cookies.set(key, value, { ...options, path: '/' }),
        remove: (key, options) =>
          event.cookies.delete(key, { ...options, path: '/' })
      },
      global: {
        fetch: event.fetch
      }
    }
  );

  // Continue with request handling
  return resolve(event);
};
