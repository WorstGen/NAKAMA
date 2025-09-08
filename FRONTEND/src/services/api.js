import axios from 'axios';

// Fix the base URL to use your Railway backend directly
const BASE_URL = process.env.REACT_APP_API_URL || 'https://nakama-production-1850.up.railway.app';

console.log('API Base URL:', BASE_URL); // Debug log to verify URL

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      // Add CORS headers
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
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
  async getProfile() {
    return this.request('GET', '/api/profile');
  }

  async updateProfile(profileData) {
    return this.request('POST', '/api/profile', profileData);
  }

  async uploadProfilePicture(formData) {
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
  async searchUser(username) {
    return this.request('GET', `/api/users/search/${username}`);
  }

  // Contacts endpoints
  async getContacts() {
    return this.request('GET', '/api/contacts');
  }

  async addContact(username) {
    return this.request('POST', '/api/contacts', { username });
  }

  async removeContact(username) {
    return this.request('DELETE', `/api/contacts/${username}`);
  }

  // Transaction endpoints
  async prepareTransaction(transactionData) {
    return this.request('POST', '/api/transactions/prepare', transactionData);
  }

  async submitTransaction(signedTransactionData) {
    return this.request('POST', '/api/transactions/submit', signedTransactionData);
  }

  async getTransactions() {
    return this.request('GET', '/api/transactions');
  }

  // OAuth endpoints
  async authorizeOAuth(oauthData) {
    return this.request('POST', '/api/oauth/authorize', oauthData);
  }
}

export const api = new ApiService();
