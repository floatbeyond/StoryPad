import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

/**
 * @typedef {Object} Chapter
 * @property {number} id - The chapter ID
 * @property {string} title - The chapter title
 * @property {string} content - The chapter content
 */

// Dummy story data
const storyData = {
  id: 1,
  title: "The Midnight Traveler",
  author: "Alex Johnson",
  authorImage: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&q=80",
  coverImage: "https://images.unsplash.com/photo-1518281580396-7d6ac06ba879?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  description: "A mysterious journey through time and space, where reality and dreams intertwine. Follow Jack as he discovers the secrets of midnight travel.",
  tags: ["Fantasy", "Adventure", "Mystery"],
  likes: 1234,
  comments: 56,
  reads: 45678,
  publishDate: "2023-09-15",
  lastUpdated: "2024-03-28",
  status: "Ongoing",
  chapters: [
    {
      id: 1,
      title: "The Beginning",
      content: `
        <p>Jack stood at the edge of the cliff, watching as the sun dipped below the horizon. The sky was painted in shades of orange and purple, a canvas that seemed to stretch into infinity. He checked his watch: 11:45 PM. Almost time.</p>

        <p>The old man's words echoed in his mind: "When the clock strikes midnight, stand at Raven's Point and close your eyes. Count to twelve, and when you open them, you'll be somewhere else."</p>

        <p>He hadn't believed it at first. Who would? Time travel was the stuff of science fiction, not something that happened to ordinary people like him. But after finding that strange book in his grandfather's attic, with its detailed instructions and warnings, curiosity had gotten the better of him.</p>

        <p>"What do I have to lose?" he muttered to himself, pulling his jacket tighter against the chill night air.</p>

        <p>His phone buzzed in his pocket. A message from Sarah: "Are you really going through with this? Call me when you're done with your 'midnight travel.' If it works, bring me back something cool from the past. 😉"</p>

        <p>Jack smiled at her skepticism. It mirrored his own, though he'd never admit it. He sent back a quick thumbs-up emoji and slipped the phone back into his pocket.</p>

        <p>11:58 PM.</p>

        <p>His heart began to race. What if it actually worked? What if in a few minutes he was somewhere else entirely—another time, another place? The book hadn't been specific about where he would go, only that the destination would be "where you need to be."</p>

        <p>11:59 PM.</p>

        <p>Jack took a deep breath. The night was still now, as if the world was holding its breath along with him. No wind, no sound of animals or distant cars. Just the rhythmic pounding of his heart in his ears.</p>

        <p>12:00 AM.</p>

        <p>He closed his eyes.</p>

        <p>One.</p>

        <p>Two.</p>

        <p>Three.</p>

        <p>With each count, he felt a strange sensation building around him, like static electricity raising the hair on his arms.</p>

        <p>Four.</p>

        <p>Five.</p>

        <p>Six.</p>

        <p>The ground beneath his feet seemed to shift, though he kept his balance.</p>

        <p>Seven.</p>

        <p>Eight.</p>

        <p>Nine.</p>

        <p>A rush of wind, from nowhere and everywhere at once.</p>

        <p>Ten.</p>

        <p>Eleven.</p>

        <p>Twelve.</p>

        <p>Jack opened his eyes.</p>

        <p>The cliff was gone. The night was gone. He stood in the middle of a bustling street, people in old-fashioned clothes brushing past him, horses and carriages clattering by. A newspaper blew against his leg. He reached down to pick it up.</p>

        <p>The date read: April 14, in a different century.</p>

        <p>It had worked. The midnight travel had worked.</p>

        <p>And so began Jack's adventure as the Midnight Traveler.</p>
      `
    },
    {
      id: 2,
      title: "Strange Encounters",
      content: `
        <p>The cobblestone streets were slick with recent rain, reflecting the gas lamps that lined the avenue. Jack moved through the crowd in a daze, his modern clothing drawing curious glances from passersby.</p>

        <p>"Excuse me," he asked an elderly gentleman with a fine cane and top hat, "what city is this?"</p>

        <p>The man looked at him oddly. "Why, London, of course. Are you quite well, young man?"</p>

        <p>London. And judging by the architecture, fashion, and that newspaper date, he was somewhere in the Victorian era. Jack thanked the man and continued walking, his mind racing with possibilities.</p>

        <p>The book hadn't mentioned how to get back. It only said that once his "purpose" was fulfilled, he would return to his own time. But what was his purpose here?</p>

        <p>As he pondered this, he nearly collided with a young woman hurrying around a corner.</p>

        <p>"I beg your pardon!" she exclaimed, steadying herself. Her eyes widened as she took in his appearance. "Your clothes... they're most unusual."</p>

        <p>Jack fumbled for an explanation. "I'm... not from around here."</p>

        <p>"Clearly," she replied with a small smile. "You look like you could use some help. Are you lost?"</p>

        <p>There was something about her—an intelligence in her eyes, a certain determination in her bearing—that made Jack trust her instantly.</p>

        <p>"Completely," he admitted. "My name is Jack."</p>

        <p>"Elizabeth," she offered in return. "But everyone calls me Eliza. Come, Mr. Jack from nowhere in particular. I know a quiet place where we can talk. And perhaps you can explain why your jacket has such peculiar fastenings and why your boots are made of a material I've never seen before."</p>

        <p>As he followed her through the winding streets, Jack felt a strange sense of familiarity, as if he'd known Eliza before. And when she glanced back at him with those bright, curious eyes, he had the most peculiar thought—that maybe, just maybe, she was the reason he had been brought here.</p>

        <p>The cafe she led him to was small and tucked away from the main street. As they settled at a corner table, Eliza leaned forward.</p>

        <p>"Now," she said quietly, "the truth, if you please. You're not just from another country, are you?"</p>

        <p>Jack hesitated. Would she think him mad if he told her the truth?</p>

        <p>"I promise I won't call for the authorities," she added, as if reading his thoughts. "I've seen strange things myself. Things that can't be explained by ordinary science."</p>

        <p>That decided him. "I'm from the future," Jack said softly. "Over a century from now."</p>

        <p>Instead of laughing or recoiling in horror, Eliza simply nodded, as if confirming a suspicion.</p>

        <p>"I thought as much," she replied. "And I think I know why you're here."</p>
      `
    },
    {
      id: 3,
      title: "Secrets Revealed",
      content: `
        <p>The teacup rattled slightly in Jack's hand as he stared at Eliza. "You... know why I'm here? I don't even know why I'm here."</p>

        <p>Eliza glanced around the cafe before reaching into her reticule. She pulled out a small, leather-bound journal and placed it on the table between them. Jack instantly recognized the intricate symbol embossed on its cover—the same symbol that had been on the book he found in his grandfather's attic.</p>

        <p>"You're not the first traveler I've met," she said quietly. "Though you've come from further away than most."</p>

        <p>Jack's mind reeled. "There are others like me?"</p>

        <p>"The Midnight Guild has existed for centuries," Eliza explained. "We study the patterns of time, the places where it... folds upon itself. Some of us can travel naturally. Others, like you, need help from the books."</p>

        <p>"The book," Jack murmured. "My grandfather's book."</p>

        <p>A knowing smile touched Eliza's lips. "Not your grandfather's, I think. Yours. Passed down through your family line."</p>

        <p>Jack felt a chill pass through him. "How do you know this?"</p>

        <p>In response, Eliza opened the journal to a page marked with a red ribbon. There, in faded ink, was a sketch—a man's face that looked startlingly like Jack's own.</p>

        <p>"This was drawn seventy years ago by another member of the Guild," she said. "His name was Thomas Nightingale, and he claimed to have met a traveler who spoke of marvels from the future. A traveler who saved his life, and in doing so, ensured the continuation of an entire branch of the Guild."</p>

        <p>Jack stared at the sketch, unable to reconcile it with any possible explanation. "You think that traveler was me? That I'm going to meet this Thomas person?"</p>

        <p>"Time isn't linear, Jack, not for people like us. It's more like..." She searched for the right analogy. "Like a tapestry. Threads weaving back and forth, sometimes crossing over each other multiple times."</p>

        <p>She turned another page in the journal, revealing a map of London with several locations circled in red ink.</p>

        <p>"Tomorrow night, Thomas Nightingale will be attacked by men who fear the Guild's knowledge. According to our records, a mysterious stranger intervenes. Without that intervention, Thomas dies, and with him, the secrets that eventually help the Guild prevent a catastrophic attempt to manipulate time itself."</p>

        <p>Jack's mouth went dry. "And you think I'm that stranger?"</p>

        <p>Eliza's eyes met his, serious and determined. "I know you are. Just as I know that after you save him, he will give you something that you must take back to your time. A message, a warning perhaps."</p>

        <p>"But how do I get back?" Jack asked, the reality of his situation finally sinking in. "The book didn't say."</p>

        <p>"The same way you came," Eliza replied. "At midnight, when you've done what you were sent to do, you'll return. But first—" She closed the journal and handed it to him. "You'll need this to find Thomas. And Jack? Be careful. The men who want Thomas dead... they're not just ordinary criminals. They have abilities of their own."</p>

        <p>As Jack took the journal from her, his fingers brushed against hers. A spark—like static electricity but warmer—passed between them, and for an instant, he saw a flash of something in his mind: Eliza, in different clothing, standing in what looked unmistakably like his own time.</p>

        <p>From her startled expression, he knew she had felt it too.</p>

        <p>"Curious," she whispered. "Very curious indeed."</p>
      `
    }
  ]
};

const StoryPage = () => {
  const { id } = useParams();
  const [currentChapter, setCurrentChapter] = useState(storyData.chapters[0]);

  // In a real application, we would fetch the story data based on the id

  return (
    <div className="bg-storypad-background min-h-screen pb-12">
      {/* Story Header with Cover and Info */}
      <div className="relative">
        <div className="h-80 w-full overflow-hidden">
          <img
            src={storyData.coverImage}
            alt={storyData.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        </div>

        <div className="container-custom relative -mt-40 z-10 pb-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 lg:w-1/4">
              <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                <img
                  src={storyData.coverImage}
                  alt={storyData.title}
                  className="w-full h-64 object-cover"
                />
              </div>
            </div>

            <div className="w-full md:w-2/3 lg:w-3/4 text-white">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{storyData.title}</h1>

              <div className="flex items-center mb-4">
                <img
                  src={storyData.authorImage}
                  alt={storyData.author}
                  className="w-10 h-10 rounded-full object-cover mr-3"
                />
                <div>
                  <span className="block font-medium">{storyData.author}</span>
                  <span className="text-sm opacity-80">Last updated: {storyData.lastUpdated}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {storyData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-storypad-accent/80 text-white text-xs px-3 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                <span className="bg-storypad-primary/80 text-white text-xs px-3 py-1 rounded-full">
                  {storyData.status}
                </span>
              </div>

              <p className="mb-4 text-gray-200">{storyData.description}</p>

              <div className="flex space-x-4 text-sm">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  {storyData.likes.toLocaleString()} Likes
                </div>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                  </svg>
                  {storyData.comments.toLocaleString()} Comments
                </div>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  {storyData.reads.toLocaleString()} Reads
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Story Content */}
      <div className="container-custom mt-6">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-1/4">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-4">
              <h3 className="text-lg font-semibold text-storypad-dark mb-4">Chapters</h3>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {storyData.chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    onClick={() => setCurrentChapter(chapter)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      currentChapter.id === chapter.id
                        ? 'bg-storypad-primary text-white'
                        : 'hover:bg-storypad-light text-storypad-text'
                    }`}
                  >
                    {chapter.id}. {chapter.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reading Area */}
          <div className="w-full lg:w-3/4">
            <div className="bg-white rounded-lg shadow-md p-6 lg:p-8">
              <h2 className="text-2xl font-bold text-storypad-dark mb-2">
                Chapter {currentChapter.id}: {currentChapter.title}
              </h2>

              {/* In a production app, we would use a proper sanitized HTML or markdown parser */}
              <div className="prose max-w-none mt-6">
                <p className="text-storypad-text-light italic mb-6">
                  create middleware+token
                </p>
                <p className="text-storypad-text">
                  create middleware+token
                </p>
                <p className="mt-4">
                  <button className="text-storypad-primary hover:underline">
                    Continue Reading
                  </button>
                </p>
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => {
                    const prevChapter = storyData.chapters.find(c => c.id === currentChapter.id - 1);
                    if (prevChapter) setCurrentChapter(prevChapter);
                  }}
                  disabled={currentChapter.id === 1}
                  className={`px-4 py-2 rounded-md ${
                    currentChapter.id === 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-storypad-primary text-white hover:bg-storypad-primary/90'
                  }`}
                >
                  Previous Chapter
                </button>

                <button
                  onClick={() => {
                    const nextChapter = storyData.chapters.find(c => c.id === currentChapter.id + 1);
                    if (nextChapter) setCurrentChapter(nextChapter);
                  }}
                  disabled={currentChapter.id === storyData.chapters.length}
                  className={`px-4 py-2 rounded-md ${
                    currentChapter.id === storyData.chapters.length
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-storypad-primary text-white hover:bg-storypad-primary/90'
                  }`}
                >
                  Next Chapter
                </button>
              </div>
            </div>

            {/* Comments Section (simplified for prototype) */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h3 className="text-xl font-semibold text-storypad-dark mb-4">Comments</h3>

              <div className="mb-4">
                <textarea
                  placeholder="Share your thoughts on this chapter..."
                  className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-storypad-primary h-24"
                />
                <button className="bg-storypad-primary text-white px-4 py-2 rounded-md mt-2 hover:bg-storypad-primary/90">
                  Post Comment
                </button>
              </div>

              <div className="text-center text-storypad-text-light py-4">
                Login to view and post comments
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryPage;
