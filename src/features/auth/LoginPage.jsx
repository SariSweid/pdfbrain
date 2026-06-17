import { useState } from "react";

function LoginPage({ onLogin, authLoading, authError, onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onLogin(email, password);
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96 text-center">
        <h2 className="text-2xl font-bold mb-6 text-indigo-700">
          ברוכים הבאים ל-PDFBrain
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="text-right mb-4">
            <label className="text-sm text-gray-600 block mb-1">
              אימייל
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="text-right mb-6">
            <label className="text-sm text-gray-600 block mb-1">
              סיסמה
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          {authError && (
            <p className="text-sm text-red-600 mb-4 text-right">{authError}</p>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="w-full p-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {authLoading ? "מתחבר..." : "התחבר →"}
          </button>
        </form>

        <button
          type="button"
          onClick={onSwitchToRegister}
          className="mt-4 text-sm text-indigo-600 hover:underline"
        >
          אין לי חשבון, הרשמה
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
