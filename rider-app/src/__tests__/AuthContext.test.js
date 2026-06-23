import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api');

let AuthProvider, useAuth;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import('../context/AuthContext.jsx');
  AuthProvider = mod.AuthProvider;
  useAuth = mod.useAuth;
});

describe('AuthContext', () => {
  it('exports AuthProvider and useAuth', () => {
    expect(AuthProvider).toBeDefined();
    expect(useAuth).toBeDefined();
  });
});
