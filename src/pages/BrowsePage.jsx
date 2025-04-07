import { Link } from 'react-router-dom';

const BrowsePage = () => {
  const mockBooks = [
    { id: 1, title: "The Midnight Traveler", author: "Alex Johnson", cover: "https://via.placeholder.com/150" },
    { id: 2, title: "Echoes of Tomorrow", author: "Morgan Winters", cover: "https://via.placeholder.com/150" },
    { id: 3, title: "Shadow's Edge", author: "Daniel Black", cover: "https://via.placeholder.com/150" },
  ];

  return (
    <div className="container-custom py-12">
      <h1 className="text-3xl font-bold text-storypad-dark mb-6">Browse Stories</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockBooks.map((book) => (
          <Link to={`/stories/${book.id}`} key={book.id} className="card hover:shadow-lg transition-shadow">
            <img src={book.cover} alt={book.title} className="w-full h-48 object-cover rounded-t-lg" />
            <div className="p-4">
              <h3 className="text-lg font-semibold text-storypad-dark">{book.title}</h3>
              <p className="text-sm text-storypad-text-light">by {book.author}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BrowsePage;
