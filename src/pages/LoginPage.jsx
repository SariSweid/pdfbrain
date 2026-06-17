import { useState } from "react";
import { authenticateUser } from "../services/firestoreService"; // Importing our DB service

function LoginPage({ onLogin }) {
  // Define states for form data, error handling, and loading status
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Reset previous errors
    setLoading(true);

    try {
      // Call the function to check if the user exists in Firestore
      const user = await authenticateUser(email, password);
      
      if (user) {
        // If user is found, proceed with login and pass user data up to App.jsx
        onLogin(user);
      } else {
        // If not found, display an error and prevent login
        setError("אימייל או סיסמה שגויים, אנא נסה שנית.");
      }
    } catch (err) {
      setError("שגיאת התחברות למסד הנתונים. אנא ודא חיבור לרשת.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96 text-center">
        <h2 className="text-2xl font-bold mb-6 text-indigo-700">
          ברוכים הבאים ל-PDFBrain
        </h2>

        {/* Display error message if one exists */}
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="text-right mb-4">
            <label className="text-sm text-gray-600 block mb-1">
              אימייל
            </label>

            <input
              type="email"
              value={email} // Bind to state
              onChange={(e) => setEmail(e.target.value)} // Update state on input change
              placeholder="your@email.com"
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-indigo-500 text-left"
              dir="ltr"
              required
            />
          </div>

          <div className="text-right mb-6">
            <label className="text-sm text-gray-600 block mb-1">
              סיסמה
            </label>

            <input
              type="password"
              value={password} // Bind to state
              onChange={(e) => setPassword(e.target.value)} // Update state on input change
              placeholder="••••••••"
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-indigo-500 text-left"
              dir="ltr"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading} // Disable button during loading to prevent multiple submissions
            className="w-full p-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition disabled:bg-indigo-300 disabled:cursor-not-allowed"
          >
            {loading ? "בודק נתונים..." : "התחבר →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
