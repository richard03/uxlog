import api from './client'

export const tasksApi = {
  list:   (projectId)          => api.get(`/projects/${projectId}/tasks`),
  create: (projectId, data)    => api.post(`/projects/${projectId}/tasks`, data),
  update: (projectId, tid, data) => api.put(`/projects/${projectId}/tasks/${tid}`, data),
  delete: (projectId, tid)     => api.delete(`/projects/${projectId}/tasks/${tid}`),
}
