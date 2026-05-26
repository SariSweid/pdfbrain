import React from 'react';

function LoginView({ onLogin }) {
  // מניעת רענון הדף ומעבר למערכת
  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96 text-center">
        <h2 className="text-2xl font-bold mb-6 text-indigo-700">ברוכים הבאים ל-PDFBrain</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="text-right mb-4">
            <label className="text-sm text-gray-600 block mb-1">אימייל</label>
            <input 
              type="email" 
              placeholder="your@email.com" 
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-indigo-500" 
              required 
            />
          </div>
          
          <div className="text-right mb-6">
            <label className="text-sm text-gray-600 block mb-1">סיסמה</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-indigo-500" 
              required 
            />
          </div>
          
          <button type="submit" className="w-full p-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition">
            התחבר ->
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginView;