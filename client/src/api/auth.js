import api from './client'

export const authApi = {
  googleLogin: (idToken) => api.post('/auth/google', { id_token: idToken }),
  logout: () => api.delete('/auth/logout'),
}
