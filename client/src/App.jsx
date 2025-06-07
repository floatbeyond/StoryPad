import { Routes, Route } from 'react-router-dom';
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
import FavoritesPage from './pages/FavoritesPage';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Routes>
      {/* Auth Pages (no MainLayout) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Main Layout Pages */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/story/:id" element={<StoryPage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/invitations" element={<InvitationsPage />} />
        <Route path="/newwrite" element={<NewWritePage />} />
        <Route path="/mystories" element={<MyStoriesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/write" element={<WritePage />} />
        <Route path="/write/:storyId" element={<WritePage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;