import express from 'express';
import fetch from 'node-fetch';
import { Story } from '../models/Story.js';
import { User } from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Admin middleware
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const isAdmin = user.role === 'admin' || 
                   user.username === 'admin' || 
                   user.email === 'admin@storypad.com';
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking admin access',
      error: error.message
    });
  }
};

// Helper function to get random users
const getRandomUsers = async (count = 5) => {
  try {
    const users = await User.find({}).select('_id username firstName lastName');
    if (users.length === 0) {
      throw new Error('No users found in database');
    }
    
    // Shuffle and return up to 'count' users
    const shuffled = users.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, users.length));
  } catch (error) {
    console.error('Error getting random users:', error);
    return [];
  }
};

// Helper function to get random user from a pool
const getRandomAuthor = (userPool) => {
  return userPool[Math.floor(Math.random() * userPool.length)];
};

// Import books from Project Gutenberg
router.post('/gutenberg', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🚀 Starting Project Gutenberg import...');

    // Get a pool of random users to assign as authors
    const userPool = await getRandomUsers(10); // Get up to 10 random users
    if (userPool.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No users found to assign as authors'
      });
    }

    console.log(`👥 Found ${userPool.length} users to use as authors`);

    // List of popular books with their Project Gutenberg IDs
    const books = [
      { id: 1342, title: "Pride and Prejudice", author: "Jane Austen" },
      { id: 11, title: "Alice's Adventures in Wonderland", author: "Lewis Carroll" },
      { id: 84, title: "Frankenstein", author: "Mary Wollstonecraft Shelley" },
      { id: 174, title: "The Picture of Dorian Gray", author: "Oscar Wilde" },
      { id: 345, title: "Dracula", author: "Bram Stoker" },
      { id: 46, title: "A Christmas Carol", author: "Charles Dickens" },
      { id: 74, title: "The Adventures of Tom Sawyer", author: "Mark Twain" },
      { id: 76, title: "Adventures of Huckleberry Finn", author: "Mark Twain" },
      { id: 1080, title: "A Modest Proposal", author: "Jonathan Swift" },
      { id: 844, title: "The Importance of Being Earnest", author: "Oscar Wilde" }
    ];

    const importedBooks = [];
    const errors = [];

    // Fix the Gutenberg import loop
    for (const book of books) {
      try {
        console.log(`📚 Importing: ${book.title} by ${book.author}`);

        // Get random author from user pool
        const randomAuthor = getRandomAuthor(userPool);
        console.log(`👤 Assigned author: ${randomAuthor.username} (${randomAuthor._id})`);

        // Check if book already exists
        const existingStory = await Story.findOne({ 
          title: book.title
        });

        if (existingStory) {
          console.log(`⏭️  Skipping ${book.title} - already exists`);
          continue;
        }

        // Fetch book content from Project Gutenberg
        const response = await fetch(`https://www.gutenberg.org/files/${book.id}/${book.id}-0.txt`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch book ${book.id}: ${response.statusText}`);
        }

        let content = await response.text();
        console.log(`📄 Fetched content: ${content.length} characters`);

        // Clean up the text
        content = cleanGutenbergText(content);
        console.log(`🧹 Cleaned content: ${content.length} characters`);

        // Limit content length for demo
        if (content.length > 50000) {
          content = content.substring(0, 50000) + '\n\n[Content truncated for demo...]';
          console.log(`✂️  Truncated content to: ${content.length} characters`);
        }

        // Split into chapters
        const chapters = splitIntoChapters(content, book.title);
        const publishedChapters = chapters.filter(ch => ch.published);

        console.log(`📖 Story structure: ${chapters.length} total chapters, ${publishedChapters.length} published`);

        // Create the story
        const story = new Story({
          title: book.title,
          author: randomAuthor._id,
          published: publishedChapters.length > 0,
          category: ['Classic Literature'],
          language: 'English',
          description: `Classic literature by ${book.author}, imported from Project Gutenberg. ${chapters.length} chapters available, ${publishedChapters.length} published.`,
          chapters: chapters,
          publishedAt: publishedChapters.length > 0 ? new Date() : null,
          lastPublishedAt: publishedChapters.length > 0 ? new Date() : null,
          publishedChapters: chapters.map((ch, idx) => ch.published ? idx : null).filter(idx => idx !== null)
        });

        console.log(`💾 About to save story: ${story.title}`);
        console.log(`📊 Story data:`, {
          title: story.title,
          author: story.author,
          published: story.published,
          chaptersCount: story.chapters.length,
          publishedChaptersCount: publishedChapters.length
        });

        await story.save();
        console.log(`✅ Successfully saved: ${book.title} (ID: ${story._id})`);

        // Verify the story was saved correctly
        const verifyStory = await Story.findById(story._id).populate('author', 'username');
        console.log(`🔍 Verification: Story exists with ${verifyStory.chapters.length} chapters, author: ${verifyStory.author.username}`);

        importedBooks.push({
          title: book.title,
          originalAuthor: book.author,
          storypadAuthor: randomAuthor.username,
          chaptersCount: chapters.length,
          publishedChapters: publishedChapters.length,
          id: story._id
        });

        // Add delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error importing ${book.title}:`, error.message);
        errors.push({
          title: book.title,
          error: error.message
        });
      }
    }

    console.log(`🎉 Import completed! ${importedBooks.length} books imported, ${errors.length} errors`);

    res.json({
      success: true,
      message: `Successfully imported ${importedBooks.length} books`,
      imported: importedBooks,
      errors: errors,
      totalAttempted: books.length,
      userPool: userPool.map(u => ({ username: u.username, id: u._id }))
    });

  } catch (error) {
    console.error('❌ Import failed:', error);
    res.status(500).json({
      success: false,
      message: 'Import failed',
      error: error.message
    });
  }
});

// Helper function to clean Project Gutenberg text
function cleanGutenbergText(text) {
  // Remove common Project Gutenberg headers and footers
  let cleaned = text;

  // Remove everything before "*** START OF" marker
  const startMarker = /\*\*\* START OF .*? \*\*\*/i;
  const startMatch = cleaned.match(startMarker);
  if (startMatch) {
    cleaned = cleaned.substring(cleaned.indexOf(startMatch[0]) + startMatch[0].length);
  }

  // Remove everything after "*** END OF" marker
  const endMarker = /\*\*\* END OF .*? \*\*\*/i;
  const endMatch = cleaned.match(endMarker);
  if (endMatch) {
    cleaned = cleaned.substring(0, cleaned.indexOf(endMatch[0]));
  }

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();

  return cleaned;
}

// Helper function to split content into chapters
// Fix the splitIntoChapters function
const splitIntoChapters = (content, title) => {
  console.log(`📖 Splitting "${title}" into chapters, content length: ${content.length}`);
  
  const chapterMarkers = [
    /CHAPTER [IVX\d]+\.?\s*\n/gi,
    /Chapter [IVX\d]+\.?\s*\n/gi,
    /\n\n\d+\.\s*/g,
    /\n\n[IVX]+\.\s*/g
  ];

  let chapters = [];

  // Try each marker to find chapter breaks
  for (const marker of chapterMarkers) {
    const matches = [...content.matchAll(marker)];
    if (matches.length > 1) {
      console.log(`📝 Found ${matches.length} chapters using marker: ${marker}`);
      chapters = content.split(marker).filter(ch => ch.trim().length > 100);
      break;
    }
  }

  // If no chapters found, split by length (every ~5000 words)
  if (chapters.length <= 1) {
    console.log('📝 No chapter markers found, splitting by word count');
    const words = content.split(/\s+/);
    const wordsPerChapter = 5000;
    chapters = [];
    
    for (let i = 0; i < words.length; i += wordsPerChapter) {
      const chapterWords = words.slice(i, i + wordsPerChapter);
      if (chapterWords.length > 100) { // Only add substantial chapters
        chapters.push(chapterWords.join(' '));
      }
    }
  }

  // Ensure we have at least one chapter
  if (chapters.length === 0) {
    console.log('📝 Creating single chapter from all content');
    chapters = [content];
  }

  console.log(`📚 Created ${chapters.length} chapters for "${title}"`);

  // Format chapters properly with consistent random publishing
  return chapters.map((chapterContent, index) => {
    const shouldPublish = index === 0 || Math.random() > 0.3; // Always publish first chapter, 70% chance for others
    const chapter = {
      title: `Chapter ${index + 1}`,
      content: chapterContent.trim(),
      wordCount: chapterContent.trim().split(/\s+/).length,
      published: shouldPublish,
      publishedAt: shouldPublish ? new Date() : null
    };
    
    console.log(`  Chapter ${index + 1}: ${chapter.wordCount} words, published: ${chapter.published}`);
    return chapter;
  });
};

// Helper function for sample story chapters (move outside the loop)
const createSampleChapters = (content, storyTitle) => {
  // Split longer sample stories into 2-3 chapters
  const sentences = content.split(/(?<=[.!?])\s+/);
  const chaptersCount = Math.min(3, Math.max(1, Math.floor(sentences.length / 3)));
  
  const chapters = [];
  const sentencesPerChapter = Math.ceil(sentences.length / chaptersCount);
  
  for (let i = 0; i < chaptersCount; i++) {
    const chapterSentences = sentences.slice(i * sentencesPerChapter, (i + 1) * sentencesPerChapter);
    const chapterContent = chapterSentences.join(' ');
    
    // Consistent publishing logic
    const shouldPublish = i === 0 || Math.random() > 0.4; // Always publish first chapter, 60% chance for others
    
    chapters.push({
      title: chaptersCount === 1 ? 'Full Story' : `Chapter ${i + 1}`,
      content: chapterContent,
      wordCount: chapterContent.split(/\s+/).length,
      published: shouldPublish,
      publishedAt: shouldPublish ? new Date() : null
    });
  }
  
  return chapters;
};

// Import sample stories (move createSampleChapters outside the loop)
router.post('/samples', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🚀 Creating sample stories...');

    // Get a pool of random users to assign as authors
    const userPool = await getRandomUsers(5);
    if (userPool.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No users found to assign as authors'
      });
    }

    console.log(`👥 Found ${userPool.length} users for sample stories`);

    const sampleStories = [
      {
        title: "The Time Traveler's Dilemma",
        content: "Dr. Sarah Chen stared at the temporal displacement device humming softly on her laboratory bench. Three years of research had led to this moment. The machine could send her back exactly 24 hours, but the quantum equations suggested catastrophic consequences if she encountered her past self.\n\n'Every choice creates a ripple,' she whispered, remembering her mentor's words. But with the asteroid approaching Earth, did she have any choice at all?\n\nShe placed her hand on the activation switch...",
        category: "Science Fiction",
        tags: ["time travel", "sci-fi", "thriller"]
      },
      {
        title: "The Last Bookbinder",
        content: "In a world where digital screens had replaced paper, Elena was the last person who knew the ancient art of bookbinding. Her small shop, tucked away in the forgotten corners of New Prague, contained the final physical books on Earth.\n\nWhen the government agents arrived to confiscate her 'contraband,' Elena clutched the leather-bound diary that held the secrets of her craft. Some knowledge, she believed, was too precious to digitize.\n\n'Books aren't just words,' she told them. 'They're time machines, dreams, and the weight of human thought in your hands.'",
        category: "Dystopian",
        tags: ["books", "dystopian", "rebellion"]
      },
      {
        title: "Coffee Shop Chronicles",
        content: "The bell above Giuseppe's Café chimed as Maria entered, shaking raindrops from her coat. She'd been coming here every Tuesday for three months, always ordering the same thing: medium cappuccino, extra foam, no sugar.\n\nWhat she didn't know was that David, the barista with the kind eyes, had been writing her name differently on each cup, hoping she'd notice. Today's cup read 'Mária' with an accent, like his grandmother used to write it.\n\nWhen Maria saw the cup, she looked up and smiled. 'That's beautiful. What does it mean?'",
        category: "Romance",
        tags: ["romance", "coffee", "contemporary"]
      },
      {
        title: "The Digital Ghost",
        content: "Maya discovered the old laptop in her grandmother's attic, its screen flickering with messages from someone claiming to be trapped inside the internet. At first, she thought it was a prank or malware. But when the messages started revealing family secrets that only her grandmother knew, Maya realized she might be communicating with something far more extraordinary.\n\n'Help me remember,' the messages pleaded. 'I'm losing myself in the data streams.'",
        category: "Mystery",
        tags: ["technology", "supernatural", "family"]
      },
      {
        title: "The Memory Merchant",
        content: "In the bustling markets of Neo-Bangkok, Kai sold memories like others sold spices. A first kiss for fifty credits, a childhood summer for a hundred. But when a mysterious client offered him a fortune for a memory that didn't exist yet, Kai found himself caught between the past he'd forgotten and a future he'd never imagined.\n\n'Some memories,' his mentor had warned, 'are worth more than gold. Others will cost you your soul.'",
        category: "Cyberpunk",
        tags: ["cyberpunk", "memory", "noir"]
      }
    ];

    const importedStories = [];

    for (const storyData of sampleStories) {
      // Get random author from user pool
      const randomAuthor = getRandomAuthor(userPool);

      // Check if story already exists
      const existingStory = await Story.findOne({ 
        title: storyData.title
      });

      if (existingStory) {
        console.log(`⏭️  Skipping ${storyData.title} - already exists`);
        continue;
      }

      const chapters = createSampleChapters(storyData.content, storyData.title);
      const publishedChapters = chapters.filter(ch => ch.published);

      console.log(`📖 ${storyData.title}: Created ${chapters.length} chapters, ${publishedChapters.length} published`);

      const story = new Story({
        title: storyData.title,
        author: randomAuthor._id,
        published: publishedChapters.length > 0,
        category: storyData.category ? [storyData.category] : ['Fiction'],
        language: 'English',
        description: `${storyData.content.substring(0, 150)}... (${chapters.length} chapters)`,
        chapters: chapters,
        publishedAt: publishedChapters.length > 0 ? new Date() : null,
        lastPublishedAt: publishedChapters.length > 0 ? new Date() : null,
        publishedChapters: chapters.map((ch, idx) => ch.published ? idx : null).filter(idx => idx !== null)
      });

      await story.save();
      importedStories.push({
        title: story.title,
        author: randomAuthor.username,
        chaptersTotal: chapters.length,
        chaptersPublished: publishedChapters.length,
        id: story._id
      });
      console.log(`✅ Created sample story: ${storyData.title} (by ${randomAuthor.username}) - ${publishedChapters.length}/${chapters.length} chapters published`);
    }

    res.json({
      success: true,
      message: `Successfully created ${importedStories.length} sample stories`,
      stories: importedStories,
      userPool: userPool.map(u => ({ username: u.username, id: u._id }))
    });

  } catch (error) {
    console.error('❌ Sample creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Sample creation failed',
      error: error.message
    });
  }
});

export default router;