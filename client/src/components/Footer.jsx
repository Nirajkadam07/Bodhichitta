import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <Link to="/" className="logo">
            <div className="logo-icon">B</div>
            <span className="logo-text">Bodhichitta</span>
          </Link>
          <p className="footer-description">
            We craft minimal, effective skincare made from responsibly-sourced botanicals. 
            Every formula is cruelty-free and designed to respect sensitive skin.
          </p>
        </div>

        <div className="footer-column">
          <h4 className="footer-column-title">Quick Links</h4>
          <nav className="footer-links">
            <Link to="/products" className="footer-link">All Products</Link>
            <Link to="/products?category=hair-care" className="footer-link">Hair Care</Link>
            <Link to="/products?category=skin-care" className="footer-link">Skin Care</Link>
            <Link to="/products?category=essential-oils" className="footer-link">Essential Oils</Link>
          </nav>
        </div>

        <div className="footer-column">
          <h4 className="footer-column-title">Contact</h4>
          <div className="footer-links">
            <p className="footer-link">hello@bodhichitta.com</p>
            <p className="footer-link">+91 9XXXX XXXX0</p>
            <p className="footer-link">Mumbai, India</p>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div>© {new Date().getFullYear()} <strong>Bodhichitta</strong> — All rights reserved.</div>
        <div>Designed with care · Natural · Clean · Effective</div>
      </div>
    </footer>
  );
};

export default Footer;
