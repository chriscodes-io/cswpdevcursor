const API_URL = process.env.REACT_APP_BACKEND_URL;

// ⚠️ SECURITY WARNING: Token Storage in localStorage
// Current implementation stores JWT tokens in localStorage for development convenience.
//
// KNOWN VULNERABILITIES:
// - Susceptible to XSS attacks (any malicious script can access localStorage)
// - No httpOnly protection
// - Persists across browser sessions
//
// PRODUCTION MIGRATION REQUIRED:
// Before production deployment, implement httpOnly cookies:
// 1. Backend: Set token in httpOnly cookie instead of JSON response
// 2. Frontend: Remove localStorage usage - browser sends cookie automatically
// 3. Add CSRF protection (SameSite=Strict, CSRF tokens)
//
// See /app/SECURITY_NOTES.md for implementation guide
//
// eslint-disable-next-line no-unused-vars
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new Error(error.detail || 'An error occurred');
  }
  return response.json();
};

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(response);
  },

  register: async (email, name, password) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password })
    });
    return handleResponse(response);
  },

  getMe: async () => {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse(response);
  },

  logout: async () => {
    const response = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Logout failed' }));
      throw new Error(error.detail || 'Logout failed');
    }
    return response.json();
  },
};

// Clients API
export const clientsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/api/clients`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getOne: async (id) => {
    const response = await fetch(`${API_URL}/api/clients/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  create: async (data) => {
    const response = await fetch(`${API_URL}/api/clients`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  update: async (id, data) => {
    const response = await fetch(`${API_URL}/api/clients/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  delete: async (id) => {
    const response = await fetch(`${API_URL}/api/clients/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// Projects API
export const projectsAPI = {
  getAll: async (clientId = null) => {
    const url = clientId
      ? `${API_URL}/api/projects?client_id=${clientId}`
      : `${API_URL}/api/projects`;
    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getOne: async (id) => {
    const response = await fetch(`${API_URL}/api/projects/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  create: async (data) => {
    const response = await fetch(`${API_URL}/api/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  update: async (id, data) => {
    const response = await fetch(`${API_URL}/api/projects/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  delete: async (id) => {
    const response = await fetch(`${API_URL}/api/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// Tasks API
export const tasksAPI = {
  getAll: async (projectId = null) => {
    const url = projectId
      ? `${API_URL}/api/tasks?project_id=${projectId}`
      : `${API_URL}/api/tasks`;
    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getOne: async (id) => {
    const response = await fetch(`${API_URL}/api/tasks/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  create: async (data) => {
    const response = await fetch(`${API_URL}/api/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  update: async (id, data) => {
    const response = await fetch(`${API_URL}/api/tasks/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  delete: async (id) => {
    const response = await fetch(`${API_URL}/api/tasks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    const response = await fetch(`${API_URL}/api/dashboard/stats`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// SEO Audit API
export const seoAuditAPI = {
  runAudit: async (projectId, url, strategy = 'mobile') => {
    const response = await fetch(`${API_URL}/api/seo-audit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ project_id: projectId, url, strategy })
    });
    return handleResponse(response);
  },

  getAudits: async (projectId) => {
    const response = await fetch(`${API_URL}/api/seo-audit/${projectId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getStatus: async () => {
    const response = await fetch(`${API_URL}/api/seo-audit-status`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getActionPlan: async (auditId) => {
    const response = await fetch(`${API_URL}/api/seo-audit/${auditId}/action-plan`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getReport: async (auditId, { company = '', createdBy = '' } = {}) => {
    const params = new URLSearchParams();
    if (company) params.set('company', company);
    if (createdBy) params.set('created_by', createdBy);
    const qs = params.toString();
    const response = await fetch(
      `${API_URL}/api/seo-audit/report/${auditId}${qs ? `?${qs}` : ''}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse(response);
  }
};

export function downloadSeoReportJson(report, filename = 'seo-report.json') {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Public Contact API (no auth)
export const contactAPI = {
  submit: async (data) => {
    const response = await fetch(`${API_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  list: async () => {
    const response = await fetch(`${API_URL}/api/contact`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// Stripe Payments API
export const paymentsAPI = {
  createCheckout: async (projectId, description) => {
    const response = await fetch(`${API_URL}/api/payments/checkout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        project_id: projectId,
        origin_url: window.location.origin,
        description: description || null,
      })
    });
    return handleResponse(response);
  },

  getStatus: async (sessionId) => {
    const response = await fetch(`${API_URL}/api/payments/status/${sessionId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  list: async (projectId = null) => {
    const url = projectId
      ? `${API_URL}/api/payments?project_id=${projectId}`
      : `${API_URL}/api/payments`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse(response);
  }
};
