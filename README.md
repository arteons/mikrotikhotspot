# MikroTik Captive Portal – SvelteKit + Supabase Integration

A modern custom captive portal for MikroTik Hotspot networks, built with **SvelteKit**, **Supabase**, and **MikroTik REST API**.  
Users are redirected from the router’s hotspot login page to this external portal, where they register with their email.  
The backend automatically creates the user on the router via REST and logs them in seamlessly.

---

## ⚙️ Features

✅ Custom landing page (SvelteKit)  
✅ Automatic MikroTik user creation via REST API  
✅ Auto-login without showing the original MikroTik login.html  
✅ Email-based single sign-on (one email = one user, multiple devices supported)  
✅ Supabase integration for contact logging (email, MAC, IP, etc.)  
✅ Compatible with Coolify, Docker, or direct Node.js deployment  
✅ Future-ready for social logins (Google/Facebook)

---

## 🧩 Architecture Overview

Device → MikroTik hotspot redirect → SvelteKit portal → /api/register → Inserts contact into Supabase → Creates or updates MikroTik user (via REST) → Returns auto-login form → /login on MikroTik → User is online

