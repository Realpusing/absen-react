// src/pages/LoginPage.tsx
import { useState } from 'react';
import { supabase } from '../supabase';
import { Mail, Lock, LogIn, Info } from 'lucide-react';
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
      setError(error.message === "Invalid login credentials" ? "Email atau password salah!" : error.message);
      setLoading(false);
    } else {
      onLogin();
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-visual-bg" />
      
      <div className="login-card-modern">
        <div className="login-brand">
          <div className="brand-icon">SAR</div>
          <h1 className="brand-name">Absen SAR</h1>
          <p className="brand-tagline">Sistem Absensi & Pelaporan Terintegrasi</p>
        </div>

        {error && (
          <div className="error-alert">
            <Info size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form-modern">
          <div className="input-wrapper">
            <label>Alamat Email</label>
            <div className="input-group-modern">
              <Mail className="input-icon" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukkan email anda"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="input-wrapper">
            <label>Kata Sandi</label>
            <div className="input-group-modern">
              <Lock className="input-icon" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="submit-btn-modern">
            {loading ? (
              <div className="spinner-modern" />
            ) : (
              <>
                <span>Masuk Sekarang</span>
                <LogIn size={20} />
              </>
            )}
          </button>
        </form>

        <div className="login-helper">
          <p>Lupa akses? <a href="#">Hubungi Admin IT</a></p>
        </div>

        {/* Info Credentials yang Lebih Rapi */}
        <div className="demo-box">
        </div>
      </div>
    </div>
  );
}