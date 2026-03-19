import { useState } from 'react';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Contact form submitted:', formData);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="container">
        <div className="success-card">
          <div className="empty-state-icon">✓</div>
          <h2 className="empty-state-title">Message Sent!</h2>
          <p className="text-muted">
            Thank you for reaching out. We'll get back to you within 24-48 hours.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header-centered">
        <h1 className="page-title">Contact Us</h1>
        <p className="page-subtitle">We'd love to hear from you</p>
      </div>

      <div className="contact-grid">
        {/* Contact Info */}
        <div className="contact-card">
          <h3>Get in Touch</h3>
          
          <div className="contact-info-item">
            <div className="contact-info-label">Email</div>
            <div className="contact-info-value">hello@bodhichitta.com</div>
          </div>
          
          <div className="contact-info-item">
            <div className="contact-info-label">Phone</div>
            <div className="contact-info-value">+91 9XXXX XXXX0</div>
          </div>
          
          <div className="contact-info-item">
            <div className="contact-info-label">Address</div>
            <div className="contact-info-value">Mumbai, Maharashtra, India</div>
          </div>

          <div className="contact-hours-box">
            <div className="contact-info-label">Business Hours</div>
            <div className="contact-hours-text">
              Monday - Saturday: 10:00 AM - 7:00 PM<br/>
              Sunday: Closed
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="contact-card">
          <h3>Send a Message</h3>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                type="text"
                name="subject"
                className="form-input"
                value={formData.subject}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea
                name="message"
                className="form-input form-textarea"
                rows="4"
                value={formData.message}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
