<script lang="ts">
    import { onMount } from 'svelte';
  
    let email = '';
    let whatsapp = '';
    let mac = '';
    let ip = '';
    let link_login = '';
    let loading = false;
    let errorMsg = '';
  
    onMount(() => {
      const url = new URL(window.location.href);
      mac = url.searchParams.get('mac') || '';
      ip = url.searchParams.get('ip') || '';
      link_login = url.searchParams.get('link-login') || '';
  
      if (!link_login) {
        errorMsg = 'Invalid redirect: missing hotspot parameters.';
      }
    });
  
    async function handleSubmit(e: Event) {
      e.preventDefault();
      loading = true;
      errorMsg = '';
  
      try {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('whatsapp', whatsapp);
        formData.append('mac', mac);
        formData.append('ip', ip);
        formData.append('link_login', link_login);
  
        const res = await fetch('/api/register', {
          method: 'POST',
          body: formData
        });
  
        // 🧭 if backend returns HTML, it will auto-login
        if (res.headers.get('content-type')?.includes('text/html')) {
          const html = await res.text();
          document.open();
          document.write(html);
          document.close();
          return;
        }
  
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Registration failed');
      } catch (err) {
        errorMsg = err.message;
      } finally {
        loading = false;
      }
    }
  </script>
  
  <style>
    body {
      background-color: #f5f5f5;
      font-family: system-ui, sans-serif;
    }
    .container {
      max-width: 380px;
      margin: 60px auto;
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    h1 {
      text-align: center;
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #333;
    }
    form label {
      display: block;
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 6px;
    }
    input[type="text"],
    input[type="email"] {
      width: 100%;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 6px;
      font-size: 0.95rem;
      margin-bottom: 1rem;
    }
    button {
      width: 100%;
      background: #2563eb;
      color: white;
      border: none;
      padding: 12px;
      border-radius: 6px;
      font-size: 1rem;
      cursor: pointer;
    }
    button:hover {
      background: #1d4ed8;
    }
    button:disabled {
      background: #93c5fd;
      cursor: not-allowed;
    }
    .error {
      color: red;
      font-size: 0.85rem;
      margin-bottom: 1rem;
      text-align: center;
    }
    .footer {
      text-align: center;
      font-size: 0.8rem;
      color: #888;
      margin-top: 1rem;
    }
  </style>
  
  <div class="container">
    <h1>Internet Access</h1>
  
    {#if errorMsg}
      <p class="error">{errorMsg}</p>
    {/if}
  
    <form onsubmit={handleSubmit}>
      <label for="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        placeholder="you@example.com"
        bind:value={email}
        required
      />
  
      <label for="whatsapp">WhatsApp (optional)</label>
      <input
        id="whatsapp"
        name="whatsapp"
        type="text"
        placeholder="+62..."
        bind:value={whatsapp}
      />
  
      <!-- Hidden parameters -->
      <input type="hidden" name="mac" bind:value={mac} />
      <input type="hidden" name="ip" bind:value={ip} />
      <input type="hidden" name="link_login" bind:value={link_login} />
  
      <button type="submit" disabled={loading}>
        {#if loading}
          Registering...
        {:else}
          Connect to Internet
        {/if}
      </button>
    </form>
  
    <p class="footer">By connecting, you agree to our usage policy.</p>
  </div>
  