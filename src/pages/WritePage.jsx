const WritePage = () => {
  return (
    <div className="container-custom py-12">
      <h1 className="text-3xl font-bold text-storypad-dark mb-6">Start Writing Your Story</h1>
      <form className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-storypad-dark">Story Title</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            className="input w-full mt-1"
            placeholder="Enter your story title"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-storypad-dark">Description</label>
          <textarea
            id="description"
            name="description"
            rows="4"
            required
            className="input w-full mt-1"
            placeholder="Write a brief description of your story"
          />
        </div>
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-storypad-dark">Story Content</label>
          <textarea
            id="content"
            name="content"
            rows="10"
            required
            className="input w-full mt-1"
            placeholder="Start writing your story here..."
          />
        </div>
        <button type="submit" className="btn-primary w-full py-3">Publish Story</button>
      </form>
    </div>
  );
};

export default WritePage;
