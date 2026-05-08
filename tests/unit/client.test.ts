import { BentoGuardClient } from '../../src/core/client';
import { BentoError } from '../../src/errors/bento-error';

describe('BentoGuardClient Singleton', () => {
  beforeEach(() => {
    // Hack to clear the singleton instance for testing
    // @ts-ignore
    BentoGuardClient.instance = undefined;
  });

  it('should throw error when getting instance before initialization', () => {
    expect(() => BentoGuardClient.getInstance()).toThrow(BentoError);
    expect(() => BentoGuardClient.getInstance()).toThrow('BentoGuardClient has not been initialized');
  });

  it('should return the same instance when initialized multiple times', () => {
    const config = {
      agentWalletPrivateKey: 'test-wallet',
    };

    const instance1 = BentoGuardClient.initialize(config);
    const instance2 = BentoGuardClient.initialize({ ...config });
    const instance3 = BentoGuardClient.getInstance();

    expect(instance1).toBe(instance2);
    expect(instance2).toBe(instance3);
  });
});
