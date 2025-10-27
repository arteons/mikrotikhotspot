import { json } from '@sveltejs/kit';

export async function GET({ locals }) {
  const { data, error } = await locals.supabase
    .from('cat_hotspot_contacts')
    .select('*')
    .limit(5);

  if (error) {
    console.error(error);
    return json({ error: error.message }, { status: 500 });
  }

  return json(data ?? []);
}
