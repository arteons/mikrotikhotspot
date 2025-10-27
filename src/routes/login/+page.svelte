<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  let email = '';
  let whatsapp = '';
  let mac = '';
  let ip = '';
  let link_login = '';

  // On load, parse query params passed from MikroTik redirect
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    mac = params.get('mac') || '';
    ip = params.get('ip') || '';
    link_login = params.get('link-login') || '';

    console.log('Captured params:', { mac, ip, link_login });
  });

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('email', email);
    formData.append('whatsapp', whatsapp);
    formData.append('mac', mac);
    formData.append('ip', ip);
    formData.append('link_login', link_login);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        body: formData
      });

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        // 🔥 MikroTik auto-login HTML — replace current page
        const html = await res.text();
        document.open();
        document.write(html);
        document.close();
        return;
      }

      const data = await res.json();
      if (!data.success) {
        alert('Registration failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Connection error — please try again.');
    }
  }
</script>

<svelte:head>
  <title>Wi-Fi Login Portal</title>
</svelte:head>

<main class="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
  <div class="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
    <h1 class="text-2xl font-bold mb-4">Connect to Wi-Fi</h1>
    <p class="text-gray-600 mb-6">
      Please enter your email or WhatsApp number to access the internet.
    </p>

    <form on:submit={handleSubmit} class="flex flex-col gap-4">
      <input
        type="email"
        placeholder="Email address"
        bind:value={email}
        required
        class="border rounded-lg p-3 focus:outline-none focus:ring focus:ring-blue-200"
      />
      <input
        type="text"
        placeholder="WhatsApp number (optional)"
        bind:value={whatsapp}
        class="border rounded-lg p-3 focus:outline-none focus:ring focus:ring-blue-200"
      />

      <input type="hidden" name="mac" value={mac} />
      <input type="hidden" name="ip" value={ip} />
      <input type="hidden" name="link_login" value={link_login} />

      <button
        type="submit"
        class="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
      >
        Connect
      </button>
    </form>
  </div>
</main>

<style>
  main {
    font-family: system-ui, sans-serif;
  }
</style>
