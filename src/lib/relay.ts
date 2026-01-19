const API_BASE_URL = 'https://opencode-relay-server.fly.dev';

export interface Device {
  id: number;
  name: string;
  subdomain: string;
  auth_user: string;
  auth_password: string;
  online: boolean;
  last_seen: string;
}

export interface FrpcConfig {
  server_addr: string;
  server_port: string;
  token: string;
  subdomain: string;
  domain: string;
  local_port: string;
  auth_user: string;
  auth_password: string;
}

export interface User {
  id: number;
  email: string;
}

export const relay = {
  async register(email: string, password: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Registration failed');
    }
    return response.json();
  },

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }
    return response.json();
  },

  async getDevices(token: string): Promise<Device[]> {
    const response = await fetch(`${API_BASE_URL}/api/devices`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch devices');
    }
    return response.json();
  },

  async getFrpcConfig(token: string, deviceId: number): Promise<FrpcConfig> {
    const response = await fetch(`${API_BASE_URL}/api/devices/${deviceId}/frpc-config`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch frpc config');
    }
    return response.json();
  },

  async deleteDevice(token: string, deviceId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/devices/${deviceId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete device');
    }
  },
};
