import { Link } from 'react-router-dom';
import BackButton from '../components/BackButton';

const NotFound = () => (
  <div className="min-h-screen bg-gray-50 pt-6">
    {/* התאמה לרוחב ה-navbar – פדינג קבוע */}
    <div className="pl-6 mb-8">
      <BackButton />
    </div>

    {/* תוכן מרכזי */}
    <div className="flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-5xl font-bold text-blue-700 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-800 mb-2">Page Not Found</h2>
      <p className="text-gray-600 mb-6 max-w-md">
        Sorry, the page you are looking for does not exist.
      </p>
      <Link
        to="/"
        className="btn-primary px-6 py-2 rounded text-white bg-blue-600 hover:bg-blue-700 transition"
      >
        Go Home
      </Link>
    </div>
  </div>
);

export default NotFound;
