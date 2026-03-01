import api from './client'

export const personasApi = {
  create: (projectId, data)   => api.post(`/projects/${projectId}/personas`, data),
  update: (projectId, pid, data) => api.put(`/projects/${projectId}/personas/${pid}`, data),
  delete: (projectId, pid)    => api.delete(`/projects/${projectId}/personas/${pid}`),
}
