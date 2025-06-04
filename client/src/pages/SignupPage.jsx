import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const SignupPage = () => {
  const [error, setError] = useState(null);  //shown when signup fails + hook
  const [success, setSuccess] = useState(null); //shown when signup is successful
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.target); //get the data from the form
    const data = Object.fromEntries(formData.entries()); //convert the form data to an object

    try {
      const response = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Account created successfully!');
        e.target.reset();
        // Do NOT redirect or login after signup
      } else {
        setError(result.message || 'Failed to create account');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  return ( //how the signup page looks
    <div className="min-h-screen bg-storypad-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block">
            <span className="text-3xl font-bold text-storypad-primary">Story<span className="text-storypad-accent">Pad</span></span>
          </Link>
          <h2 className="mt-4 text-2xl font-bold text-storypad-dark">Create your account</h2>
          <p className="mt-2 text-sm text-storypad-text-light">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-storypad-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        
        <form className="mt-8 space-y-6" onSubmit={handleSignup}> 
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first-name" className="block text-sm font-medium text-storypad-dark">
                  First name
                </label>
                <input
                  id="first-name"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  className="input w-full mt-1"
                  placeholder="First name"
                />
              </div>
              <div>
                <label htmlFor="last-name" className="block text-sm font-medium text-storypad-dark">
                  Last name
                </label>
                <input
                  id="last-name"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  className="input w-full mt-1"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-storypad-dark">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="input w-full mt-1"
                placeholder="Choose a unique username"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-storypad-dark">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input w-full mt-1"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-storypad-dark">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="input w-full mt-1"
                placeholder="Create a password"
              />
              <p className="mt-1 text-xs text-storypad-text-light">
                Must be at least 8 characters and include a number and a special character.
              </p>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-storypad-dark">
                Confirm password
              </label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="input w-full mt-1"
                placeholder="Confirm your password"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              className="h-4 w-4 border-gray-300 rounded text-storypad-primary focus:ring-storypad-primary"
              required
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-storypad-text">
              I agree to the{' '}
              <Link to="/terms" className="text-storypad-primary hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-storypad-primary hover:underline">
                Privacy Policy
              </Link>
            </label>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-500 text-sm">{success}</p>}

          <div className="flex gap-4 flex-row-reverse">
            <button
              type="submit"
              className="btn-primary w-full py-3"
            >
              Create account
            </button>
            <button
              type="button"
              className="btn-accent px-4 py-2 text-sm"
              onClick={() => navigate('/')}
            >
              Back
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;
