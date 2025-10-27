<script lang="ts">
  import { onMount } from 'svelte';

  let mac = '';
  let ip = '';
  let link_login = '';
  let email = '';
  let whatsapp = '';

  // Grab MikroTik query params: ?mac=...&ip=...&link-login=...
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    mac = params.get('mac') || '';
    ip = params.get('ip') || '';
    link_login = params.get('link-login') || '';
  });
</script>

<!-- Simple captive form -->
<div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
  <div class="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
    <h1 class="text-2xl font-semibold mb-4 text-center text-gray-800">
      Welcome to Hotspot
    </h1>
    <p class="text-gray-500 text-center mb-6">
      Please enter your contact information to connect
    </p>

    <!-- Direct form POST to /api/register -->
    <form action="/api/register" method="post" class="space-y-4">
      <input
        type="hidden"
        name="mac"
        bind:value={mac}
      />
      <input
        type="hidden"
        name="ip"
        bind:value={ip}
      />
      <input
        type="hidden"
        name="link_login"
        bind:value={link_login}
      />

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          name="email"
          bind:value={email}
          placeholder="your@email.com"
          required
          class="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring focus:ring-indigo-200"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
        <input
          type="text"
          name="whatsapp"
          bind:value={whatsapp}
          placeholder="+62..."
          class="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring focus:ring-indigo-200"
        />
      </div>

      <button
        type="submit"
        class="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition"
      >
        Connect
      </button>
    </form>
  </div>
</div>
