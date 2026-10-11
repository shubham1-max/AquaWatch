import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== '')
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.PROD ? '' : 'http://localhost:5000');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add API key if available
api.interceptors.request.use(
  (config) => {
    const apiKey = localStorage.getItem('admin_api_key');
    if (apiKey) {
      config.headers['x-api-key'] = apiKey;
    }
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export const incidentAPI = {
  // Create new incident
  create: (data) => {
    if (data.photo) {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          formData.append(key, data[key]);
        }
      });
      return api.post('/api/incidents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    }
    return api.post('/api/incidents', data);
  },

  // Get all incidents
  getAll: (params) => api.get('/api/incidents', { params }),

  // Get single incident
  getById: (id) => api.get(`/api/incidents/${id}`),

  // Update incident (supports FormData with photo or JSON)
  update: (id, data) => {
    if (data instanceof FormData) {
      return api.patch(`/api/incidents/${id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    }
    if (data && data.photo) {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          formData.append(key, data[key]);
        }
      });
      return api.patch(`/api/incidents/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    }
    return api.patch(`/api/incidents/${id}`, data);
  },

  // Delete incident
  delete: (id) => api.delete(`/api/incidents/${id}`),

  // Confirm incident ("I saw this too")
  confirm: (id) => api.post(`/api/incidents/${id}/confirm`),

  // Get nearby incidents
  getNearby: (params) => api.get('/api/incidents/location/nearby', { params }),

  // Get statistics
  getStats: () => api.get('/api/stats'),
  getLeaderboard: () => api.get('/api/stats/leaderboard')
};

export const statsAPI = {
  getStats: () => api.get('/api/stats'),
  getLeaderboard: () => api.get('/api/stats/leaderboard')
};

export const hotspotAPI = {
  // Get all hotspots
  getAll: (params) => api.get('/api/hotspots', { params }),

  // Get top priority hotspots
  getTopPriority: (limit = 10) => api.get('/api/hotspots/priority/top', { params: { limit } }),

  // Get weather for hotspot
  getWeather: (id, latitude, longitude) =>
    api.get(`/api/hotspots/${id}/weather`, { params: { latitude, longitude } }),

  // Get recommendation
  getRecommendation: (id, data) =>
    api.post(`/api/hotspots/${id}/recommendation`, data)
};

export default api;
