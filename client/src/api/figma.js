import api from './client'

export const figmaApi = {
  get:  (projectId)       => api.get(`/projects/${projectId}/figma`),
  set:  (projectId, data) => api.put(`/projects/${projectId}/figma`, data),
  sync: (projectId)       => api.get(`/projects/${projectId}/figma/sync`),
}
