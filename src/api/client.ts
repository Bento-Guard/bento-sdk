import axios, { AxiosInstance } from 'axios';
import { BentoError, BentoErrorCode } from '../errors/bento-error';
import { AnalysisResult } from '../types';

export class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor(baseURL: string) {
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 30000,
    });
  }

  public async getSystemPublicKey(): Promise<string> {
    try {
      const response = await this.axiosInstance.get('/api/v1/system/public-key');
      if (!response.data?.success || !response.data?.data?.publicKey) {
        throw new BentoError(BentoErrorCode.NETWORK_ERROR, 'Failed to retrieve system public key from backend');
      }
      return response.data.data.publicKey;
    } catch (error: any) {
      throw BentoError.fromError(error);
    }
  }

  public async postTransaction(payload: any): Promise<AnalysisResult> {
    try {
      const response = await this.axiosInstance.post('/api/v1/transactions', payload);
      if (!response.data?.success || !response.data?.data) {
        throw new BentoError(BentoErrorCode.NETWORK_ERROR, 'Failed to submit transaction to backend');
      }
      return response.data.data;
    } catch (error: any) {
      throw BentoError.fromError(error);
    }
  }
}
