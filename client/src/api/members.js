import api from './client'

export const membersApi = {
  list:   (projectId)           => api.get(`/projects/${projectId}/members`),
  create: (projectId, data)     => api.post(`/projects/${projectId}/members`, data),
  update: (projectId, mid, data) => api.put(`/projects/${projectId}/members/${mid}`, data),
  delete: (projectId, mid)      => api.delete(`/projects/${projectId}/members/${mid}`),
}
