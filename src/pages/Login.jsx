import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.MODE === 'development' ? 'http://localhost:3001/api/auth/login' : '/api/auth/login';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Giriş başarısız.');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard'); // Default redirect to dashboard
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 w-full">
      <div className="p-8 bg-slate-800 rounded-3xl shadow-2xl border border-slate-700 w-full max-w-sm">
        <h1 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Giriş Yap</h1>
        
        {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-200 rounded-lg text-sm text-center">{error}</div>}
        
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input 
            type="text" placeholder="Kullanıcı Adı" required
            className="p-3 bg-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={username} onChange={e => setUsername(e.target.value)} 
          />
          <input 
            type="password" placeholder="Şifre" required
            className="p-3 bg-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={password} onChange={e => setPassword(e.target.value)} 
          />
          <button 
            type="submit" disabled={loading}
            className="mt-2 py-3 px-6 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Hesabın yok mu? <Link to="/register" className="text-blue-400 hover:text-blue-300">Kayıt Ol</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
