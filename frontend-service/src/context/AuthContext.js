import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Default credentials (in production, this should be handled by backend)
const DEFAULT_USERS = [
  {
    id: 1,
    email: 'admin@parking.com',
    password: 'admin123',
    name: 'System Admin',
    role: 'ADMIN',
    phone: null // Admin doesn't need phone
  },
  {
    id: 2,
    email: 'user@parking.com',
    password: 'user123',
    name: 'Demo User',
    role: 'USER',
    phone: '+91 9876543210'
  }
];

// Storage key for registered users
const USERS_STORAGE_KEY = 'parking_users';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsPhoneNumber, setNeedsPhoneNumber] = useState(false);

  // Initialize users in localStorage if not exists
  useEffect(() => {
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (!storedUsers) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    }
  }, []);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
        // Check if user needs to add phone number
        if (parsedUser.role === 'USER' && !parsedUser.phone) {
          setNeedsPhoneNumber(true);
        }
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const getUsers = () => {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_USERS;
  };

  // Admin login with email + password
  const loginAdmin = (email, password) => {
    return new Promise((resolve, reject) => {
      const users = getUsers();
      const foundUser = users.find(
        u => u.email.toLowerCase() === email.toLowerCase() &&
             u.password === password &&
             u.role === 'ADMIN'
      );

      if (foundUser) {
        const userData = {
          id: foundUser.id,
          email: foundUser.email,
          name: foundUser.name,
          role: foundUser.role,
          phone: foundUser.phone,
          loginTime: new Date().toISOString()
        };
        const token = btoa(JSON.stringify({
          id: foundUser.id,
          email: foundUser.email,
          role: foundUser.role,
          exp: Date.now() + 86400000
        }));

        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);

        setUser(userData);
        setIsAuthenticated(true);
        setNeedsPhoneNumber(false);
        resolve(userData);
      } else {
        reject(new Error('Invalid admin credentials'));
      }
    });
  };

  // User login (simulating Google OAuth2)
  const loginUser = (email, password) => {
    return new Promise((resolve, reject) => {
      const users = getUsers();
      const foundUser = users.find(
        u => u.email.toLowerCase() === email.toLowerCase() &&
             u.password === password &&
             u.role === 'USER'
      );

      if (foundUser) {
        const userData = {
          id: foundUser.id,
          email: foundUser.email,
          name: foundUser.name,
          role: foundUser.role,
          phone: foundUser.phone,
          loginTime: new Date().toISOString()
        };
        const token = btoa(JSON.stringify({
          id: foundUser.id,
          email: foundUser.email,
          role: foundUser.role,
          exp: Date.now() + 86400000
        }));

        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);

        setUser(userData);
        setIsAuthenticated(true);

        // Check if phone number is needed (first login)
        if (!foundUser.phone) {
          setNeedsPhoneNumber(true);
        }

        resolve(userData);
      } else {
        reject(new Error('Invalid credentials'));
      }
    });
  };

  // Generic login (auto-detect role)
  const login = (email, password) => {
    return new Promise((resolve, reject) => {
      const users = getUsers();
      const foundUser = users.find(
        u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );

      if (foundUser) {
        const userData = {
          id: foundUser.id,
          email: foundUser.email,
          name: foundUser.name,
          role: foundUser.role,
          phone: foundUser.phone,
          loginTime: new Date().toISOString()
        };
        const token = btoa(JSON.stringify({
          id: foundUser.id,
          email: foundUser.email,
          role: foundUser.role,
          exp: Date.now() + 86400000
        }));

        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);

        setUser(userData);
        setIsAuthenticated(true);

        // Check if phone number is needed for users
        if (foundUser.role === 'USER' && !foundUser.phone) {
          setNeedsPhoneNumber(true);
        }

        resolve(userData);
      } else {
        reject(new Error('Invalid email or password'));
      }
    });
  };

  // Register new user (USER role only)
  const register = (email, password, name, phone = null) => {
    return new Promise((resolve, reject) => {
      const users = getUsers();

      // Check if email already exists
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        reject(new Error('Email already registered'));
        return;
      }

      // Create new user with USER role
      const newUser = {
        id: users.length + 1,
        email: email,
        password: password,
        name: name,
        role: 'USER',
        phone: phone
      };

      users.push(newUser);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

      // Auto-login after registration
      const userData = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        phone: newUser.phone,
        loginTime: new Date().toISOString()
      };
      const token = btoa(JSON.stringify({
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        exp: Date.now() + 86400000
      }));

      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', token);

      setUser(userData);
      setIsAuthenticated(true);
      setNeedsPhoneNumber(!phone); // Need phone if not provided
      resolve(userData);
    });
  };

  // Update user phone number (for first login requirement)
  const updatePhone = (phone) => {
    return new Promise((resolve, reject) => {
      if (!user) {
        reject(new Error('Not logged in'));
        return;
      }

      const users = getUsers();
      const userIndex = users.findIndex(u => u.id === user.id);

      if (userIndex === -1) {
        reject(new Error('User not found'));
        return;
      }

      users[userIndex].phone = phone;
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

      const updatedUser = { ...user, phone };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setNeedsPhoneNumber(false);

      resolve(updatedUser);
    });
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    setNeedsPhoneNumber(false);
  };

  const isAdmin = () => {
    return user?.role === 'ADMIN';
  };

  const isUser = () => {
    return user?.role === 'USER';
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    needsPhoneNumber,
    login,
    loginAdmin,
    loginUser,
    register,
    updatePhone,
    logout,
    isAdmin,
    isUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
