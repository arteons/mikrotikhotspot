import { json, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

/**
 * Handles hotspot form submissions.
 * 1. Saves email/whatsapp to Supabase (cat_hotspot_contacts)
 * 2. Creates MikroTik hotspot user via REST API
 * 3. Redirects user to link-login for auto login
 */
export async function POST({ request }) {
  try {
    const { email, whatsapp, mac, ip, link_login } = await request.json();

    if (!email && !whatsapp) {
      return json({ success: false, error: 'Missing contact data' }, { status: 400 });
    }

    // 1️⃣ Initialize Supabase client using service key
    const supabase = createClient(
      publicEnv.PUBLIC_SUPABASE_URL,
      privateEnv.PRIVATE_SUPABASE_SERVICE_KEY
    );

    // 2️⃣ Insert into Supabase
    const { error } = await supabase.from('cat_hotspot_contacts').insert([
      {
        email,
        whatsapp,
        mac_address: mac,
        ip_address: ip
      }
    ]);

    if (error) {
      console.error('Supabase insert error:', error.message);
      return json({ success: false, error: 'Database insert failed' }, { status: 500 });
    }

    // 3️⃣ Create MikroTik user via REST API
    const routerUrl = `http://${privateEnv.MIKROTIK_HOST}:85/rest/ip/hotspot/user`;
    const auth = Buffer.from(`${privateEnv.MIKROTIK_USER}:${privateEnv.MIKROTIK_PASS}`).toString('base64');

    const userAdd = await fetch(routerUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: email || whatsapp,
        password: mac || 'autogen',
        profile: 'default',
        comment: 'Auto captive portal registration'
      })
    });

    if (!userAdd.ok) {
      const errText = await userAdd.text();
      console.error('MikroTik REST error:', errText);
      return json({ success: false, error: 'MikroTik REST failed' }, { status: 502 });
    }

    // 4️⃣ Redirect user to MikroTik auto-login
    if (link_login) {
      throw redirect(
        302,
        `${link_login}?username=${encodeURIComponent(email || whatsapp)}&password=${encodeURIComponent(mac || 'autogen')}`
      );
    }

    return json({ success: true });
  } catch (err) {
    console.error('Unhandled error:', err);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
