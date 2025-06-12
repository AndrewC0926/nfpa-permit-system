import axios, { AxiosError } from 'axios';
import { Permit, AIReview, PermitStatus, PermitType } from '../types';

// For Vite, we use import.meta.env
declare global {
    interface ImportMeta {
        env: {
            VITE_API_BASE_URL: string;
        }
    }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor for authentication
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export interface DashboardStats {
  totalPermits: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  averageProcessingTime: number;
  complianceRate: number;
}

export interface SystemStatus {
  permitTypes: string[];
  systemVersion: string;
  lastUpdated: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const handleApiError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;
    if (axiosError.response) {
      throw new ApiError(
        axiosError.response.status,
        axiosError.response.data?.message || 'An error occurred while processing your request'
      );
    }
    throw new ApiError(500, 'Network error occurred');
  }
  throw new ApiError(500, 'An unexpected error occurred');
};

const api = {
  // HTTP methods
  get: async <T>(url: string, config?: any): Promise<T> => {
    try {
      const response = await axiosInstance.get<T>(url, config);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  post: async <T>(url: string, data?: any, config?: any): Promise<T> => {
    try {
      const response = await axiosInstance.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  patch: async <T>(url: string, data?: any, config?: any): Promise<T> => {
    try {
      const response = await axiosInstance.patch<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get system status and permit types
  getStatus: async (): Promise<SystemStatus> => {
    try {
      const response = await axiosInstance.get<SystemStatus>('/status');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get all permits with optional filters
  getPermits: async (filters?: Record<string, unknown>): Promise<Permit[]> => {
    try {
      const response = await axiosInstance.get<Permit[]>('/permits', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Create a new permit
  createPermit: async (permitData: Omit<Permit, 'id'>): Promise<Permit> => {
    try {
      const response = await axiosInstance.post<Permit>('/permits', permitData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get dashboard statistics
  getDashboardStats: async (): Promise<DashboardStats> => {
    try {
      const response = await axiosInstance.get<DashboardStats>('/dashboard/stats');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

export default api;

// Auth API
export const authApi = {
    login: async (email: string, password: string) => {
        const response = await axiosInstance.post('/auth/login', { email, password });
        return response.data;
    },
    register: async (userData: any) => {
        const response = await axiosInstance.post('/auth/register', userData);
        return response.data;
    },
    refreshToken: async () => {
        const response = await axiosInstance.post('/auth/refresh-token');
        return response.data;
    }
};

// Permit API
export const permitApi = {
    createPermit: async (permitData: any) => {
        const response = await axiosInstance.post('/permits', permitData);
        return response.data;
    },
    uploadDocument: async (permitId: string, formData: FormData) => {
        const response = await axiosInstance.post(`/permits/${permitId}/documents`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },
    runAIComplianceCheck: async (permitId: string) => {
        const response = await axiosInstance.post(`/permits/${permitId}/compliance-check`);
        return response.data;
    },
    getComplianceRequirements: async () => {
        const response = await axiosInstance.get('/permits/compliance-requirements');
        return response.data;
    }
};

const aiApi = {
  // Get AI review details
  getReviewDetails: async (reviewId: string): Promise<AIReview> => {
    const response = await axiosInstance.get(`/ai/reviews/${reviewId}`);
    return response.data;
  },

  // Request manual AI review
  requestReview: async (permitId: string): Promise<{ reviewId: string }> => {
    const response = await axiosInstance.post(`/ai/reviews/request`, { permitId });
    return response.data;
  },
}; 