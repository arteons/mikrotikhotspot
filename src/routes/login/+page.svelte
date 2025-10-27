<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
  
    let email = '';
    let whatsapp = '';
    let mac = '';
    let ip = '';
    let linkLogin = '';
  
    let loading = false;
    let message = '';
  
    // When page loads, capture MikroTik query params
    onMount(() => {
      const params = new URLSearchParams(window.location.search);
      mac = params.get('mac') || '';
      ip = params.get('ip') || '';
      linkLogin = params.get('link-login') || '';
    });
  
    async function handleSubmit() {
      if (!email && !whatsapp) {
        message = 'Please enter your email or WhatsApp number.';
        return;
      }
  
      loading = true;
      message = '';
  
      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, whatsapp, mac, ip })
        });
  
        const data = await res.json();
  
        if (data.success) {
          // redirect to MikroTik login
          const username = mac; // using MAC as username
          const password = mac; // using MAC as password
          const redirectUrl = `${linkLogin}?username=${username}&password=${password}`;
          message = 'Logging you in...';
          setTimeout(() => goto(redirectUrl), 1000);
        } else {
          message = data.message;
        }
      } catch (err) {
        console.error(err);
        message = 'Network error — please try again.';
      }
  
      loading = false;
    }
  </script>
  
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
    <div class="bg-white p-6 rounded-2xl shadow-md w-full max-w-sm">
      <h1 class="text-xl font-semibold mb-4 text-center">Wi-Fi Access Portal</h1>
  
      <form on:submit|preventDefault={handleSubmit} class="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Enter your email"
          bind:value={email}
          class="border p-2 rounded"
        />
        <input
          type="tel"
          placeholder="WhatsApp number (optional)"
          bind:value={whatsapp}
          class="border p-2 rounded"
        />
  
        <button
          type="submit"
          class="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </form>
  
      {#if message}
        <p class="text-center text-sm mt-4 text-gray-600">{message}</p>
      {/if}
    </div>
  </div>
  