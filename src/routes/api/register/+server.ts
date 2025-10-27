import { json, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public'; // for PUBLIC_SUPABASE_ vars
import { PRIVATE_SUPABASE_SERVICE_KEY, MIKROTIK_HOST, MIKROTIK_USER, MIKROTIK_PASS } from '$env/static/private';

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

    // 1️⃣ Initialize Supabase client (Service role for write access)
    const supabase = createClient(
      env.PUBLIC_SUPABASE_URL,
      PRIVATE_SUPABASE_SERVICE_KEY
    );

    // 2️⃣ Insert into Supabase table
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

    // 3️⃣ Create MikroTik hotspot user
    const routerUrl = `http://${MIKROTIK_HOST}:85/rest/ip/hotspot/user`;
    const auth = Buffer.from(`${MIKROTIK_USER}:${MIKROTIK_PASS}`).toString('base64');

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

    // 4️⃣ Redirect to MikroTik login for auto-login
    if (link_login) {
      throw redirect(302, `${link_login}?username=${encodeURIComponent(email || whatsapp)}&password=${encodeURIComponent(mac || 'autogen')}`);
    }

    return jso
