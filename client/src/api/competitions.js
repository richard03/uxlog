import api from './client'

export const competitionsApi = {
  create:  (projectId, data) => api.post(`/projects/${projectId}/competitions`, data),
  update:  (projectId, cid, data) => api.put(`/projects/${projectId}/competitions/${cid}`, data),
  delete:  (projectId, cid) => api.delete(`/projects/${projectId}/competitions/${cid}`),
}
