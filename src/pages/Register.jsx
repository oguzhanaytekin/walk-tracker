import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [teamColor, setTeamColor] = useState('BLUE');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.MODE === 'development' ? 'http://localhost:3001/api/auth/register' : '/api/auth/register';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, teamColor })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Kayıt başarısız.');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 w-full">
      <div className="p-8 bg-slate-800 rounded-3xl shadow-2xl border border-slate-700 w-full max-w-sm">
        <h1 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">Kayıt Ol</h1>
        
        {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-200 rounded-lg text-sm text-center">{error}</div>}
        
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <input 
            type="text" placeholder="Kullanıcı Adı" required minLength="3"
            className="p-3 bg-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
            value={username} onChange={e => setUsername(e.target.value)} 
          />
          <input 
            type="password" placeholder="Şifre" required minLength="6"
            className="p-3 bg-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
            value={password} onChange={e => setPassword(e.target.value)} 
          />
          
          <div className="mt-2 text-sm text-slate-400 text-left">Takımını Seç:</div>
          <div className="flex gap-2 justify-between">
            <button type="button" onClick={() => setTeamColor('RED')} className={`flex-1 py-2 rounded-xl border-2 transition-all ${teamColor==='RED' ? 'bg-red-600 border-red-400 font-bold' : 'bg-slate-700 border-transparent text-slate-400 hover:bg-slate-600'}`}>🔴 Kırmızı</button>
            <button type="button" onClick={() => setTeamColor('BLUE')} className={`flex-1 py-2 rounded-xl border-2 transition-all ${teamColor==='BLUE' ? 'bg-blue-600 border-blue-400 font-bold' : 'bg-slate-700 border-transparent text-slate-400 hover:bg-slate-600'}`}>🔵 Mavi</button>
            <button type="button" onClick={() => setTeamColor('GREEN')} className={`flex-1 py-2 rounded-xl border-2 transition-all ${teamColor==='GREEN' ? 'bg-green-600 border-green-400 font-bold' : 'bg-slate-700 border-transparent text-slate-400 hover:bg-slate-600'}`}>🟢 Yeşil</button>
          </div>

          <button 
            type="submit" disabled={loading}
            className="mt-4 py-3 px-6 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {loading ? 'Hesap Oluşturuluyor...' : 'Savaşa Katıl!'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Zaten hesabın var mı? <Link to="/login" className="text-emerald-400 hover:text-emerald-300">Giriş Yap</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
