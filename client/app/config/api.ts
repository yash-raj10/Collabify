// API configuration utility
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080",
} as const;

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_CONFIG.BASE_URL}/api/auth/login`,
    REGISTER: `${API_CONFIG.BASE_URL}/api/auth/register`,
    PROFILE: `${API_CONFIG.BASE_URL}/api/profile`,
  },
  DOCUMENTS: `${API_CONFIG.BASE_URL}/api/documents`,
  DRAWINGS: `${API_CONFIG.BASE_URL}/api/drawings`,
  WEBSOCKET: `${API_CONFIG.WS_URL}/ws`,
} as const;

// Utility function to build WebSocket URL with session and token
export const buildWebSocketUrl = (sessionId: string, token: string): string => {
  return `${API_ENDPOINTS.WEBSOCKET}?session=${sessionId}&token=${token}`;
};

// Utility function to build document API URL
export const buildDocumentUrl = (docId?: string): string => {
  return docId
    ? `${API_ENDPOINTS.DOCUMENTS}/${docId}`
    : API_ENDPOINTS.DOCUMENTS;
};

// Utility function to build drawing API URL
export const buildDrawingUrl = (drawingId?: string): string => {
  return drawingId
    ? `${API_ENDPOINTS.DRAWINGS}/${drawingId}`
    : API_ENDPOINTS.DRAWINGS;
};
