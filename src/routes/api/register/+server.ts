// /src/routes/api/register/+server.ts
import { json } from '@sveltejs/kit';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';

export async function POST({ request }) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let email, whatsapp, mac, ip, link_login;

    // 🧩 Detect JSON vs FormData
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

    // 🧱 Validate
    if (!email || !mac || !ip || !link_login) {
      return json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // 🪣 Supabase Client
    const supabase = createClient(
      publicEnv.PUBLIC_SUPABASE_URL!,
      privateEnv.PRIVATE_SUPABASE_SERVICE_KEY!
    );

    // 🧠 Track or insert user MACs
    await supabase.rpc('add_mac', { p_email: email, p_mac: mac });

    // 💻 MikroTik setup
    const host = privateEnv.MIKROTIK_HOST!;
    const auth = Buffer.from(`${privateEnv.MIKROTIK_USER}:${privateEnv.MIKROTIK_PASS}`).toString('base64');

    // Normalize username
    const username = email.trim().toLowerCase();
    const password = username; // same as email

    // 🧩 Check if user exists first
    const listResp = await fetch(`http://${host}:85/rest/ip/hotspot/user`, {
      method: 'GET',
      headers: { Authorization: `Basic ${auth}` }
    });

    let exists = false;
    if (listResp.ok) {
      const list = await listResp.json();
      exists = list.some((u) => u.name === username);
    }

    // 🆕 Create user if not exists
    if (!exists) {
      const userPayload = {
        name: username,
        password,
        'mac-address': mac,
        profile: 'default',
        comment: `AutoReg ${email}`
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
        console.error('❌ MikroTik create user error:', await createResp.text());
        throw new Error('Failed to create user on MikroTik');
      }
    }

    // 🧭 Return auto-login HTML
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
          <p>Logging you in...</p>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err) {
    console.error('💥 Error in register handler:', err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
