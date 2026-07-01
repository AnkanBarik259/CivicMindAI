import { useAuthStore } from '../store';

const API_BASE = '/api';

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}`;
      try {
        const text = await response.text();
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If not JSON, it might be HTML, log it to console
          console.error("Non-JSON error response:", text.substring(0, 200));
          errorMessage = "Server returned an invalid response (not JSON).";
        }
      } catch (e) {}
      
      if (response.status === 401) {
        useAuthStore.getState().logout();
      }
      
      throw new Error(errorMessage);
    }

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Non-JSON success response:", text.substring(0, 200));
      throw new Error("Server returned an invalid response (not JSON).");
    }
  } catch (error) {
    throw error;
  }
}

export const api = {
  auth: {
    login: (data: any, customToken?: string) => {
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      if (customToken) headers.set('Authorization', `Bearer ${customToken}`);
      
      return fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      }).then(res => res.json());
    },
    register: (data: any) => fetchWithAuth('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: () => fetchWithAuth('/auth/me'),
  },
  reports: {
    getAll: () => fetchWithAuth('/report').then(res => res.reports || []),
    getOne: (id: string) => fetchWithAuth(`/report/${id}`).then(res => res.report || res),
    create: (data: any) => {
      const isFormData = data instanceof FormData;
      return fetchWithAuth('/report', { 
        method: 'POST', 
        body: isFormData ? data : JSON.stringify(data) 
      });
    },
    getComments: (id: string) => fetchWithAuth(`/report/${id}/comments`).then(res => res.comments || []),
    addComment: (id: string, text: string) => fetchWithAuth(`/report/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text })
    }),
    reverify: (id: string, vote: "still_exists" | "cleared") => fetchWithAuth(`/report/${id}/reverify`, {
      method: "POST",
      body: JSON.stringify({ vote })
    }),
    resolve: (id: string) => fetchWithAuth(`/report/${id}/resolve`, {
      method: "POST"
    }),
  },
  ai: {
    chat: (message: string, history?: any[]) => fetchWithAuth('/ai/chat', { method: 'POST', body: JSON.stringify({ message, history: history || [] }) }),
    analyzeRoute: (primaryRoute: any, alternativeRoutes: any[]) => fetchWithAuth('/ai/analyze-route', { method: 'POST', body: JSON.stringify({ primaryRoute, alternativeRoutes }) }).then(res => res.data),
  },
  analytics: {
    getStats: () => fetchWithAuth('/analytics'),
  }
};
