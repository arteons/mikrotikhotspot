<script lang="ts">
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
  
    const email = writable('');
    const whatsapp = writable('');
    const mac = writable('');
    const ip = writable('');
    const linkLogin = writable('');
    const status = writable<'idle' | 'loading' | 'success' | 'error'>('idle');
    const message = writable('');
  
    // Parse Mikrotik query params: ?mac=&ip=&link-login=
    onMount(() => {
      const params = new URLSearchParams(window.location.search);
      mac.set(params.get('mac') || '');
      ip.set(params.get('ip') || '');
      linkLogin.set(params.get('link-login') || '');
    });
  
    async function handleSubmit(event: SubmitEvent) {
      event.preventDefault();
      status.set('loading');
      message.set('');
  
      try {
        const payload = {
          email: $email,
          whatsapp: $whatsapp,
          mac: $mac,
          ip: $ip,
          link_login: $linkLogin
        };
  
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
  
        if (res.redirected) {
          // Router redirected directly (successful Mikrotik login)
          window.location.href = res.url;
          return;
        }
  
        const data = await res.json();
        if (data.success) {
          status.set('success');
          message.set('Registration successful! Redirecting...');
          // Optional: redirect manually if API doesn’t
          if ($linkLogin) {
            window.location.href = `${$linkLogin}?username=${encodeURIComponent($email || $whatsapp)}&password=${encodeURIComponent($mac)}`;
          }
        } else {
          status.set('error');
          message.set(data.error || 'Registration failed');
        }
      } catch (err) {
        console.error(err);
        status.set('error');
        message.set('Unexpected error, please try again');
      }
    }
  </script>
  
  <main class="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
    <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
      <h1 class="text-2xl font-bold mb-4 text-center">Wi-Fi Access Portal</h1>
      <p class="text-gray-600 mb-6 text-center">
        Please enter your email or WhatsApp number to get internet access.
      </p>
  
      <form on:submit={handleSubmit} class="flex flex-col gap-4">
        <label class="flex flex-col">
          <span class="text-sm text-gray-700 mb-1">Email</span>
          <input
            type="email"
            placeholder="you@example.com"
            bind:value={$email}
            class="border rounded-lg p-2"
          />
        </label>
  
        <label class="flex flex-col">
          <span class="text-sm text-gray-700 mb-1">WhatsApp</span>
          <input
            type="text"
            placeholder="+62..."
            bind:value={$whatsapp}
            class="border rounded-lg p-2"
          />
        </label>
  
        <button
          type="submit"
          class="bg-blue-600 text-white rounded-lg py-2 mt-2 hover:bg-blue-700 disabled:opacity-60"
          disabled={$status === 'loading'}
        >
          {#if $status === 'loading'}
            Registering...
          {:else}
            Connect to Wi-Fi
          {/if}
        </button>
      </form>
  
      {#if $message}
        <p class="mt-4 text-center text-sm { $status === 'error' ? 'text-red-600' : 'text-green-600' }">
          {$message}
        </p>
      {/if}
    </div>
  </main>
  