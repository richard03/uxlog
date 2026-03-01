<template>
  <div class="login-page">
    <div class="login-card">
      <h1>UXLog</h1>
      <p class="tagline">UX process logging made simple.</p>
      <ErrorBanner :message="loginError" @dismiss="loginError = null" />
      <GoogleSignInButton @error="loginError = $event" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue'
import ErrorBanner        from '@/components/ui/ErrorBanner.vue'

const loginError = ref(null)
</script>

<style scoped>
.login-page {
  min-height: 100vh; display: flex;
  align-items: center; justify-content: center;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
}
.login-card {
  background: #fff; border-radius: 16px;
  padding: 2.5rem 2rem; width: min(380px, 92vw);
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
h1 { margin: 0 0 0.5rem; font-size: 2rem; color: #4f46e5; }
.tagline { color: #6b7280; margin: 0 0 2rem; font-size: 0.95rem; }
</style>
