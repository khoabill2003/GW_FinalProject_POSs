/**
 * ============================================================================
 * AUTH CONTEXT - Quản lý trạng thái đăng nhập toàn ứng dụng
 * ============================================================================
 * 
 * KIẾN TRÚC:
 * - Sử dụng React Context API để share state authentication giữa các components
 * - Pattern: Provider wrap toàn bộ app, các component con dùng useAuth() hook
 * 
 * TẠI SAO DÙNG CONTEXT THAY VÌ REDUX?
 * - Quy mô app vừa phải, state không quá phức tạp
 * - Giảm boilerplate code, dễ maintain
 * - Built-in trong React, không cần thêm dependencies
 * 
 * LƯU TRỮ SESSION:
 * - Dùng sessionStorage thay vì localStorage
 * - sessionStorage: Mất khi đóng tab/browser (bảo mật hơn)
 * - localStorage: Giữ lâu dài (tiện lợi nhưng kém bảo mật)
 * 
 * BẢO MẬT:
 * - Không lưu password, chỉ lưu user info sau khi đã verify
 * - Có thể mở rộng thêm JWT token nếu cần
 */
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ============================================================================
// TYPESCRIPT INTERFACES - Định nghĩa kiểu dữ liệu
// ============================================================================

/**
 * User Interface - Thông tin người dùng
 * @property id - ID unique của user
 * @property email - Email đăng nhập
 * @property name - Tên hiển thị
 * @property role - Vai trò: owner | manager | waiter | kitchen | cashier
 */
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

/**
 * AuthState - Trạng thái authentication
 * @property user - User hiện tại (null nếu chưa đăng nhập)
 * @property isLoading - Đang check session (hiển thị loading)
 * @property isAuthenticated - Đã đăng nhập hay chưa
 */
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * AuthContextType - Các method và state expose ra ngoài
 * Mở rộng từ AuthState, thêm các hàm login, register, logout
 */
interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

// ============================================================================
// CONTEXT CREATION - Tạo Context với giá trị mặc định null
// ============================================================================
// Giá trị null để detect nếu component không nằm trong Provider
const AuthContext = createContext<AuthContextType | null>(null);

// ============================================================================
// AUTH PROVIDER - Component Provider wrap toàn bộ app
// ============================================================================
/**
 * AuthProvider Component
 * - Wrap trong layout.tsx ở root để tất cả pages đều access được
 * - Cung cấp user state và các method authentication
 * 
 * USAGE:
 * // Trong layout.tsx:
 * <AuthProvider>
 *   <CartProvider>
 *     {children}
 *   </CartProvider>
 * </AuthProvider>
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // State quản lý toàn bộ trạng thái auth
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,      // Bắt đầu là true để check session
    isAuthenticated: false,
  });

  // ========================================================================
  // SESSION RECOVERY - Khôi phục session khi reload page
  // ========================================================================
  /**
   * useEffect chạy một lần khi component mount
   * Kiểm tra sessionStorage có user đã lưu không
   * 
   * WHY sessionStorage?
   * - Tự động clear khi đóng browser tab
   * - Không share giữa các tab (bảo mật hơn)
   */
  useEffect(() => {
    const storedUser = sessionStorage.getItem('pos_user');
    if (storedUser) {
      try {
        // Parse JSON và restore session
        const user = JSON.parse(storedUser);
        setState({ user, isLoading: false, isAuthenticated: true });
      } catch {
        // JSON không hợp lệ -> xóa và reset
        sessionStorage.removeItem('pos_user');
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    } else {
      // Không có session -> chưa đăng nhập
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []); // Empty deps = chỉ chạy 1 lần khi mount

  // ========================================================================
  // LOGIN FUNCTION - Xử lý đăng nhập
  // ========================================================================
  /**
   * Gọi API đăng nhập và cập nhật state
   * 
   * FLOW:
   * 1. POST /api/auth/login với email, password
   * 2. Server verify password bằng bcrypt
   * 3. Nếu thành công: lưu user vào sessionStorage + update state
   * 4. Nếu thất bại: trả về error message
   * 
   * @param email - Email đăng nhập
   * @param password - Mật khẩu (plain text, server sẽ hash verify)
   * @returns Promise<{success, error?}>
   */
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Gọi API login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.user) {
        // SUCCESS: Lưu session và update state
        sessionStorage.setItem('pos_user', JSON.stringify(data.user));
        setState({ user: data.user, isLoading: false, isAuthenticated: true });
        return { success: true };
      } else {
        // FAILED: Trả về error từ server
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch {
      // NETWORK ERROR: Không thể kết nối server
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok && data.user) {
        sessionStorage.setItem('pos_user', JSON.stringify(data.user));
        setState({ user: data.user, isLoading: false, isAuthenticated: true });
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('pos_user');
    setState({ user: null, isLoading: false, isAuthenticated: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
