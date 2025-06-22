import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SessionStatus from '../components/SessionStatus';
import Footer from '../components/Footer';

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-storypad-dark-bg">
      <Navbar />
      <SessionStatus />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
