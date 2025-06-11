import { useNavigate } from 'react-router-dom';

const BackButton = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className="bg-storypad-accent text-white px-4 py-2 rounded hover:bg-storypad-accent-dark transition"
    >
      ← Back
    </button>
  );
};

export default BackButton;
