import { json } from '@sveltejs/kit';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';

export async function POST({ request }) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let email = '', whatsapp = '', mac = '', ip = '', link_login = '';

    // 🧩 Handle JSON or form POST
    if (contentType.includes('application/json')) {
      const data = await request.json();
      ({ email = '', whatsapp = '', mac = '', ip = '', link_login = '' } = data);
    } else {
      const form = await request.formData();
      email = form.get('email')?.toString().trim() || '';
      whatsapp = form.get('whatsapp')?.toString().trim() || '';
      mac = form.get('mac')?.toString().trim() || '';
      ip = form.get('ip')?.toString().trim() || '';
      link_login = form.get('link_login')?.toString().trim() || '';
    }

    // 🛑 Validate required params
    if (!mac || !ip || !link_login) {
      return json({ success: false, error: 'Missing MAC, IP, or login link' }, { status: 400 });
    }

    // 🗃️ Insert contact log
    const supabase = createClient(
      publicEnv.PUBLIC_SUPABASE_URL!,
      privateEnv.PRIVATE_SUPABASE_SERVICE_KEY!
    );

    const { error: insertError } = await supabase
      .from('cat_hotspot_contacts')
      .insert([{ email, whatsapp, mac, ip }]);

    if (insertError) console.warn('⚠️ Supabase insert warning:', insertError.message);

    // 🌐 MikroTik REST setup
    const host = privateEnv.MIKROTIK_HOST;
    if (!host) throw new Error('Missing MIKROTIK_HOST');
    const auth = Buffer.from(
      `${privateEnv.MIKROTIK_USER}:${privateEnv.MIKROTIK_PASS}`
    ).toString('base64');

    // 👤 Create Hotspot user (if not already exists)
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
      const errorBody = await createUser.text();
      console.error('❌ MikroTik user creation failed:', errorBody);
      // Continue anyway (user may already exist)
    }

    // 🪄 Return HTML that triggers MikroTik login
    const username = encodeURIComponent(email || whatsapp || mac);
    const password = encodeURIComponent(mac);

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Logging in...</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif; background:#f9fafb; color:#333; }
          </style>
        </head>
        <body onload="document.forms[0].submit()">
          <form action="${link_login}" method="post">
            <input type="hidden" name="username" value="${username}">
            <input type="hidden" name="password" value="${password}">
            <input type="hidden" name="popup" value="true">
            <noscript><input type="submit" value="Continue"></noscript>
          </form>
          <p>Connecting you to the internet...</p>
        </body>
      </html>
    `;

    return new Response(html, { headers: { 'Content-Type': 'text/html' } });

  } catch (err) {
    console.error('💥 Error in /api/register:', err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
