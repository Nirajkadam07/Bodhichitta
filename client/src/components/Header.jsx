import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Header = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { cartCount } = useCart();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <div className="logo-icon">B</div>
          <span className="logo-text">Bodhichitta</span>
        </Link>

        <nav className="nav-links">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/products" className="nav-link">Products</Link>
          <Link to="/about" className="nav-link">About</Link>
          <Link to="/contact" className="nav-link">Contact</Link>
        </nav>

        <div className="header-actions">
          <Link to="/cart" className="cart-button">
            🛒 Cart
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </Link>

          {isAuthenticated ? (
            <div className="user-menu">
              <button 
                className="user-button" 
                onClick={() => setShowDropdown(!showDropdown)}
              >
                👤 {user?.name?.split(' ')[0]}
              </button>

              {showDropdown && (
                <div className="user-dropdown">
                  {!isAdmin && (
                    <Link 
                      to="/orders" 
                      className="dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      My Orders
                    </Link>
                  )}
                  <Link 
                    to="/profile" 
                    className="dropdown-item"
                    onClick={() => setShowDropdown(false)}
                  >
                    Profile
                  </Link>
                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      className="dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      Admin Panel
                    </Link>
                  )}
                  <button 
                    className="dropdown-item danger" 
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="user-button">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
