import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const AuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const [activeTab, setActiveTab] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const modalRef = useRef(null);

  // Login form state
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  // Register form state
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });

  const { login, register } = useAuth();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setError('');
      setActiveTab('login');
      setLoginData({ email: '', password: '' });
      setRegisterData({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on click outside
  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(loginData.email, loginData.password);
      onAuthSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (registerData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(registerData.name, registerData.email, registerData.password, registerData.phone);
      onAuthSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={handleOverlayClick}>
      <div className="auth-modal" ref={modalRef}>
        {/* Close button */}
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {/* Header */}
        <div className="auth-modal-header">
          <div className="auth-modal-icon">🔒</div>
          <h2 className="auth-modal-title">Sign in to continue</h2>
          <p className="auth-modal-subtitle">
            Please log in or create an account to add items to your cart.
          </p>
        </div>

        {/* Tabs */}
        <div className="auth-modal-tabs">
          <button
            className={`auth-modal-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('login'); setError(''); }}
          >
            Sign In
          </button>
          <button
            className={`auth-modal-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => { setActiveTab('register'); setError(''); }}
          >
            Create Account
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="auth-modal-error">
            {error}
          </div>
        )}

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="auth-modal-form">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <p className="auth-modal-switch">
              Don't have an account?{' '}
              <button
                type="button"
                className="auth-modal-switch-btn"
                onClick={() => { setActiveTab('register'); setError(''); }}
              >
                Create one
              </button>
            </p>
          </form>
        )}

        {/* Register Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="auth-modal-form">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={registerData.name}
                onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone (optional)</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+91 98765 43210"
                value={registerData.phone}
                onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
              />
            </div>

            <div className="auth-modal-row">
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Min 6 chars"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <p className="auth-modal-switch">
              Already have an account?{' '}
              <button
                type="button"
                className="auth-modal-switch-btn"
                onClick={() => { setActiveTab('login'); setError(''); }}
              >
                Sign in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
