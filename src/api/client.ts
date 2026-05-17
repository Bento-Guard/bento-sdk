import axios, { AxiosInstance } from 'axios';
import { BentoError, BentoErrorCode } from '../errors/bento-error';
import { AnalysisResult } from '../types';
import { BENTO_GUARD_DEFAULT_URL, DEFAULT_TIMEOUT } from '../constants';
export class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor(baseUrl?: string, timeout?: number) {
    const configuredTimeout =
      timeout ??
      Number(
        process.env.BENTO_PROTECT_TIMEOUT_MS ||
          process.env.BENTO_TIMEOUT_MS ||
          DEFAULT_TIMEOUT,
      );

    this.axiosInstance = axios.create({
      baseURL: baseUrl || BENTO_GUARD_DEFAULT_URL,
      timeout: configuredTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public async getSystemPublicKey(): Promise<string> {
    try {
      const response = await this.axiosInstance.get('/api/v1/system/public-key');
      if (!response.data?.data?.publicKey) {
        throw new BentoError(BentoErrorCode.NETWORK_ERROR, 'Invalid public key format');
      }
      return response.data.data.publicKey;
    } catch (error: any) {
      const status = error.response?.status;
      const serverMessage = error.response?.data?.message || error.response?.data?.error?.message || error.message;
      console.error(`[SDK] GET ERROR: ${serverMessage} (Status: ${status || 'N/A'})`);
      throw BentoError.fromError(error);
    }
  }

  public async postTransaction(payload: {
    agent_address: string;
    wallet_address: string;
    encrypted_payload: string;
    signature: string;
    base64_tx: string;
    network: string;
  }, timeout?: number): Promise<AnalysisResult> {
    try {
      const response = await this.axiosInstance.post(
        '/api/v1/transactions',
        payload,
        timeout ? { timeout } : undefined,
      );
      if (!response.data?.data) {
        throw new BentoError(BentoErrorCode.NETWORK_ERROR, 'Invalid response format');
      }
      return response.data.data;
    } catch (error: any) {
      const status = error.response?.status;
      const serverData = error.response?.data;
      const serverMessage = serverData?.message || serverData?.error?.message || error.message;
      
      console.error(`[SDK] POST ERROR: ${serverMessage} (Status: ${status || 'N/A'})`);
      
      throw BentoError.fromError(error);
    }
  }


  public async getActionStatus(actionId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/api/v1/actions/${actionId}`);
      return response.data.data;
    } catch (error: any) {
      throw BentoError.fromError(error);
    }
  }
}
