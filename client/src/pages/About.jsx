import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">About Bodhichitta</h1>
        <p className="page-subtitle">Natural skincare, crafted with care</p>
      </div>

      <div className="about-grid">
        <div className="about-card">
          <h2>Our Story</h2>
          <p className="about-card-text">
            Bodhichitta was born from a simple belief: that skincare should be pure, effective, 
            and kind to both your skin and the planet. Founded in Mumbai, we craft minimal, 
            effective skincare made from responsibly-sourced botanicals.
          </p>
          <p className="about-card-text">
            Every formula is cruelty-free and designed to respect sensitive skin. We believe 
            in transparency, sustainability, and the transformative power of nature.
          </p>
        </div>

        <div className="about-card">
          <h2>Our Values</h2>
          <ul className="about-values-list">
            <li><strong>100% Natural</strong> — Only pure, plant-based ingredients</li>
            <li><strong>Cruelty-Free</strong> — Never tested on animals</li>
            <li><strong>Sustainable</strong> — Eco-friendly packaging</li>
            <li><strong>Made in India</strong> — Supporting local communities</li>
            <li><strong>Transparency</strong> — Full ingredient disclosure</li>
          </ul>
        </div>
      </div>

      <div className="about-cta">
        <h2>Ready to Transform Your Skin?</h2>
        <p>
          Discover our range of natural skincare products and start your journey to healthier, 
          glowing skin today.
        </p>
        <Link to="/products" className="btn btn-lg btn-white">
          Shop Now
        </Link>
      </div>
    </div>
  );
};

export default About;
