"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { API_ENDPOINTS } from "../config/api";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem("authToken");
    console.log(
      "AuthContext: Checking for existing token:",
      token ? "Found" : "Not found"
    );
    if (token) {
      // Validate token with backend
      validateToken(token);
    } else {
      console.log("AuthContext: No token found, setting isLoading to false");
      setIsLoading(false);
    }
  }, []);

  const validateToken = async (token: string) => {
    console.log("AuthContext: Validating token...");
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.PROFILE, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("AuthContext: Profile response status:", response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log("AuthContext: Token valid, user data:", userData);
        setUser(userData);
      } else {
        console.log("AuthContext: Token validation failed, removing token");
        localStorage.removeItem("authToken");
        setUser(null);
      }
    } catch (error) {
      console.error("AuthContext: Token validation error:", error);
      localStorage.removeItem("authToken");
      setUser(null);
    } finally {
      console.log("AuthContext: Setting isLoading to false");
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("authToken", data.token);
        setUser(data.user);
        return true;
      } else {
        const errorData = await response.json();
        console.error("Login failed:", errorData.error);
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.REGISTER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("authToken", data.token);
        setUser(data.user);
        return true;
      } else {
        const errorData = await response.json();
        console.error("Registration failed:", errorData.error);
        return false;
      }
    } catch (error) {
      console.error("Registration error:", error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
