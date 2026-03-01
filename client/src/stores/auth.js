import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('uxlog_token') || null)
  const user  = ref(JSON.parse(localStorage.getItem('uxlog_user') || 'null'))

  const isAuthenticated = computed(() => !!token.value)

  async function login(idToken) {
    const res = await authApi.googleLogin(idToken)
    token.value = res.data.token
    user.value  = res.data.user
    localStorage.setItem('uxlog_token', token.value)
    localStorage.setItem('uxlog_user', JSON.stringify(user.value))
  }

  async function logout() {
    try { await authApi.logout() } catch { /* ignore */ }
    token.value = null
    user.value  = null
    localStorage.removeItem('uxlog_token')
    localStorage.removeItem('uxlog_user')
  }

  return { token, user, isAuthenticated, login, logout }
})
