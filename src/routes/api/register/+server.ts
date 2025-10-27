import { json } from '@sveltejs/kit';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';

export async function POST({ request }) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let email, whatsapp, mac, ip, link_login;

    if (contentType.includes('application/json')) {
      const data = await request.json();
      ({ email, whatsapp, mac, ip, link_login } = data);
    } else {
      const form = await request.formData();
      email = form.get('email')?.toString() || '';
      whatsapp = form.get('whatsapp')?.toString() || '';
      mac = form.get('mac')?.toString() || '';
      ip = form.get('ip')?.toString() || '';
      link_login = form.get('link_login')?.toString() || '';
    }

    if (!email || !ip || !link_login)
      return json({ success: false, error: 'Missing required parameters' }, { status: 400 });

    // 🗂️ insert contact
    const supabase = createClient(
      publicEnv.PUBLIC_SUPABASE_URL!,
      privateEnv.PRIVATE_SUPABASE_SERVICE_KEY!
    );
    await supabase.from('cat_hotspot_contacts').insert([{ email, whatsapp, mac, ip }]);

    // 🔐 MikroTik credentials
    const host = privateEnv.MIKROTIK_HOST!;
    const auth = Buffer.from(`${privateEnv.MIKROTIK_USER}:${privateEnv.MIKROTIK_PASS}`).toString('base64');

    // ➕ create or update hotspot user
    const userPayload = {
      name: email,
      password: email, // use email for both username and password for simplicity
      profile: 'default',
      comment: 'Auto captive portal registration'
    };

    const res = await fetch(`http://${host}:85/rest/ip/hotspot/user`, {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userPayload)
    });

    if (!res.ok) {
      console.error(await res.text());
      throw new Error('MikroTik user creation failed');
    }

    // 🔁 auto-login via hidden form
    const username = encodeURIComponent(email);
    const password = encodeURIComponent(email);

    return new Response(
      `
      <html>
        <body onload="document.forms[0].submit()">
          <form action="${link_login}" method="post">
            <input type="hidden" name="username" value="${username}">
            <input type="hidden" name="password" value="${password}">
            <input type="hidden" name="popup" value="true">
            <noscript><input type="submit" value="Continue"></noscript>
          </form>
          <p style="text-align:center;font-family:sans-serif">Logging you in...</p>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err) {
    console.error('💥', err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
