import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DarkModeProvider } from './contexts/DarkModeContext';
import MainLayout from './layouts/MainLayout';
import AuthPrompt from './components/AuthPrompt';
import SessionStatus from './components/SessionStatus';
import SessionDebug from './components/SessionDebug';
import ProtectedRoute from './components/ProtectedRoute';

// Import your pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import BrowsePage from './pages/BrowsePage';
import StoryPage from './pages/StoryPage';
import WritePage from './pages/WritePage';
import ProfilePage from './pages/ProfilePage';
import MyLibraryPage from './pages/MyLibraryPage';
import NewWritePage from './pages/NewWritePage';
import MyStoriesPage from './pages/MyStoriesPage';

function App() {
  return (
    <Router>
      <DarkModeProvider>
        <div className="App">
          <Routes>
            {/* Routes with MainLayout (includes Navbar) */}
            <Route path="/" element={<MainLayout />}>
              {/* Public routes */}
              <Route index element={<HomePage />} />
              <Route path="browse" element={<BrowsePage />} />
              <Route path="story/:id" element={<StoryPage />} />
              
              {/* Protected routes */}
              <Route path="write" element={
                <ProtectedRoute>
                  <NewWritePage />
                </ProtectedRoute>
              } />
              <Route path="story/:id/edit" element={
                <ProtectedRoute>
                  <WritePage />
                </ProtectedRoute>
              } />
              <Route path="profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              <Route path="my-library" element={
                <ProtectedRoute>
                  <MyLibraryPage />
                </ProtectedRoute>
              } />
              <Route path="my-stories" element={
                <ProtectedRoute>
                  <MyStoriesPage />
                </ProtectedRoute>
              } />
            </Route>

            {/* Routes without MainLayout (no navbar) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Routes>
          
          {/* Global Components */}
          <AuthPrompt />
          {process.env.NODE_ENV === 'development' && <SessionDebug />}
        </div>
      </DarkModeProvider>
    </Router>
  );
}

export default App;