import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DarkModeProvider } from './contexts/DarkModeContext';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import StoryPage from './pages/StoryPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import BrowsePage from './pages/BrowsePage';
import NewWritePage from './pages/NewWritePage';
import MyStoriesPage from './pages/MyStoriesPage';
import ProfilePage from './pages/ProfilePage';
import WritePage from './pages/WritePage';
import InvitationsPage from './pages/InvitationsPage';
import AdminPage from './pages/AdminPage';
import NotFound from './pages/NotFound';
import MyLibraryPage from './pages/MyLibraryPage';
import NoPermissionPage from './pages/NoPermissionPage';
import Navbar from './components/Navbar';
import { useRef, useEffect } from 'react';

function App() {
  const timerRef = useRef(null);

  useEffect(() => {
    const logout = () => {
      localStorage.removeItem('username');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      localStorage.removeItem('lastActivity');
      sessionStorage.removeItem('activeSession');
    };

    // On every activity, update lastActivity
    const updateActivity = () => {
      localStorage.setItem('lastActivity', Date.now());
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        logout();
      }, 60 * 60 * 1000); // 1 hour
    };

    // On mount, check for inactivity or session flag
    const token = localStorage.getItem('token');
    const last = localStorage.getItem('lastActivity');
    const activeSession = sessionStorage.getItem('activeSession');
    if (token) {
      // If no session flag (not Remember Me) and not first load, logout
      if (!activeSession && last) {
        logout();
      } else if (last && Date.now() - Number(last) >  60 * 60* 1000) {
        logout();
      } else {
        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('mousedown', updateActivity);
        window.addEventListener('touchstart', updateActivity);
        updateActivity();
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('mousedown', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
    };
  }, []);

  return (
    <DarkModeProvider>
      <Router>
        <div className="min-h-screen bg-storypad-background dark:bg-storypad-dark-bg transition-colors">
          <Routes>
            {/* Auth Pages (with standalone navbar) */}
            <Route path="/login" element={
              <>
                <Navbar />
                <LoginPage />
              </>
            } />
            <Route path="/signup" element={
              <>
                <Navbar />
                <SignupPage />
              </>
            } />

            {/* Main Layout Pages (MainLayout includes navbar) */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/invitations" element={<InvitationsPage />} />
              <Route path="/write" element={<NewWritePage />} />
              <Route path="/mystories" element={<MyStoriesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/write/:id" element={<WritePage />} />
              <Route path="/story/:id/edit" element={<WritePage />} />
              <Route path="/story/:id" element={<StoryPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/library" element={<MyLibraryPage />} />
              <Route path="/no-permission" element={<NoPermissionPage />} />
              {/* Catch-all for 404 Not Found */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </DarkModeProvider>
  );
}

export default App;