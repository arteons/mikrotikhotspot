import { json, redirect } from '@sveltejs/kit';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';

export async function POST({ request }) {
  try {
    const data = await request.formData();
    const email = data.get('email') as string | null;
    const whatsapp = data.get('whatsapp') as string | null;
    const mac = data.get('mac') as string | null;
    const ip = data.get('ip') as string | null;
    const link_login = data.get('link_login') as string | null;

    // Supabase service client
    const supabase = createClient(
      publicEnv.PUBLIC_SUPABASE_URL!,
      privateEnv.PRIVATE_SUPABASE_SERVICE_KEY!
    );
    await supabase.from('cat_hotspot_contacts').insert([{ email, whatsapp, mac, ip }]);

    // MikroTik auth setup
    const auth = Buffer.from(`${privateEnv.MIKROTIK_USER}:${privateEnv.MIKROTIK_PASS}`).toString('base64');
    const host = privateEnv.MIKROTIK_HOST;
    if (!host) throw new Error('Missing MIKROTIK_HOST');

    // Create hotspot user
    const userPayload = {
      name: email || whatsapp || mac,
      password: mac || 'autogen',
      'mac-address': mac || '',
      profile: 'default',
      comment: 'Auto captive portal registration'
    };

    const createResp = await fetch(`http://${host}:85/rest/ip/hotspot/user`, {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userPayload)
    });

    if (!createResp.ok) {
      console.error('❌ Failed to create user:', await createResp.text());
      throw new Error('Failed to create user on MikroTik');
    }

    // Force login if mac/ip present
    if (mac && ip) {
      const activePayload = {
        user: email || whatsapp || mac,
        address: ip,
        'mac-address': mac
      };

      const activeResp = await fetch(`http://${host}:85/rest/ip/hotspot/active/add`, {
        method: 'PUT',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(activePayload)
      });

      if (!activeResp.ok) {
        console.warn('⚠️ Auto-login failed:', await activeResp.text());
      }
    }

    // Redirect to MikroTik login (optional)
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
