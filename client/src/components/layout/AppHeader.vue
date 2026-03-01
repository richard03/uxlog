<template>
  <header class="app-header">
    <RouterLink to="/" class="logo">UXLog</RouterLink>
    <nav v-if="auth.isAuthenticated" class="nav-right">
      <span class="user-name">{{ auth.user?.name }}</span>
      <img v-if="auth.user?.avatar_url" :src="auth.user.avatar_url" class="avatar" alt="avatar" />
      <button class="logout-btn" @click="handleLogout">Sign out</button>
    </nav>
  </header>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth   = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.app-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 1.5rem;
  height: 56px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
  position: sticky; top: 0; z-index: 100;
}
.logo {
  font-size: 1.25rem; font-weight: 700;
  color: #4f46e5; text-decoration: none;
}
.nav-right { display: flex; align-items: center; gap: 0.75rem; }
.user-name { font-size: 0.9rem; color: #374151; }
.avatar { width: 30px; height: 30px; border-radius: 50%; }
.logout-btn {
  font-size: 0.875rem; padding: 0.375rem 0.875rem;
  border: 1px solid #d1d5db; border-radius: 6px;
  background: #fff; cursor: pointer; color: #374151;
}
.logout-btn:hover { background: #f9fafb; }
</style>
