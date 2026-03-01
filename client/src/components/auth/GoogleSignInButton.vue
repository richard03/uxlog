<template>
  <div ref="container" class="gsi-wrap"></div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const container = ref(null)
const auth      = useAuthStore()
const router    = useRouter()

const emit = defineEmits(['error'])

onMounted(() => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
    emit('error', 'Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID in .env.development')
    return
  }

  // Load Google Identity Services script
  if (!window.google?.accounts) {
    const script    = document.createElement('script')
    script.src      = 'https://accounts.google.com/gsi/client'
    script.async    = true
    script.defer    = true
    script.onload   = initGoogle
    document.head.appendChild(script)
  } else {
    initGoogle()
  }

  function initGoogle() {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback:  handleCredential,
    })
    window.google.accounts.id.renderButton(container.value, {
      theme: 'outline',
      size:  'large',
      width: 300,
    })
  }

  async function handleCredential(response) {
    try {
      await auth.login(response.credential)
      router.push('/')
    } catch (e) {
      emit('error', e.response?.data?.error || 'Login failed')
    }
  }
})
</script>

<style scoped>
.gsi-wrap {
  display: flex;
  justify-content: center;
}
</style>
