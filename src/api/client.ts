import axios, { AxiosInstance } from 'axios';

export class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor(baseURL: string) {
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 30000,
    });
  }

  public async getSystemPublicKey() {
    const response = await this.axiosInstance.get('/api/v1/system/public-key');
    // All backend responses follow { success: true, data: ..., timestamp: ... }
    return response.data.data.publicKey;
  }

  public async postTransaction(payload: any) {
    const response = await this.axiosInstance.post('/api/v1/transactions', payload);
    return response.data;
  }
}
