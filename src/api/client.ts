import axios, { AxiosInstance } from 'axios';
import { BentoError, BentoErrorCode } from '../errors/bento-error';
import { AnalysisResult } from '../types';
import { BENTO_GUARD_DEFAULT_URL, DEFAULT_TIMEOUT } from '../constants';
export class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: BENTO_GUARD_DEFAULT_URL,
      timeout: DEFAULT_TIMEOUT,
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
      console.error(`[SDK] GET ERROR: ${error.message} (Status: ${error.response?.status})`);
      throw BentoError.fromError(error);
    }
  }

  public async postTransaction(payload: {
    agent_pubkey: string;
    wallet_address: string;
    encrypted_payload: string;
    signature: string;
    base64_tx: string;
    network: string;
  }): Promise<AnalysisResult> {
    try {
      const response = await this.axiosInstance.post('/api/v1/transactions', payload);
      if (!response.data?.data) {
        throw new BentoError(BentoErrorCode.NETWORK_ERROR, 'Invalid response format');
      }
      return response.data.data;
    } catch (error: any) {
      console.error(`[SDK] POST ERROR: ${error.message} (Status: ${error.response?.status})`);
      if (error.response?.data) {
        console.error('[SDK] Server response:', JSON.stringify(error.response.data, null, 2));
      }
      throw BentoError.fromError(error);
    }
  }

  public async updateActionDecision(actionId: string, decision: 'ALLOW' | 'BLOCKED'): Promise<any> {
    try {
      const response = await this.axiosInstance.post(`/api/v1/actions/${actionId}/decision`, { decision });
      return response.data.data;
    } catch (error: any) {
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
