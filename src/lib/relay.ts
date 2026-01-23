const API_BASE_URL = 'https://opencode-relay.azurewebsites.net';

export interface Device {
  id: number;
  name: string;
  subdomain: string;
  auth_user: string;
  auth_password: string;
  online: boolean;
  last_seen: string;
  encryption_key?: string;
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
  async sendVerification(email: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/send-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send verification code');
    }
  },

  async register(email: string, password: string, code: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, code }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Registration failed');
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
      const text = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(text);
      } catch {
        errorData = { message: text };
      }
      throw new Error(errorData.message || errorData.error || 'Failed to fetch devices');
    }
    const data = await response.json();
    return data;
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

  async updateDevice(token: string, deviceId: number, name: string): Promise<Device> {
    const response = await fetch(`${API_BASE_URL}/api/devices/${deviceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update device');
    }
    return response.json();
  },

  async completePairing(
    relayUrl: string,
    token: string,
    pairingId: string,
    pairingCode: string,
    deviceName: string
  ): Promise<{ device: Device }> {
    const response = await fetch(`${relayUrl}/api/pairing/${pairingId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        pairing_code: pairingCode,
        device_name: deviceName 
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to complete pairing');
    }
    return response.json();
  },
};
