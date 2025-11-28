import axios, { AxiosResponse } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  console.log('🔐 API Request Debug:', {
    url: config.url,
    method: config.method,
    hasToken: !!token,
    tokenLength: token?.length,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
  })
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('❌ API Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    })
    
    if (error.response?.status === 401) {
      console.log('🚫 401 Unauthorized - Clearing auth data and redirecting to login')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Types
export interface User {
  id: number
  name: string
  email: string
  emp_code?: string
  role: 'admin' | 'adviser'
  is_active: boolean
  created_at: string
}

export interface Ticket {
  id: number
  customer_email: string
  customer_name?: string
  subject: string
  status: 'Open' | 'Pending' | 'Closed'
  assigned_to?: number
  language_id?: number
  voc_id?: number
  priority_id?: number
  channel?: 'email' | 'instagram' | 'facebook' | 'whatsapp'
  channel_identifier?: string
  created_at: string
  updated_at: string
  assigned_user?: User
  language?: { id: number; name: string }
  voc?: { id: number; name: string }
  priority?: { id: number; name: string; weight: number }
}

export interface TicketMessage {
  id: number
  direction: 'inbound' | 'outbound'
  from_email: string
  to_email: string
  subject: string
  body: string
  attachments_json?: string
  sent_at: string
  created_by?: number
}

export interface CategoryLanguage {
  id: number
  name: string
  is_active: boolean
}

export interface CategoryVOC {
  id: number
  name: string
  is_active: boolean
}

export interface CategoryPriority {
  id: number
  name: string
  weight: number
  is_active: boolean
}

export interface EmailTemplate {
  id: number
  name: string
  subject: string
  body: string
}

export interface BlockedSender {
  id: number
  email: string
  reason?: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export interface TicketListResponse {
  tickets: Ticket[]
  total: number
  page: number
  page_size: number
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response: AxiosResponse<LoginResponse> = await apiClient.post('/auth/login', {
      email,
      password
    })
    return response.data
  }
}

// Tickets API
export const ticketsAPI = {
  list: async (params?: {
    status?: string
    priority_id?: number
    assigned_to?: number
    unassigned?: boolean
    search?: string
    page?: number
    page_size?: number
  }): Promise<TicketListResponse> => {
    const response: AxiosResponse<TicketListResponse> = await apiClient.get('/tickets', { params })
    return response.data
  },

  get: async (id: number): Promise<Ticket> => {
    const response: AxiosResponse<Ticket> = await apiClient.get(`/tickets/${id}`)
    return response.data
  },

  update: async (id: number, data: Partial<Ticket>): Promise<Ticket> => {
    const response: AxiosResponse<Ticket> = await apiClient.patch(`/tickets/${id}`, data)
    return response.data
  },

  getMessages: async (id: number, page?: number, page_size?: number): Promise<TicketMessage[]> => {
    const response: AxiosResponse<TicketMessage[]> = await apiClient.get(`/tickets/${id}/messages`, {
      params: { page, page_size }
    })
    return response.data
  },

//   reply: async (id: number, text: string, template_id?: number, close_after?: boolean): Promise<any> => {
//     const payload: Record<string, any> = {
//         text: text.trim(),
//         close_after: close_after ?? false,
//     }
//     if (template_id) {
//         payload.template_id = template_id
//     }
//     const response = await apiClient.post(`/tickets/${id}/reply`, { text, template_id, close_after })
//     return response.data
//   },

  reply: async (id: number, text: string, template_id?: number, close_after?: boolean, files?: File[]) => {
    const form = new FormData();
    form.append("text", text);
    form.append("close_after", String(close_after ?? false));

    if (template_id) form.append("template_id", String(template_id));
    if (files) files.forEach(file => form.append("attachments", file)); // ⬅ videos/images

    return apiClient.post(`/tickets/${id}/reply`, form, {
        headers: { "Content-Type": "multipart/form-data" },
    });
  },


  reassign: async (id: number, assigned_to: number): Promise<any> => {
    const response = await apiClient.post(`/tickets/${id}/reassign`, { assigned_to })
    return response.data
  },


  addNote(ticketId: number, note: string) {
      return apiClient.post(`/ticket-notes/${ticketId}`, { note });
  },

  getNotes(ticketId: number) {
      return apiClient.get(`/ticket-notes/${ticketId}`).then(res => res.data);
  }

}

// Users API (admin only)
export const usersAPI = {
  list: async (params?: { role?: string; is_active?: boolean }): Promise<User[]> => {
    const response: AxiosResponse<User[]> = await apiClient.get('/users', { params })
    return response.data
  },

  create: async (data: { name: string; email: string; emp_code?: string; role: string; password: string; is_active?: boolean }): Promise<User> => {
    const response: AxiosResponse<User> = await apiClient.post('/users', data)
    return response.data
  },

  update: async (id: number, data: Partial<User>): Promise<User> => {
    const response: AxiosResponse<User> = await apiClient.patch(`/users/${id}`, data)
    return response.data
  }
}

// Categories API (admin only)
export const categoriesAPI = {
  languages: {
    list: async (): Promise<CategoryLanguage[]> => {
      const response: AxiosResponse<CategoryLanguage[]> = await apiClient.get('/categories/language')
      return response.data
    },
    create: async (data: { name: string; is_active?: boolean }): Promise<CategoryLanguage> => {
      const response: AxiosResponse<CategoryLanguage> = await apiClient.post('/categories/language', data)
      return response.data
    },
    update: async (id: number, data: Partial<CategoryLanguage>): Promise<CategoryLanguage> => {
      const response: AxiosResponse<CategoryLanguage> = await apiClient.patch(`/categories/language/${id}`, data)
      return response.data
    }
  },

  vocs: {
    list: async (): Promise<CategoryVOC[]> => {
      const response: AxiosResponse<CategoryVOC[]> = await apiClient.get('/categories/voc')
      return response.data
    },
    create: async (data: { name: string; is_active?: boolean }): Promise<CategoryVOC> => {
      const response: AxiosResponse<CategoryVOC> = await apiClient.post('/categories/voc', data)
      return response.data
    },
    update: async (id: number, data: Partial<CategoryVOC>): Promise<CategoryVOC> => {
      const response: AxiosResponse<CategoryVOC> = await apiClient.patch(`/categories/voc/${id}`, data)
      return response.data
    }
  },

  priorities: {
    list: async (): Promise<CategoryPriority[]> => {
      const response: AxiosResponse<CategoryPriority[]> = await apiClient.get('/categories/priority')
      return response.data
    },
    create: async (data: { name: string; weight?: number; is_active?: boolean }): Promise<CategoryPriority> => {
      const response: AxiosResponse<CategoryPriority> = await apiClient.post('/categories/priority', data)
      return response.data
    },
    update: async (id: number, data: Partial<CategoryPriority>): Promise<CategoryPriority> => {
      const response: AxiosResponse<CategoryPriority> = await apiClient.patch(`/categories/priority/${id}`, data)
      return response.data
    }
  }
}

// Templates API (admin only)
export const templatesAPI = {
  list: async (): Promise<EmailTemplate[]> => {
    const response: AxiosResponse<EmailTemplate[]> = await apiClient.get('/templates')
    return response.data
  },

  get: async (id: number): Promise<EmailTemplate> => {
    const response: AxiosResponse<EmailTemplate> = await apiClient.get(`/templates/${id}`)
    return response.data
  },

  create: async (data: { name: string; subject: string; body: string }): Promise<EmailTemplate> => {
    const response: AxiosResponse<EmailTemplate> = await apiClient.post('/templates', data)
    return response.data
  },

  update: async (id: number, data: Partial<EmailTemplate>): Promise<EmailTemplate> => {
    const response: AxiosResponse<EmailTemplate> = await apiClient.patch(`/templates/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<any> => {
    const response = await apiClient.delete(`/templates/${id}`)
    return response.data
  }
}

// Email API
// export const emailsAPI = {
//   send: async (data: {
//     to: string
//     cc?: string
//     bcc?: string
//     subject: string
//     body: string
//     template_id?: number
//   }): Promise<any> => {
//     const response = await apiClient.post('/emails/send', data)
//     return response.data
//   }
// }


export const emailsAPI = {
  send: async (formData: FormData): Promise<any> => {
    const response = await apiClient.post('/emails/send', formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
    return response.data;
  }
};



// Blocked Senders API (admin only)
export const blockedSendersAPI = {
  list: async (): Promise<BlockedSender[]> => {
    const response: AxiosResponse<BlockedSender[]> = await apiClient.get('/blocked-senders')
    return response.data
  },

  create: async (data: { email: string; reason?: string }): Promise<BlockedSender> => {
    const response: AxiosResponse<BlockedSender> = await apiClient.post('/blocked-senders', data)
    return response.data
  },

  delete: async (id: number): Promise<any> => {
    const response = await apiClient.delete(`/blocked-senders/${id}`)
    return response.data
  }
}


export const bulkEmailAPI = {
  upload: async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)

    return apiClient.post("/bulk-emails/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    })
  },

  download: async () => {
    return apiClient.get("/bulk-emails/download", { responseType: "blob" })
  },

  sendAll: async () => {
    return apiClient.post("/bulk-emails/send-all")
  }
}

export default apiClient 