import { Link } from 'react-router-dom';
import BackButton from '../components/BackButton';

const CommunityPage = () => {
  const mockPosts = [
    { id: 1, title: "Writing Tips for Beginners", author: "Jane Doe", comments: 12 },
    { id: 2, title: "Favorite Book Genres?", author: "John Smith", comments: 8 },
    { id: 3, title: "How to Overcome Writer's Block", author: "Emily White", comments: 15 },
  ];

  return (
    <div className="container-custom py-12">
    <BackButton />
      <h1 className="text-3xl font-bold text-storypad-dark mb-6">Community Discussions</h1>
      <div className="space-y-4">
        {mockPosts.map((post) => (
          <div key={post.id} className="card hover:shadow-lg transition-shadow p-4">
            <h3 className="text-lg font-semibold text-storypad-dark">{post.title}</h3>
            <p className="text-sm text-storypad-text-light">by {post.author}</p>
            <p className="text-sm text-storypad-text-light">{post.comments} comments</p>
            <Link to={`/community/${post.id}`} className="text-storypad-primary hover:underline text-sm mt-2 inline-block">
              View Discussion →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommunityPage;
