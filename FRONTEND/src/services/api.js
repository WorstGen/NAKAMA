import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
    });

    this.authHeaders = {};
  }

  setAuthHeaders(headers) {
    this.authHeaders = headers;
  }

  clearAuthHeaders() {
    this.authHeaders = {};
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
      throw error.response?.data || error.message;
    }
  }

  // Profile endpoints
  async getProfile() {
    return this.request('GET', '/profile');
  }

  async updateProfile(profileData) {
    return this.request('POST', '/profile', profileData);
  }

  async uploadProfilePicture(formData) {
    const config = {
      method: 'POST',
      url: '/profile/picture',
      headers: {
        'Content-Type': 'multipart/form-data',
        ...this.authHeaders,
      },
      data: formData,
    };

    const response = await this.client(config);
    return response.data;
  }

  // User search
  async searchUser(username) {
    return this.request('GET', `/users/search/${username}`);
  }

  // Contacts endpoints
  async getContacts() {
    return this.request('GET', '/contacts');
  }

  async addContact(username) {
    return this.request('POST', '/contacts', { username });
  }

  async removeContact(username) {
    return this.request('DELETE', `/contacts/${username}`);
  }

  // Transaction endpoints
  async prepareTransaction(transactionData) {
    return this.request('POST', '/transactions/prepare', transactionData);
  }

  async submitTransaction(signedTransactionData) {
    return this.request('POST', '/transactions/submit', signedTransactionData);
  }

  async getTransactions() {
    return this.request('GET', '/transactions');
  }

  // OAuth endpoints
  async authorizeOAuth(oauthData) {
    return this.request('POST', '/oauth/authorize', oauthData);
  }
}

export const api = new ApiService();
