import React, { useState } from 'react';
import { Lock, X, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import './AdminLogin.css';

function AdminLogin({ isOpen, onClose, onLoginSuccess }) {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmed = keyInput.trim();
    if (!trimmed) {
      setError('Please enter the Admin Security Key.');
      return;
    }

    setIsSubmitting(true);
    try {
      localStorage.setItem('admin_api_key', trimmed);
      setIsSubmitting(false);
      onLoginSuccess();
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setError('Failed to save authentication session.');
    }
  };

  return (
    <div className="admin-login-overlay fade-in" onClick={onClose}>
      <div className="admin-login-card slide-up" onClick={(e) => e.stopPropagation()}>
        <button className="admin-login-close-btn" onClick={onClose} title="Close">
          <X size={20} />
        </button>

        <div className="admin-login-header">
          <div className="admin-login-icon">
            <Lock size={26} color="#0284c7" />
          </div>
          <h3>AquaWatch Admin Portal</h3>
          <p>Restricted access for BBMP & civic water engineers</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="admin-input-group">
            <label htmlFor="adminKey">Security Key / Password</label>
            <div className="admin-input-wrapper">
              <input
                id="adminKey"
                type={showKey ? 'text' : 'password'}
                placeholder="Enter your administrative key"
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setError('');
                }}
                autoFocus
                required
              />
              <button
                type="button"
                className="toggle-eye-btn"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && <div className="admin-login-error">{error}</div>}
          </div>

          <div className="admin-security-note">
            <ShieldCheck size={16} color="#16a34a" />
            <span>Authorized access logs status modifications & audit trails</span>
          </div>

          <div className="admin-login-actions">
            <button type="button" className="admin-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="admin-submit-btn" disabled={isSubmitting}>
              <span>Enter Dashboard</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;
