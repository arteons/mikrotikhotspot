import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
  try {
    const { email, whatsapp, mac, ip } = await request.json();

    // Validate input
    if (!email && !whatsapp) {
      return json({ success: false, message: 'Email or WhatsApp is required.' }, { status: 400 });
    }

    // Insert into Supabase
    const { error } = await locals.supabase.from('cat_hotspot_contacts').insert([
      {
        email,
        whatsapp,
        mac_address: mac,
        ip_address: ip
      }
    ]);

    if (error) {
      console.error('Supabase insert error:', error.message);
      return json({ success: false, message: 'Failed to save contact.' }, { status: 500 });
    }

    return json({ success: true, message: 'Contact saved successfully.' });
  } catch (err) {
    console.error('Server error:', err);
    return json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}
