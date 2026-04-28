import { useState } from 'react';
import { supabase } from '../supabase';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react'; 
import './LoginPage.css';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const msg = error.message === "Invalid login credentials" 
        ? "Email atau password salah!" 
        : error.message;
      setError(msg);
      setLoading(false);
    } else {
      onLogin();
    }
  };

  return (
    <div className="login-page-container">
      {/* Background Overlay */}
      <div className="bg-overlay"></div>

      <div className="login-glass-card">
        <header className="login-brand-header">
          <div className="brand-badge">SAR</div>
          <h1 className="brand-title">Absen SAR</h1>
          <p className="brand-subtitle">Kantor Pencarian & Pertolongan Makassar</p>
        </header>

        {error && (
          <div className="login-error-toast">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="login-modern-form">
          <div className="form-input-wrapper">
            <label>Email Address</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukan email dinas"
                required
              />
            </div>
          </div>

          <div className="form-input-wrapper">
            <label>Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button type="submit" className="login-submit-button" disabled={loading}>
            {loading ? (
              <div className="button-loader"></div>
            ) : (
              <>
                <span>Masuk Sistem</span>
                <LogIn size={20} />
              </>
            )}
          </button>
        </form>

        <footer className="login-extra-footer">
          <p>Kendala akses? <a href="#">Hubungi Bagian Umum</a></p>
          
          
        </footer>
      </div>
    </div>
  );
}