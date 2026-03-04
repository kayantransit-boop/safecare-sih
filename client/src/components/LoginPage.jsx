import React, { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      if (form.username === 'admin' && form.password === 'admin123') {
        localStorage.setItem('safecare_auth', '1');
        onLogin();
      } else {
        setError('Identifiants incorrects.');
      }
      setLoading(false);
    }, 600);
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'white', borderRadius: 20, padding: '48px 40px',
        width: 380, boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏥</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e3a5f', marginBottom: 4 }}>SafeCare</h1>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Système d'Information Hospitalier</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Identifiant</label>
            <input
              type="text" required placeholder="admin"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              style={{ width: '100%' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Mot de passe</label>
            <input
              type="password" required placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              style={{ width: '100%' }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fee2e2', color: '#dc2626', borderRadius: 8,
              padding: '10px 14px', fontSize: 13, marginBottom: 16, textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14 }}>
            {loading ? 'Connexion...' : '🔐 Se connecter'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#9ca3af' }}>
          admin / admin123
        </p>
      </div>
    </div>
  );
}
