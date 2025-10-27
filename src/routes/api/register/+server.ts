import { json, redirect } from '@sveltejs/kit';
import { PRIVATE_SUPABASE_SERVICE_KEY, MIKROTIK_HOST, MIKROTIK_USER, MIKROTIK_PASS } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';

export async function POST({ request }) {
  try {
    const data = await request.formData();
    const email = data.get('email') as string | null;
    const whatsapp = data.get('whatsapp') as string | null;
    const mac = data.get('mac') as string | null;
    const ip = data.get('ip') as string | null;
    const link_login = data.get('link_login') as string | null;

    // 🔹 Initialize Supabase (service role)
    const supabase = createClient(PUBLIC_SUPABASE_URL, PRIVATE_SUPABASE_SERVICE_KEY);
    await supabase.from('cat_hotspot_contacts').insert([{ email, whatsapp, mac, ip }]);

    // 🔹 Create MikroTik user
    const auth = Buffer.from(`${MIKROTIK_USER}:${MIKROTIK_PASS}`).toString('base64');
    const userPayload = {
      name: email || whatsapp || mac,
      password: mac || 'autogen',
      'mac-address': mac || '',
      profile: 'default',
      comment: 'Auto captive portal registration'
    };

    const userResp = await fetch(`http://${MIKROTIK_HOST}:85/rest/ip/hotspot/user`, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userPayload)
    });

    if (!userResp.ok) {
      console.error('❌ Failed to create user:', await userResp.text());
      throw new Error('Failed to create user on MikroTik');
    }

    // 🔹 Auto-login immediately
    if (mac && ip) {
      const activePayload = {
        user: email || whatsapp || mac,
        address: ip,
        'mac-address': mac
      };

      const activeResp = await fetch(`http://${MIKROTIK_HOST}:85/rest/ip/hotspot/active/add`, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(activePayload)
      });

      if (!activeResp.ok) {
        console.error('⚠️ Auto-login failed:', await activeResp.text());
        // don’t throw — user still registered
      }
    }

    // 🔹 Redirect to MikroTik login if available
    if (link_login) {
      throw redirect(
        302,
        `${link_login}?username=${encodeURIComponent(email || whatsapp || mac || 'guest')}&password=${encodeURIComponent(mac || 'autogen')}`
      );
    }

    return json({ success: true });

  } catch (err) {
    console.error('💥 Error in register handler:', err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
