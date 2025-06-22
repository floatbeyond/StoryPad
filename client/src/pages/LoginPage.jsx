import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { authManager } from "../utils/auth";

const LoginPage = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.target);
    const credentials = Object.fromEntries(formData.entries());
    
    // Properly convert checkbox to boolean - check for 'on' value or existence
    credentials.rememberMe = formData.has('remember-me') && formData.get('remember-me') === 'on';
    
    console.log('Login credentials:', credentials); // Debug log

    try {
      const result = await authManager.login(credentials);
      
      if (result.success) {
        navigate("/");
      } else {
        setError(result.message || "Login failed");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-storypad-background dark:bg-storypad-dark-bg flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white dark:bg-storypad-dark-surface rounded-lg shadow-md p-8">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block">
            <span className="text-3xl font-bold text-storypad-primary dark:text-storypad-dark-primary">
              Story
              <span className="text-storypad-accent dark:text-storypad-dark-accent">
                Pad
              </span>
            </span>
          </Link>
          <h2 className="mt-4 text-2xl font-bold text-storypad-dark dark:text-storypad-dark-text">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-storypad-text-light dark:text-storypad-dark-text-light">
            Or{" "}
            <Link
              to="/signup"
              className="font-medium text-storypad-primary dark:text-storypad-dark-primary hover:underline"
            >
              create a new account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-storypad-dark dark:text-storypad-dark-text"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input w-full mt-1 bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text border-gray-300 dark:border-gray-600"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-storypad-dark dark:text-storypad-dark-text"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input w-full mt-1 bg-white dark:bg-storypad-dark-bg text-gray-900 dark:text-storypad-dark-text border-gray-300 dark:border-gray-600"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                value="on"
                className="h-4 w-4 border-gray-300 dark:border-gray-600 rounded text-storypad-primary dark:text-storypad-dark-primary focus:ring-storypad-primary dark:focus:ring-storypad-dark-primary bg-white dark:bg-storypad-dark-bg"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-storypad-text dark:text-storypad-dark-text"
              >
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-storypad-primary dark:text-storypad-dark-primary hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          {error && <p className="text-red-500">{error}</p>}

          <div>
            <button
              type="submit"
              className="btn-primary w-full py-3"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;