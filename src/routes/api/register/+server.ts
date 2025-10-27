import { json, redirect } from '@sveltejs/kit';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';

export async function POST({ request }) {
  try {
    // 🔍 Detect whether data comes from JSON or form
    const contentType = request.headers.get('content-type') || '';
    let email, whatsapp, mac, ip, link_login;

    if (contentType.includes('application/json')) {
      const data = await request.json();
      ({ email, whatsapp, mac, ip, link_login } = data);
    } else if (
      contentType.includes('multipart/form-data') ||
      contentType.includes('application/x-www-form-urlencoded')
    ) {
      const data = await request.formData();
      email = data.get('email');
      whatsapp = data.get('whatsapp');
      mac = data.get('mac');
      ip = data.get('ip');
      link_login = data.get('link_login');
    } else {
      return json({ success: false, error: 'Unsupported content type' }, { status: 400 });
    }

    // 🧩 Insert contact record into Supabase
    const supabase = createClient(
      publicEnv.PUBLIC_SUPABASE_URL!,
      privateEnv.PRIVATE_SUPABASE_SERVICE_KEY!
    );

    await supabase.from('cat_hotspot_contacts').insert([{ email, whatsapp, mac, ip }]);

    // 🔐 MikroTik credentials
    const host = privateEnv.MIKROTIK_HOST;
    const auth = Buffer.from(`${privateEnv.MIKROTIK_USER}:${privateEnv.MIKROTIK_PASS}`).toString('base64');
    if (!host) throw new Error('Missing MIKROTIK_HOST');

    // ➕ Create user on MikroTik
    const userPayload = {
      name: email || whatsapp || mac,
      password: mac || 'autogen',
      'mac-address': mac || '',
      profile: 'default',
      comment: 'Auto captive portal registration'
    };

    const userResp = await fetch(`http://${host}:85/rest/ip/hotspot/user`, {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userPayload)
    });

    if (!userResp.ok) {
      console.error('❌ Failed to create user:', await userResp.text());
      throw new Error('Failed to create user on MikroTik');
    }

    // ⚡ Try immediate auto-login
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
        // fallback handled below
      }
    }

    // 🔁 Always redirect to MikroTik login as fallback
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
