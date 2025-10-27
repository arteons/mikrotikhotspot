import { json, redirect } from '@sveltejs/kit';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';

export async function POST({ request }) {
  try {
    let email, whatsapp, mac, ip, link_login;

    // Detect JSON vs form submission
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      ({ email, whatsapp, mac, ip, link_login } = body);
    } else {
      const body = await request.formData();
      email = body.get('email')?.toString() || null;
      whatsapp = body.get('whatsapp')?.toString() || null;
      mac = body.get('mac')?.toString() || null;
      ip = body.get('ip')?.toString() || null;
      link_login = body.get('link_login')?.toString() || null;
    }

    // Validate required fields
    if (!mac || !ip) {
      return json({ success: false, error: 'Missing MAC or IP' }, { status: 400 });
    }

    // Supabase insert
    const supabase = createClient(
      publicEnv.PUBLIC_SUPABASE_URL!,
      privateEnv.PRIVATE_SUPABASE_SERVICE_KEY!
    );
    await supabase.from('cat_hotspot_contacts').insert([{ email, whatsapp, mac, ip }]);

    // MikroTik config
    const host = privateEnv.MIKROTIK_HOST;
    const auth = Buffer.from(`${privateEnv.MIKROTIK_USER}:${privateEnv.MIKROTIK_PASS}`).toString('base64');
    if (!host) throw new Error('Missing MIKROTIK_HOST');

    // Create user on MikroTik
    const userPayload = {
      name: email || whatsapp || mac,
      password: mac,
      'mac-address': mac,
      profile: 'default',
      comment: 'Auto captive portal registration'
    };

    const createUser = await fetch(`http://${host}:85/rest/ip/hotspot/user`, {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userPayload)
    });

    if (!createUser.ok) {
      const errText = await createUser.text();
      console.error('❌ MikroTik create error:', errText);
      throw new Error(errText);
    }

    // Auto-login
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

    // Redirect to MikroTik login if needed
    if (link_login) {
      throw redirect(
        302,
        `${link_login}?username=${encodeURIComponent(email || whatsapp || mac)}&password=${encodeURIComponent(mac)}`
      );
    }

    return json({ success: true });
  } catch (err) {
    console.error('💥 Error in register handler:', err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
