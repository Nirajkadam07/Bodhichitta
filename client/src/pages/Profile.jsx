import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const Profile = () => {
  const { user, updateUser } = useAuth();
  
  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '' // Ensure phone is handled
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Address State
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressError, setAddressError] = useState('');

  // Address Modal State
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    full_name: '', line1: '', line2: '', city: '', state: '', postal_code: '', country: 'India', phone: '', is_default: false
  });
  const [addressSubmitting, setAddressSubmitting] = useState(false);

  // Load data
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        phone: user.phone || ''
      });
      fetchAddresses();
    }
  }, [user]);

  const fetchAddresses = async () => {
    try {
      setAddressesLoading(true);
      const res = await authAPI.getAddresses();
      setAddresses(res.data.addresses);
    } catch (err) {
      setAddressError('Failed to load addresses');
    } finally {
      setAddressesLoading(false);
    }
  };

  // --- Profile Handlers ---
  const handleProfileChange = (e) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      await authAPI.updateProfile(profileForm);
      updateUser({ name: profileForm.name, phone: profileForm.phone });
      setProfileSuccess('Profile updated successfully!');
      setIsEditingProfile(false);
    } catch (err) {
      setProfileError(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // --- Address Handlers ---
  const openAddAddressModal = () => {
    setAddressForm({ full_name: user?.name || '', line1: '', line2: '', city: '', state: '', postal_code: '', country: 'India', phone: user?.phone || '', is_default: addresses.length === 0 });
    setEditingAddressId(null);
    setShowAddressModal(true);
  };

  const openEditAddressModal = (address) => {
    setAddressForm({ ...address });
    setEditingAddressId(address.id);
    setShowAddressModal(true);
  };

  const closeAddressModal = () => {
    setShowAddressModal(false);
    setAddressForm({ full_name: '', line1: '', line2: '', city: '', state: '', postal_code: '', country: 'India', phone: '', is_default: false });
    setEditingAddressId(null);
  };

  const handleAddressChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setAddressForm({ ...addressForm, [e.target.name]: value });
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setAddressSubmitting(true);
    try {
      if (editingAddressId) {
        await authAPI.updateAddress(editingAddressId, addressForm);
      } else {
        await authAPI.addAddress(addressForm);
      }
      closeAddressModal();
      fetchAddresses();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to save address');
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      await authAPI.deleteAddress(id);
      fetchAddresses();
    } catch (err) {
      alert('Failed to delete address');
    }
  };

  const handleSetDefaultAddress = async (address) => {
    try {
      await authAPI.updateAddress(address.id, { ...address, is_default: true });
      fetchAddresses();
    } catch (err) {
      alert('Failed to set default address');
    }
  };

  if (!user) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div className="container py-4">
      <div className="profile-layout">
        <h1 className="page-title mb-4">My Account</h1>
        
        <div className="profile-grid">
          {/* Personal Info Section */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h3>Personal Information</h3>
              {!isEditingProfile && (
                <button className="btn btn-secondary btn-sm" onClick={() => setIsEditingProfile(true)}>
                  Edit
                </button>
              )}
            </div>
            
            <div className="profile-card-body">
              {profileSuccess && <div className="admin-alert success">{profileSuccess}</div>}
              {profileError && <div className="admin-alert error">{profileError}</div>}
              
              {!isEditingProfile ? (
                 <div className="profile-info-display">
                    <div className="info-group">
                      <span className="info-label">Name</span>
                      <span className="info-value">{user.name}</span>
                    </div>
                    <div className="info-group">
                      <span className="info-label">Email Address</span>
                      <span className="info-value">{user.email}</span>
                    </div>
                    <div className="info-group">
                      <span className="info-label">Phone Number</span>
                      <span className="info-value">{profileForm.phone || 'Not provided'}</span>
                    </div>
                 </div>
              ) : (
                <form onSubmit={handleProfileSubmit} className="profile-form">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input 
                      type="text" 
                      name="name"
                      className="form-input" 
                      value={profileForm.name} 
                      onChange={handleProfileChange} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address (Cannot change)</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={user.email} 
                      disabled 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input 
                      type="tel" 
                      name="phone"
                      className="form-input" 
                      value={profileForm.phone} 
                      onChange={handleProfileChange} 
                    />
                  </div>
                  <div className="profile-form-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => setIsEditingProfile(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                      {profileSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Addresses Section */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h3>Saved Addresses</h3>
              <button className="btn btn-primary btn-sm" onClick={openAddAddressModal}>
                + Add Address
              </button>
            </div>
            
            <div className="profile-card-body">
              {addressesLoading ? (
                <div className="text-center py-4 text-muted">Loading addresses...</div>
              ) : addressError ? (
                <div className="admin-alert error">{addressError}</div>
              ) : addresses.length === 0 ? (
                <div className="address-empty">
                  No saved addresses yet. Add one to make checkout faster!
                </div>
              ) : (
                <div className="address-list">
                  {addresses.map(addr => (
                    <div key={addr.id} className={`address-item ${addr.is_default ? 'default-address' : ''}`}>
                      <div className="address-item-content">
                        <div className="address-item-header">
                          <h4>{addr.full_name}</h4>
                          {addr.is_default && <span className="address-badge">Default</span>}
                        </div>
                        <p>{addr.line1}</p>
                        {addr.line2 && <p>{addr.line2}</p>}
                        <p>{addr.city}, {addr.state} {addr.postal_code}</p>
                        <p>{addr.country}</p>
                        <p className="address-phone">Phone: {addr.phone || 'N/A'}</p>
                      </div>
                      <div className="address-item-actions">
                        <button className="btn-link" onClick={() => openEditAddressModal(addr)}>Edit</button>
                        <button className="btn-link text-danger" onClick={() => handleDeleteAddress(addr.id)}>Remove</button>
                        {!addr.is_default && (
                          <button className="btn-link" onClick={() => handleSetDefaultAddress(addr)}>Set as Default</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Address Modal Edit/Add */}
      {showAddressModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>{editingAddressId ? 'Edit Address' : 'Add New Address'}</h2>
              <button className="admin-modal-close" onClick={closeAddressModal}>&times;</button>
            </div>
            <div className="admin-modal-body">
              <form onSubmit={handleAddressSubmit}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" name="full_name" className="form-input" value={addressForm.full_name} onChange={handleAddressChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="tel" name="phone" className="form-input" value={addressForm.phone} onChange={handleAddressChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Address Line 1</label>
                  <input type="text" name="line1" className="form-input" value={addressForm.line1} onChange={handleAddressChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Address Line 2 (Optional)</label>
                  <input type="text" name="line2" className="form-input" value={addressForm.line2} onChange={handleAddressChange} />
                </div>
                <div className="admin-form-grid">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input type="text" name="city" className="form-input" value={addressForm.city} onChange={handleAddressChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State/Province</label>
                    <input type="text" name="state" className="form-input" value={addressForm.state} onChange={handleAddressChange} required />
                  </div>
                </div>
                <div className="admin-form-grid">
                  <div className="form-group">
                    <label className="form-label">Postal Code</label>
                    <input type="text" name="postal_code" className="form-input" value={addressForm.postal_code} onChange={handleAddressChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input type="text" name="country" className="form-input" value={addressForm.country} onChange={handleAddressChange} required />
                  </div>
                </div>
                
                <div className="form-group mt-2">
                  <label className="flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" name="is_default" checked={addressForm.is_default} onChange={handleAddressChange} />
                    <span>Set as default address</span>
                  </label>
                </div>

                <div className="admin-modal-actions mt-4">
                  <button type="button" className="btn btn-secondary" onClick={closeAddressModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={addressSubmitting}>
                    {addressSubmitting ? 'Saving...' : 'Save Address'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
