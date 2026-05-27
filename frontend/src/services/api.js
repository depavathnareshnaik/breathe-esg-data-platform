const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const auth = {
  getToken() {
    return localStorage.getItem('esg_token');
  },
  getUser() {
    const userStr = localStorage.getItem('esg_user');
    return userStr ? JSON.parse(userStr) : null;
  },
  setSession(token, user) {
    localStorage.setItem('esg_token', token);
    localStorage.setItem('esg_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('esg_token');
    localStorage.removeItem('esg_user');
  },
  isAuthenticated() {
    return !!this.getToken();
  }
};

async function apiRequest(endpoint, options = {}) {
  const token = auth.getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }

  // Do not set Content-Type header if sending FormData (multipart/form-data)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const cleanBaseUrl = API_BASE_URL.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  const url = `${cleanBaseUrl}/${cleanEndpoint}`;

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorData = {};
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { error: response.statusText };
    }
    throw { status: response.status, ...errorData };
  }

  return response.json();
}

export const api = {
  login(username, password) {
    return apiRequest('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },

  getTenants() {
    return apiRequest('/tenants/');
  },

  uploadFile(file, sourceType, tenantId = null) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_type', sourceType);
    if (tenantId) {
      formData.append('tenant_id', tenantId);
    }
    return apiRequest('/ingestion/upload/', {
      method: 'POST',
      body: formData
    });
  },

  getRecords(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    return apiRequest(`/records/?${query.toString()}`);
  },

  getRecord(id) {
    return apiRequest(`/records/${id}/`);
  },

  updateRecord(id, fields, reason) {
    return apiRequest(`/records/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ ...fields, reason })
    });
  },

  approveRecord(id, comment) {
    return apiRequest(`/records/${id}/approve/`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
  },

  rejectRecord(id, reason) {
    return apiRequest(`/records/${id}/reject/`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  getRecordAuditHistory(id) {
    return apiRequest(`/records/${id}/audit-history/`);
  },

  getGlobalAuditLogs(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    return apiRequest(`/audit-logs/?${query.toString()}`);
  }
};
