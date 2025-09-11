import axios from 'axios';

// Fix the base URL to use your Railway backend directly
const BASE_URL = process.env.REACT_APP_API_URL || 'https://nakama-production-1850.up.railway.app';

console.log('API Base URL:', BASE_URL); // Debug log to verify URL

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      // Don't set default Content-Type - let axios handle it automatically
      headers: {
        'Accept': 'application/json',
      }
    });

    this.authHeaders = {};

    // Add request interceptor for debugging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        console.log('Request headers:', config.headers);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for debugging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('API Response Error:', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  setAuthHeaders(headers) {
    this.authHeaders = headers;
  }

  clearAuthHeaders() {
    this.authHeaders = {};
  }

  hasAuthHeaders() {
    return Object.keys(this.authHeaders).length > 0;
  }

  getAuthHeaders() {
    // Return a Map-like object that has a .get() method
    return {
      get: (key) => this.authHeaders[key]
    };
  }

  async request(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: endpoint,
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders,
        },
      };

      if (data) {
        config.data = data;
      }

      const response = await this.client(config);
      return response.data;
    } catch (error) {
      console.error('API Service Error:', {
        endpoint,
        method,
        error: error.response?.data || error.message
      });
      throw error.response?.data || error.message;
    }
  }

  // Profile endpoints
  getProfile = async () => {
    return this.request('GET', '/api/profile');
  }

  updateProfile = async (profileData) => {
    return this.request('POST', '/api/profile', profileData);
  }

  uploadProfilePicture = async (formData) => {
    try {
      const config = {
        method: 'POST',
        url: '/api/profile/picture',
        headers: {
          // Don't set Content-Type for FormData - let axios handle it
          ...this.authHeaders,
        },
        data: formData,
      };

      const response = await this.client(config);
      return response.data;
    } catch (error) {
      console.error('Upload Profile Picture Error:', error.response?.data || error.message);
      throw error.response?.data || error.message;
    }
  }

  // User search
  searchUser = async (username) => {
    return this.request('GET', `/api/users/search/${username}`);
  }

  // Contacts endpoints
  getContacts = async () => {
    return this.request('GET', '/api/contacts');
  }

  addContact = async (username) => {
    return this.request('POST', '/api/contacts', { username });
  }

  removeContact = async (username) => {
    return this.request('DELETE', `/api/contacts/${username}`);
  }

  // Transaction endpoints
  prepareTransaction = async (transactionData) => {
    return this.request('POST', '/api/transactions/prepare', transactionData);
  }

  submitTransaction = async (signedTransactionData) => {
    return this.request('POST', '/api/transactions/submit', signedTransactionData);
  }

  getTransactions = async () => {
    return this.request('GET', '/api/transactions');
  }

  // OAuth endpoints
  authorizeOAuth = async (oauthData) => {
    return this.request('POST', '/api/oauth/authorize', oauthData);
  }

  // Add EVM address to current user
  addEVM = async () => {
    return this.request('POST', '/api/profile/add-evm');
  }
}

export const api = new ApiService();
