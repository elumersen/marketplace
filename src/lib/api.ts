import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type {
  LoginResponse,
  RegisterResponse,
  ProfileResponse,
  CreateUserData,
  UpdateUserData,
  User,
  Account,
  CreateAccountData,
  Customer,
  CreateCustomerData,
  Vendor,
  CreateVendorData,
  Item,
  CreateItemData,
  Invoice,
  CreateInvoiceData,
  InvoiceQueryParams,
  Bill,
  CreateBillData,
  BillQueryParams,
  Transaction,
  CreateTransactionData,
  TransactionQueryParams,
  AccountRegister,
  BankAccount,
  CreateBankAccountData,
  JournalEntry,
  CreateJournalEntryData,
  UpdateJournalEntryData,
  JournalEntryQueryParams,
  Reconciliation,
  CreateReconciliationData,
  ReconciliationQueryParams,
  AccountQueryParams,
  PaginatedResponse,
  JournalEntryStatus,
} from '@/types/api.types';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
export const tokenManager = {
  getToken: (): string | null => {
    return localStorage.getItem('token');
  },
  
  setToken: (token: string): void => {
    localStorage.setItem('token', token);
  },
  
  removeToken: (): void => {
    localStorage.removeItem('token');
  },
};

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenManager.getToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - only redirect to login if not already on login page
          // and if there's a token (meaning the user was authenticated)
          const isLoginRequest = error.config?.url?.includes('/auth/login');
          if (!isLoginRequest && tokenManager.getToken()) {
            tokenManager.removeToken();
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
          break;
          
        case 403:
          // Forbidden
          console.error('Access forbidden:', data);
          break;
          
        case 404:
          // Not found
          console.error('Resource not found:', data);
          break;
          
        case 500:
          // Server error
          console.error('Server error:', data);
          break;
          
        default:
          console.error('API error:', data);
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('Network error - no response received:', error.request);
    } else {
      // Error in request setup
      console.error('Request error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Generic API methods
export const api = {
  /**
   * GET request
   */
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.get<T>(url, config);
    return response.data;
  },

  /**
   * POST request
   */
  post: async <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response = await apiClient.post<T>(url, data, config);
    return response.data;
  },

  /**
   * PUT request
   */
  put: async <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response = await apiClient.put<T>(url, data, config);
    return response.data;
  },

  /**
   * PATCH request
   */
  patch: async <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response = await apiClient.patch<T>(url, data, config);
    return response.data;
  },

  /**
   * DELETE request
   */
  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.delete<T>(url, config);
    return response.data;
  },
};

// API Error handling helper
export interface ApiErrorResponse {
  message: string;
  error?: string;
  statusCode?: number;
}

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    return (
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error ||
      axiosError.message ||
      'An unexpected error occurred'
    );
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

// Specific API endpoints
export const authAPI = {
  login: (email: string, password: string): Promise<LoginResponse> =>
    api.post<LoginResponse>('/auth/login', { email, password }),
    
  register: (data: CreateUserData): Promise<RegisterResponse> =>
    api.post<RegisterResponse>('/auth/register', data),
    
  getProfile: (): Promise<ProfileResponse> =>
    api.get<ProfileResponse>('/auth/profile'),
    
  updateProfile: (data: UpdateUserData): Promise<{ message: string; user: User }> =>
    api.put('/auth/profile', data),
    
  changePassword: (data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> =>
    api.post('/auth/change-password', data),
};

export const userAPI = {
  getAll: (): Promise<User[]> => api.get<User[]>('/users'),
  getById: (id: string): Promise<User> => api.get<User>(`/users/${id}`),
  create: (data: CreateUserData): Promise<User> => api.post<User>('/users', data),
  update: (id: string, data: UpdateUserData): Promise<User> => api.put<User>(`/users/${id}`, data),
  delete: (id: string): Promise<void> => api.delete(`/users/${id}`),
};

export const accountAPI = {
  getAll: (params?: AccountQueryParams): Promise<PaginatedResponse<Account> & { success: boolean; message: string }> => 
    api.get<PaginatedResponse<Account> & { success: boolean; message: string }>('/accounts', { params }),
  getById: (id: string): Promise<{ success: boolean; message: string; data: Account }> => 
    api.get<{ success: boolean; message: string; data: Account }>(`/accounts/${id}`),
  create: (data: CreateAccountData): Promise<{ success: boolean; message: string; data: Account }> => 
    api.post<{ success: boolean; message: string; data: Account }>('/accounts', data),
  update: (id: string, data: Partial<CreateAccountData>): Promise<{ success: boolean; message: string; data: Account }> => 
    api.put<{ success: boolean; message: string; data: Account }>(`/accounts/${id}`, data),
  toggleStatus: (id: string): Promise<{ success: boolean; message: string; data: Account }> => 
    api.patch<{ success: boolean; message: string; data: Account }>(`/accounts/${id}/toggle-status`),
  delete: (id: string): Promise<{ success: boolean; message: string; data: null }> => 
    api.delete<{ success: boolean; message: string; data: null }>(`/accounts/${id}`),
};

export const transactionAPI = {
  getAll: (params?: TransactionQueryParams): Promise<Transaction[]> => api.get<Transaction[]>('/transactions', { params }),
  getById: (id: string): Promise<Transaction> => api.get<Transaction>(`/transactions/${id}`),
  create: (data: CreateTransactionData): Promise<Transaction> => api.post<Transaction>('/transactions', data),
  update: (id: string, data: Partial<CreateTransactionData>): Promise<Transaction> => api.put<Transaction>(`/transactions/${id}`, data),
  delete: (id: string): Promise<void> => api.delete(`/transactions/${id}`),
  getAccountRegister: (accountId: string, params?: { startDate?: string; endDate?: string }): Promise<AccountRegister> => 
    api.get<AccountRegister>(`/transactions/register/${accountId}`, { params }),
};

export const customerAPI = {
  getAll: (): Promise<{ success: boolean; message: string; data: Customer[] }> => 
    api.get<{ success: boolean; message: string; data: Customer[] }>('/customers'),
  getById: (id: string): Promise<{ success: boolean; message: string; data: Customer }> => 
    api.get<{ success: boolean; message: string; data: Customer }>(`/customers/${id}`),
  create: (data: CreateCustomerData): Promise<{ success: boolean; message: string; data: Customer }> => 
    api.post<{ success: boolean; message: string; data: Customer }>('/customers', data),
  update: (id: string, data: Partial<CreateCustomerData>): Promise<{ success: boolean; message: string; data: Customer }> => 
    api.put<{ success: boolean; message: string; data: Customer }>(`/customers/${id}`, data),
  delete: (id: string): Promise<void> => api.delete(`/customers/${id}`),
};

export const vendorAPI = {
  getAll: (): Promise<{ success: boolean; message: string; data: Vendor[] }> => 
    api.get<{ success: boolean; message: string; data: Vendor[] }>('/vendors'),
  getById: (id: string): Promise<{ success: boolean; message: string; data: Vendor }> => 
    api.get<{ success: boolean; message: string; data: Vendor }>(`/vendors/${id}`),
  create: (data: CreateVendorData): Promise<{ success: boolean; message: string; data: Vendor }> => 
    api.post<{ success: boolean; message: string; data: Vendor }>('/vendors', data),
  update: (id: string, data: Partial<CreateVendorData>): Promise<{ success: boolean; message: string; data: Vendor }> => 
    api.put<{ success: boolean; message: string; data: Vendor }>(`/vendors/${id}`, data),
  delete: (id: string): Promise<void> => api.delete(`/vendors/${id}`),
};

export const invoiceAPI = {
  getAll: (params?: InvoiceQueryParams): Promise<Invoice[]> => api.get<Invoice[]>('/invoices', { params }),
  getById: (id: string): Promise<Invoice> => api.get<Invoice>(`/invoices/${id}`),
  create: (data: CreateInvoiceData): Promise<Invoice> => api.post<Invoice>('/invoices', data),
  update: (id: string, data: Partial<CreateInvoiceData>): Promise<Invoice> => api.put<Invoice>(`/invoices/${id}`, data),
  delete: (id: string): Promise<void> => api.delete(`/invoices/${id}`),
};

export const billAPI = {
  getAll: (params?: BillQueryParams): Promise<Bill[]> => api.get<Bill[]>('/bills', { params }),
  getById: (id: string): Promise<Bill> => api.get<Bill>(`/bills/${id}`),
  create: (data: CreateBillData): Promise<Bill> => api.post<Bill>('/bills', data),
  update: (id: string, data: Partial<CreateBillData>): Promise<Bill> => api.put<Bill>(`/bills/${id}`, data),
  delete: (id: string): Promise<void> => api.delete(`/bills/${id}`),
};

export const itemAPI = {
  getAll: (): Promise<Item[]> => api.get<Item[]>('/items'),
  getById: (id: string): Promise<Item> => api.get<Item>(`/items/${id}`),
  create: (data: CreateItemData): Promise<Item> => api.post<Item>('/items', data),
  update: (id: string, data: Partial<CreateItemData>): Promise<Item> => api.put<Item>(`/items/${id}`, data),
  delete: (id: string): Promise<void> => api.delete(`/items/${id}`),
};

export const journalEntryAPI = {
  getAll: (params?: JournalEntryQueryParams): Promise<{ journalEntries: JournalEntry[] }> => 
    api.get<{ journalEntries: JournalEntry[] }>('/journal-entries', { params }),
  getById: (id: string): Promise<{ journalEntry: JournalEntry }> => 
    api.get<{ journalEntry: JournalEntry }>(`/journal-entries/${id}`),
  create: (data: CreateJournalEntryData): Promise<{ message: string; journalEntry: JournalEntry }> => 
    api.post<{ message: string; journalEntry: JournalEntry }>('/journal-entries', data),
  update: (id: string, data: UpdateJournalEntryData): Promise<{ message: string; journalEntry: JournalEntry }> => 
    api.put<{ message: string; journalEntry: JournalEntry }>(`/journal-entries/${id}`, data),
  updateStatus: (id: string, status: JournalEntryStatus): Promise<{ message: string; journalEntry: JournalEntry }> => 
    api.patch<{ message: string; journalEntry: JournalEntry }>(`/journal-entries/${id}/status`, { status }),
  delete: (id: string): Promise<{ message: string }> => 
    api.delete<{ message: string }>(`/journal-entries/${id}`),
};

export const bankAccountAPI = {
  getAll: (): Promise<BankAccount[]> => api.get<{ bankAccounts: BankAccount[] }>('/bank-accounts').then(res => res.bankAccounts),
  getById: (id: string): Promise<BankAccount> => api.get<{ bankAccount: BankAccount }>(`/bank-accounts/${id}`).then(res => res.bankAccount),
  create: (data: CreateBankAccountData): Promise<BankAccount> => api.post<{ bankAccount: BankAccount }>('/bank-accounts', data).then(res => res.bankAccount),
  update: (id: string, data: Partial<CreateBankAccountData>): Promise<BankAccount> => api.put<{ bankAccount: BankAccount }>(`/bank-accounts/${id}`, data).then(res => res.bankAccount),
  delete: (id: string): Promise<void> => api.delete(`/bank-accounts/${id}`),
};

export const reconciliationAPI = {
  getAll: (params?: ReconciliationQueryParams): Promise<Reconciliation[]> => api.get<Reconciliation[]>('/reconciliations', { params }),
  getById: (id: string): Promise<Reconciliation> => api.get<Reconciliation>(`/reconciliations/${id}`),
  create: (data: CreateReconciliationData): Promise<Reconciliation> => api.post<Reconciliation>('/reconciliations', data),
  update: (id: string, data: Partial<CreateReconciliationData>): Promise<Reconciliation> => api.put<Reconciliation>(`/reconciliations/${id}`, data),
  delete: (id: string): Promise<void> => api.delete(`/reconciliations/${id}`),
};

// Export the main axios instance for advanced use cases
export default apiClient;

