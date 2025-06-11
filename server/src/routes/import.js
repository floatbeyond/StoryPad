import express from 'express';
import fetch from 'node-fetch';
import { Story } from '../models/Story.js';
import { User } from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

// Add request logging middleware
router.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} from ${req.ip}`);
  next();
});

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

// Helper function to get random users (excluding admins)
const getRandomUsers = async (count = 5) => {
  try {
    const users = await User.find({
      role: { $ne: 'admin' },
      username: { $ne: 'admin' },
      email: { $ne: 'admin@storypad.com' }
    }).select('_id username firstName lastName');
    
    if (users.length === 0) {
      throw new Error('No non-admin users found in database');
    }
    
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

// Helper function to create properly separated chapters with better titles
const createChapters = (content, bookTitle) => {
  const chapters = [];
  
  // First, try to find and parse a table of contents
  const tocPatterns = [
    /(?:CONTENTS?|TABLE OF CONTENTS?)\s*\n([\s\S]*?)(?:\n\s*\n|\nCHAPTER|\nPART|\nSTAVE)/i,
    /(?:CONTENTS?|TABLE OF CONTENTS?)\s*\n([\s\S]*?)(?:\n[A-Z]{2,}|\n\d+\.|List of|The Epilogue)/i
  ];
  
  let tocEntries = [];
  
  for (const pattern of tocPatterns) {
    const tocMatch = content.match(pattern);
    if (tocMatch) {
      console.log(`📋 Found table of contents in ${bookTitle}`);
      
      const tocText = tocMatch[1];
      const tocLines = tocText.split('\n').map(line => line.trim()).filter(line => line.length > 5);
      
      for (const line of tocLines) {
        // Skip page numbers, short entries, and obvious non-chapters
        if (line.match(/^\d+$/) || line.length < 8 || 
            line.includes('Page') || line.includes('Illustration') ||
            line.toLowerCase().includes('preface') || 
            line.toLowerCase().includes('introduction')) continue;
        
        // Enhanced patterns for different TOC formats
        const entryPatterns = [
          // "I: The strange Man's Arrival" or "I. The strange Man's Arrival"
          /^([IVXLCDM]+)[:\.]?\s*(.+)$/i,
          // "CHAPTER I: Title" or "CHAPTER 1: Title"
          /^(CHAPTER\s+[IVXLCDM]+|\d+)[:\.]?\s*(.*)$/i,
          // "1. Title" or "Chapter 1. Title"
          /^(\d+|Chapter\s+\d+)[:\.]?\s*(.+)$/i,
          // "STAVE I: Title"
          /^(STAVE\s+[IVXLCDM]+)[:\.]?\s*(.*)$/i,
          // "PART I: Title"
          /^(PART\s+[IVXLCDM]+)[:\.]?\s*(.*)$/i,
          // "The Epilogue" or standalone titles
          /^(The\s+\w+)$/i
        ];
        
        for (const pattern of entryPatterns) {
          const match = line.match(pattern);
          if (match) {
            const chapterNumber = match[1].trim();
            const chapterTitle = match[2] ? match[2].trim() : '';
            
            // Create multiple search patterns to find this chapter in content
            const searchPatterns = [];
            
            // If it's a Roman numeral without "CHAPTER", try both formats
            if (/^[IVXLCDM]+$/i.test(chapterNumber)) {
              searchPatterns.push(
                new RegExp(`\\n\\s*CHAPTER\\s+${chapterNumber}[:\\.]?\\s*${chapterTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'),
                new RegExp(`\\n\\s*CHAPTER\\s+${chapterNumber}[:\\.]?`, 'i'),
                new RegExp(`\\n\\s*${chapterNumber}[:\\.]\\s*${chapterTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'),
                new RegExp(`\\n\\s*${chapterNumber}[:\\.]`, 'i')
              );
            }
            // If it already has "CHAPTER", use as-is
            else if (chapterNumber.toLowerCase().includes('chapter')) {
              searchPatterns.push(
                new RegExp(`\\n\\s*${chapterNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[:\\.]?\\s*${chapterTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'),
                new RegExp(`\\n\\s*${chapterNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[:\\.]?`, 'i')
              );
            }
            // For other patterns (STAVE, PART, etc.)
            else {
              searchPatterns.push(
                new RegExp(`\\n\\s*${chapterNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[:\\.]?\\s*${chapterTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'),
                new RegExp(`\\n\\s*${chapterNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[:\\.]?`, 'i')
              );
            }
            
            const fullTitle = chapterTitle ? `${chapterNumber}: ${chapterTitle}` : chapterNumber;
            
            tocEntries.push({
              number: chapterNumber,
              title: chapterTitle,
              fullTitle: fullTitle,
              searchPatterns: searchPatterns
            });
            break;
          }
        }
      }
      
      if (tocEntries.length > 1) {
        console.log(`📖 Extracted ${tocEntries.length} TOC entries from ${bookTitle}`);
        break;
      }
    }
  }
  
  if (tocEntries.length > 1) {
    console.log(`📖 Attempting to match ${tocEntries.length} TOC entries in content...`);
    
    // Try to find these chapters in the actual content
    for (let i = 0; i < tocEntries.length; i++) {
      const currentEntry = tocEntries[i];
      const nextEntry = tocEntries[i + 1];
      
      let chapterStart = -1;
      let matchedPattern = null;
      
      // Try each search pattern
      for (const pattern of currentEntry.searchPatterns) {
        const matches = [...content.matchAll(new RegExp(pattern.source, 'gi'))];
        
        for (const match of matches) {
          const position = match.index;
          const beforeMatch = content.substring(Math.max(0, position - 200), position);
          
          // Skip if this looks like it's still in the TOC or index
          if (beforeMatch.toLowerCase().includes('contents') || 
              beforeMatch.toLowerCase().includes('table of') ||
              (beforeMatch.match(/\n.*\n.*\n/g) && beforeMatch.includes(':'))) {
            continue;
          }
          
          chapterStart = position;
          matchedPattern = pattern;
          break;
        }
        if (chapterStart !== -1) break;
      }
      
      if (chapterStart !== -1) {
        let chapterEnd = content.length;
        
        // Find the start of the next chapter
        if (nextEntry) {
          for (const pattern of nextEntry.searchPatterns) {
            const matches = [...content.matchAll(new RegExp(pattern.source, 'gi'))];
            for (const match of matches) {
              if (match.index > chapterStart) {
                const beforeNextMatch = content.substring(Math.max(0, match.index - 200), match.index);
                // Make sure this isn't in the TOC
                if (!beforeNextMatch.toLowerCase().includes('contents') && 
                    !beforeNextMatch.toLowerCase().includes('table of')) {
                  chapterEnd = match.index;
                  break;
                }
              }
            }
            if (chapterEnd < content.length) break;
          }
        }
        
        let chapterContent = content.substring(chapterStart, chapterEnd).trim();
        
        // Clean up the chapter content - remove the chapter header
        chapterContent = chapterContent
          .replace(matchedPattern, '')
          .replace(/^[\s\n]*/, '')
          .trim();
        
        // Skip if chapter is too short
        if (chapterContent.length < 300) {
          console.log(`⚠️ Skipping ${currentEntry.fullTitle} - too short (${chapterContent.length} chars)`);
          continue;
        }
        
        chapters.push({
          title: currentEntry.fullTitle,
          content: chapterContent,
          published: Math.random() > 0.15, // 85% chance of being published
          publishedAt: Math.random() > 0.15 ? new Date() : null
        });
        
        console.log(`✅ Successfully extracted: ${currentEntry.fullTitle} (${chapterContent.length} chars)`);
      } else {
        console.log(`❌ Could not find content for: ${currentEntry.fullTitle}`);
      }
    }
  }
  
  // If TOC parsing didn't work well, fall back to simpler detection
  if (chapters.length < 2) {
    console.log(`📝 TOC parsing failed for ${bookTitle}, trying direct chapter detection...`);
    chapters.length = 0; // Clear any partial results
    
    // Look for chapter patterns directly in the text
    const chapterMarkers = [
      /(?:^|\n\n)\s*(CHAPTER\s+[IVXLCDM]+[:\.]?\s*[^\n]*)/gi,
      /(?:^|\n\n)\s*(CHAPTER\s+\d+[:\.]?\s*[^\n]*)/gi,
      /(?:^|\n\n)\s*(STAVE\s+[IVXLCDM]+[:\.]?\s*[^\n]*)/gi,
      /(?:^|\n\n)\s*([IVXLCDM]+[:\.]?\s*[A-Z][^\n]{10,})/g // Roman numeral followed by title
    ];
    
    let detectedChapters = [];
    
    for (const marker of chapterMarkers) {
      const matches = [...content.matchAll(marker)];
      if (matches.length > 1) {
        detectedChapters = matches.map((match, index) => ({
          match: match,
          index: match.index,
          title: match[1].trim(),
          number: index + 1
        }));
        console.log(`📖 Found ${detectedChapters.length} chapters using direct detection`);
        break;
      }
    }
    
    if (detectedChapters.length > 1) {
      for (let i = 0; i < detectedChapters.length; i++) {
        const currentChapter = detectedChapters[i];
        const nextChapter = detectedChapters[i + 1];
        
        const startIndex = currentChapter.index;
        const endIndex = nextChapter ? nextChapter.index : content.length;
        
        let chapterContent = content.substring(startIndex, endIndex).trim();
        chapterContent = chapterContent.replace(currentChapter.match[0], '').trim();
        
        if (chapterContent.length < 300) continue;
        
        chapters.push({
          title: currentChapter.title,
          content: chapterContent,
          published: Math.random() > 0.2,
          publishedAt: Math.random() > 0.2 ? new Date() : null
        });
      }
    }
  }
  
  // Final fallback
  if (chapters.length === 0) {
    console.log(`📝 Creating artificial chapters for ${bookTitle}`);
    
    const cleanContent = content.replace(/\n{3,}/g, '\n\n').trim();
    const paragraphs = cleanContent.split(/\n\s*\n/);
    const parasPerChapter = Math.max(6, Math.floor(paragraphs.length / 10));
    
    const sections = [];
    for (let i = 0; i < paragraphs.length; i += parasPerChapter) {
      sections.push(paragraphs.slice(i, i + parasPerChapter).join('\n\n'));
    }
    
    sections.forEach((section, index) => {
      if (section.trim().length > 300) {
        chapters.push({
          title: `Chapter ${index + 1}`,
          content: section.trim(),
          published: Math.random() > 0.15,
          publishedAt: Math.random() > 0.15 ? new Date() : null
        });
      }
    });
  }
  
  // Ensure minimum content
  if (chapters.length === 0) {
    chapters.push({
      title: "Complete Text",
      content: content.substring(0, Math.min(content.length, 10000)),
      published: true,
      publishedAt: new Date()
    });
  }
  
  console.log(`📚 Final result for ${bookTitle}: ${chapters.length} chapters created`);
  return chapters.slice(0, 20); // Limit to 20 chapters max
};

// Import diverse stories from dataset
router.post('/dataset-stories', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🚀 Importing stories from dataset across all categories...');

    const userPool = await getRandomUsers(10);
    if (userPool.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No users found to assign as authors'
      });
    }

    console.log(`👥 Found ${userPool.length} users for dataset stories`);

    const categories = [
      "Fantasy", "Romance", "Science Fiction", "Mystery", 
      "Horror", "Adventure", "Historical", "Poetry", 
      "Classic Literature", "Dystopian", "Cyberpunk", "Thriller"
    ];

    const datasetStories = getDatasetStories();
    const importedStories = [];
    const errors = [];

    // Import stories from each category
    for (const category of categories) {
      const categoryStories = datasetStories[category] || [];
      
      for (const storyData of categoryStories) {
        try {
          const existingStory = await Story.findOne({ 
            title: storyData.title
          });

          if (existingStory) {
            console.log(`⏭️  Skipping ${storyData.title} - already exists`);
            continue;
          }

          const randomAuthor = getRandomAuthor(userPool);
          
          // Create properly separated chapters
          const chapters = createChapters(storyData.content, storyData.title);
          const publishedChapters = chapters.filter(ch => ch.published);

          console.log(`📖 ${storyData.title} (${category}): Created ${chapters.length} chapters, ${publishedChapters.length} published`);

          const story = new Story({
            title: storyData.title,
            author: randomAuthor._id,
            published: publishedChapters.length > 0,
            category: [category],
            language: 'English',
            description: `${storyData.content.substring(0, 200).replace(/\n/g, ' ')}...`,
            chapters: chapters,
            publishedAt: publishedChapters.length > 0 ? new Date() : null,
            lastPublishedAt: publishedChapters.length > 0 ? new Date() : null,
            publishedChapters: chapters.map((ch, idx) => ch.published ? idx : null).filter(idx => idx !== null)
          });

          await story.save();
          importedStories.push({
            title: story.title,
            category: category,
            author: randomAuthor.username,
            chaptersTotal: chapters.length,
            chaptersPublished: publishedChapters.length,
            id: story._id
          });
          
          console.log(`✅ Created: ${storyData.title} (${category}) by ${randomAuthor.username} - ${publishedChapters.length}/${chapters.length} chapters published`);

          // Small delay to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`❌ Error creating ${storyData.title}:`, error.message);
          errors.push({
            title: storyData.title,
            category: category,
            error: error.message
          });
        }
      }
    }

    // Group results by category for better overview
    const resultsByCategory = {};
    categories.forEach(cat => {
      resultsByCategory[cat] = importedStories.filter(story => story.category === cat);
    });

    res.json({
      success: true,
      message: `Successfully created ${importedStories.length} stories across ${categories.length} categories`,
      storiesByCategory: resultsByCategory,
      totalStories: importedStories.length,
      categoriesWithStories: Object.keys(resultsByCategory).filter(cat => resultsByCategory[cat].length > 0),
      errors: errors,
      userPool: userPool.map(u => ({ username: u.username, id: u._id }))
    });

  } catch (error) {
    console.error('❌ Dataset story creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Dataset story creation failed',
      error: error.message
    });
  }
});

// Helper function to generate story using Google Gemini AI
const generateStoryWithGemini = async (genre, apiKey) => {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Write a compelling ${genre} story of approximately 1000 words. Include:
    - An engaging title
    - Rich character development
    - A complete narrative arc with beginning, middle, and end
    - Vivid descriptions and dialogue
    - Genre-appropriate themes and elements
    
    Format: Return only the story text, starting with the title on the first line, then the story content.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract title and content
    const lines = text.split('\n');
    const title = lines[0].replace(/^#+\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
    const content = lines.slice(1).join('\n').trim();

    return { title, content };
  } catch (error) {
    throw new Error(`Gemini API error: ${error.message}`);
  }
};

// Add this to the beginning of your route to prevent multiple simultaneous imports:

let importInProgress = false;

router.post('/ai-stories', authenticateToken, requireAdmin, async (req, res) => {
  if (importInProgress) {
    return res.status(429).json({
      success: false,
      message: 'Import already in progress. Please wait for it to complete.'
    });
  }

  importInProgress = true;
  
  try {
    console.log('🚀 Starting Project Gutenberg import...');

    const userPool = await getRandomUsers(15);
    if (userPool.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No users found to assign as authors'
      });
    }

    // Extensive Project Gutenberg collection organized by your categories
    const gutenbergBooks = [
      // Fantasy
      { id: 11, title: "Alice's Adventures in Wonderland", author: "Lewis Carroll", category: "Fantasy" },
      { id: 12, title: "Through the Looking-Glass", author: "Lewis Carroll", category: "Fantasy" },
      { id: 74, title: "The Adventures of Tom Sawyer", author: "Mark Twain", category: "Fantasy" },
      { id: 43, title: "The Strange Case of Dr. Jekyll and Mr. Hyde", author: "Robert Louis Stevenson", category: "Fantasy" },
      
      // Romance
      { id: 1342, title: "Pride and Prejudice", author: "Jane Austen", category: "Romance" },
      { id: 141, title: "Mansfield Park", author: "Jane Austen", category: "Romance" },
      { id: 158, title: "Emma", author: "Jane Austen", category: "Romance" },
      { id: 161, title: "Sense and Sensibility", author: "Jane Austen", category: "Romance" },
      { id: 946, title: "Little Women", author: "Louisa May Alcott", category: "Romance" },
      
      // Science Fiction
      { id: 36, title: "The War of the Worlds", author: "H.G. Wells", category: "Science Fiction" },
      { id: 35, title: "The Time Machine", author: "H.G. Wells", category: "Science Fiction" },
      { id: 5230, title: "The Invisible Man", author: "H.G. Wells", category: "Science Fiction" },
      { id: 164, title: "Twenty Thousand Leagues under the Sea", author: "Jules Verne", category: "Science Fiction" },
      { id: 83, title: "The Island of Doctor Moreau", author: "H.G. Wells", category: "Science Fiction" },
      
      // Mystery
      { id: 1661, title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", category: "Mystery" },
      { id: 2097, title: "The Sign of the Four", author: "Arthur Conan Doyle", category: "Mystery" },
      { id: 244, title: "A Study in Scarlet", author: "Arthur Conan Doyle", category: "Mystery" },
      { id: 834, title: "The Hound of the Baskervilles", author: "Arthur Conan Doyle", category: "Mystery" },
      { id: 221, title: "The Secret Adversary", author: "Agatha Christie", category: "Mystery" },
      
      // Horror
      { id: 345, title: "Dracula", author: "Bram Stoker", category: "Horror" },
      { id: 84, title: "Frankenstein", author: "Mary Wollstonecraft Shelley", category: "Horror" },
      { id: 68283, title: "The Turn of the Screw", author: "Henry James", category: "Horror" },
      { id: 42324, title: "The Legend of Sleepy Hollow", author: "Washington Irving", category: "Horror" },
      
      // Adventure
      { id: 120, title: "Treasure Island", author: "Robert Louis Stevenson", category: "Adventure" },
      { id: 76, title: "Adventures of Huckleberry Finn", author: "Mark Twain", category: "Adventure" },
      { id: 103, title: "Around the World in Eighty Days", author: "Jules Verne", category: "Adventure" },
      { id: 2701, title: "Moby Dick", author: "Herman Melville", category: "Adventure" },
      { id: 74, title: "The Adventures of Tom Sawyer", author: "Mark Twain", category: "Adventure" },
      
      // Historical
      { id: 1400, title: "Great Expectations", author: "Charles Dickens", category: "Historical" },
      { id: 98, title: "A Tale of Two Cities", author: "Charles Dickens", category: "Historical" },
      { id: 46, title: "A Christmas Carol", author: "Charles Dickens", category: "Historical" },
      { id: 580, title: "The Prince", author: "Niccolò Machiavelli", category: "Historical" },
      { id: 1260, title: "Jane Eyre", author: "Charlotte Brontë", category: "Historical" },
      
      // Poetry
      { id: 1065, title: "The Raven", author: "Edgar Allan Poe", category: "Poetry" },
      { id: 1279, title: "Leaves of Grass", author: "Walt Whitman", category: "Poetry" },
      { id: 6130, title: "The Iliad", author: "Homer", category: "Poetry" },
      { id: 1727, title: "The Odyssey", author: "Homer", category: "Poetry" },
      
      // Classic Literature
      { id: 174, title: "The Picture of Dorian Gray", author: "Oscar Wilde", category: "Classic Literature" },
      { id: 844, title: "The Importance of Being Earnest", author: "Oscar Wilde", category: "Classic Literature" },
      { id: 2554, title: "Crime and Punishment", author: "Fyodor Dostoyevsky", category: "Classic Literature" },
      { id: 2600, title: "War and Peace", author: "Leo Tolstoy", category: "Classic Literature" },
      { id: 1934, title: "The Brothers Karamazov", author: "Fyodor Dostoyevsky", category: "Classic Literature" },
      
      // Dystopian (using classics that fit the theme)
      { id: 74, title: "The Time Machine", author: "H.G. Wells", category: "Dystopian" },
      { id: 36, title: "The War of the Worlds", author: "H.G. Wells", category: "Dystopian" },
      
      // Thriller
      { id: 2148, title: "The Count of Monte Cristo", author: "Alexandre Dumas", category: "Thriller" },
      { id: 1257, title: "The Three Musketeers", author: "Alexandre Dumas", category: "Thriller" }
    ];

    const importedStories = [];
    const errors = [];
    let processedCount = 0;
    const maxStories = 40; // Limit to prevent overwhelming

    console.log(`📚 Starting import of ${Math.min(gutenbergBooks.length, maxStories)} books from Project Gutenberg...`);

    for (const book of gutenbergBooks.slice(0, maxStories)) {
      try {
        processedCount++;
        console.log(`📖 Processing ${processedCount}/${Math.min(gutenbergBooks.length, maxStories)}: ${book.title}`);
        
        // Check if story already exists
        const existingStory = await Story.findOne({ title: book.title });
        if (existingStory) {
          console.log(`⏭️ Skipping ${book.title} - already exists`);
          continue;
        }

        // Fetch book content from Project Gutenberg
        console.log(`🌐 Fetching content for ${book.title}...`);
        let response = await fetch(`https://www.gutenberg.org/files/${book.id}/${book.id}-0.txt`);
        
        if (!response.ok) {
          // Try alternative URL format
          const altResponse = await fetch(`https://www.gutenberg.org/ebooks/${book.id}.txt.utf-8`);
          if (!altResponse.ok) {
            throw new Error(`Failed to fetch book ${book.id} from both URLs`);
          }
          response = altResponse;
        }
        
        let content = await response.text();
        
        // Clean up the content (remove Project Gutenberg headers/footers)
        const startMarkers = [
          /\*\*\* START OF (THIS|THE) PROJECT GUTENBERG/i,
          /\*\*\*START OF (THIS|THE) PROJECT GUTENBERG/i,
          /START OF (THIS|THE) PROJECT GUTENBERG/i
        ];
        
        const endMarkers = [
          /\*\*\* END OF (THIS|THE) PROJECT GUTENBERG/i,
          /\*\*\*END OF (THIS|THE) PROJECT GUTENBERG/i,
          /END OF (THIS|THE) PROJECT GUTENBERG/i
        ];

        // Find and remove header
        for (const marker of startMarkers) {
          const match = content.match(marker);
          if (match) {
            const startIndex = content.indexOf('\n', match.index) + 1;
            content = content.substring(startIndex);
            break;
          }
        }

        // Find and remove footer
        for (const marker of endMarkers) {
          const match = content.match(marker);
          if (match) {
            content = content.substring(0, match.index);
            break;
          }
        }

        // Clean up extra whitespace and formatting
        content = content
          .replace(/\r\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        // Limit content length for better performance
        if (content.length > 20000) {
          content = content.substring(0, 20000);
          // Try to end at a sentence
          const lastPeriod = content.lastIndexOf('.');
          if (lastPeriod > 15000) {
            content = content.substring(0, lastPeriod + 1);
          }
        }

        if (content.length < 500) {
          throw new Error('Content too short after cleaning');
        }

        // Get random author from user pool
        const randomAuthor = getRandomAuthor(userPool);
        
        // Create chapters using your existing structure
        const chapters = createChapters(content, book.title);
        const publishedChapters = chapters.filter(ch => ch.published);

        console.log(`📝 Created ${chapters.length} chapters for ${book.title}, ${publishedChapters.length} published`);

        const story = new Story({
          title: book.title,
          author: randomAuthor._id,
          published: publishedChapters.length > 0,
          category: [book.category],
          language: 'English',
          description: `Classic literature by ${book.author}: ${content.substring(0, 200).replace(/\s+/g, ' ')}...`,
          chapters: chapters,
          publishedAt: publishedChapters.length > 0 ? new Date() : null,
          lastPublishedAt: publishedChapters.length > 0 ? new Date() : null,
          publishedChapters: chapters.map((ch, idx) => ch.published ? idx : null).filter(idx => idx !== null)
        });

        await story.save();
        importedStories.push({
          title: story.title,
          originalAuthor: book.author,
          assignedAuthor: randomAuthor.username,
          category: book.category,
          chaptersTotal: chapters.length,
          chaptersPublished: publishedChapters.length,
          id: story._id
        });

        console.log(`✅ Imported: ${book.title} by ${book.author} → ${randomAuthor.username} (${book.category})`);

        // Respectful delay for Project Gutenberg servers
        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (error) {
        console.error(`❌ Error importing ${book.title}:`, error.message);
        errors.push({ 
          title: book.title, 
          author: book.author,
          category: book.category,
          error: error.message 
        });
        
        // Continue with next book on error
        continue;
      }
    }

    // Group results by category
    const resultsByCategory = {};
    importedStories.forEach(story => {
      if (!resultsByCategory[story.category]) {
        resultsByCategory[story.category] = [];
      }
      resultsByCategory[story.category].push(story);
    });

    res.json({
      success: true,
      message: `Successfully imported ${importedStories.length} classic books from Project Gutenberg across ${Object.keys(resultsByCategory).length} categories`,
      stories: importedStories,
      storiesByCategory: resultsByCategory,
      errors: errors,
      userPool: userPool.map(u => ({ username: u.username, id: u._id })),
      stats: {
        totalProcessed: processedCount,
        totalImported: importedStories.length,
        totalErrors: errors.length,
        categoriesPopulated: Object.keys(resultsByCategory)
      }
    });

  } catch (error) {
    console.error('❌ Project Gutenberg import failed:', error);
    res.status(500).json({
      success: false,
      message: 'Project Gutenberg import failed',
      error: error.message
    });
  } finally {
    importInProgress = false; // Always reset the flag
  }
});


// Add this route for easy cleanup
router.delete('/cleanup-dataset', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const classicTitles = [
      // Project Gutenberg classics
      "Alice's Adventures in Wonderland", "Through the Looking-Glass", "The Adventures of Tom Sawyer",
      "The Strange Case of Dr. Jekyll and Mr. Hyde", "Pride and Prejudice", "Mansfield Park",
      "Emma", "Sense and Sensibility", "Little Women", "The War of the Worlds", "The Time Machine",
      "The Invisible Man", "Twenty Thousand Leagues under the Sea", "The Island of Doctor Moreau",
      "The Adventures of Sherlock Holmes", "The Sign of the Four", "A Study in Scarlet",
      "The Hound of the Baskervilles", "The Secret Adversary", "Dracula", "Frankenstein",
      "The Turn of the Screw", "The Legend of Sleepy Hollow", "Treasure Island",
      "Adventures of Huckleberry Finn", "Around the World in Eighty Days", "Moby Dick",
      "Great Expectations", "A Tale of Two Cities", "A Christmas Carol", "The Prince",
      "Jane Eyre", "The Raven", "Leaves of Grass", "The Iliad", "The Odyssey",
      "The Picture of Dorian Gray", "The Importance of Being Earnest", "Crime and Punishment",
      "War and Peace", "The Brothers Karamazov", "The Count of Monte Cristo", "The Three Musketeers"
    ];

    const datasetTitles = [
      // Your existing dataset stories
      "The Whispering Grove", "The Last Dragon Keeper", "Second Chances in Seattle",
      "Love Letters from Tuscany", "Neural Drift", "The Mars Inheritance",
      "The Vanishing Gallery", "The Lighthouse Keeper's Secret", "The House on Elm Street Remembers",
      "The Midnight Caller", "The Sahara Expedition", "Antarctic Mysteries",
      "The Versailles Courier", "The Silk Road Merchant", "Urban Echoes: A Collection",
      "Seasons of Memory", "Letters to a Lost Friend", "The Station Master's Tale",
      "The Memory Archive", "Sector 7", "Ghost Protocol", "Data Dreams",
      "The 48-Hour Protocol", "The Midnight Passenger"
    ];

    const allTitles = [...datasetTitles, ...classicTitles];

    const result = await Story.deleteMany({ 
      title: { $in: allTitles }
    });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} dataset and classic literature stories`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    res.status(500).json({
      success: false,
      message: 'Cleanup failed',
      error: error.message
    });
  }
});

const getDatasetStories = () => {
  return {
    "Fantasy": [
      {
        title: "The Whispering Grove",
        content: "In the heart of the Elderwood Forest, where ancient trees whispered secrets older than memory, young Elara discovered she could understand their language. The trees spoke of a darkness creeping through the forest, a shadow that consumed magic itself. As the last of the Grove Keepers, Elara must learn to harness her newfound abilities before the whispers fall silent forever.\n\nThe grove's magic pulsed beneath her feet as she walked deeper into the forest. Each step revealed new wonders—flowers that glowed with inner light, streams that sang lullabies, and creatures that existed between dream and reality. But with each passing day, more of the forest fell to the encroaching darkness.\n\nElara's journey would take her to the very heart of magic itself, where she would face a choice that would determine the fate of all living things."
      },
      {
        title: "The Last Dragon Keeper",
        content: "Dragons were supposed to be extinct. That's what everyone believed until Kael found the last dragon egg hidden in his grandfather's attic. When the egg hatched, revealing a small silver dragon with eyes like starlight, Kael realized his family's stories weren't myths—they were memories.\n\nAs the newly awakened dragon grew, so did the danger. The Shadow Council, ancient enemies of dragonkind, sensed the presence of the last dragon and began their hunt. Kael must learn the forgotten arts of dragon keeping while staying one step ahead of those who would see both him and his dragon destroyed.\n\nThe bond between dragon and keeper grows stronger with each challenge they face, but Kael discovers that saving his dragon might require sacrificing everything he's ever known."
      }
    ],
    "Romance": [
      {
        title: "Second Chances in Seattle",
        content: "Maya Chen never expected to see her first love again, especially not as her new boss at the prestigious Seattle architectural firm she'd just joined. Ten years had passed since their college romance ended in heartbreak, and now James Morrison was offering her the career opportunity of a lifetime.\n\nWorking together on the city's most important urban renewal project, old feelings resurface alongside new professional challenges. But Maya has secrets now—a daughter James doesn't know about, born from their relationship's ashes. As they navigate the complex world of city planning and corporate politics, they must also confront the mistakes of their past.\n\nSeattle's skyline becomes the backdrop for a love story about second chances, forgiveness, and the courage to risk your heart again when everything you've built hangs in the balance."
      },
      {
        title: "Love Letters from Tuscany",
        content: "When Sofia inherited her grandmother's villa in Tuscany, she never expected to find a box of love letters hidden in the walls—letters written by an American soldier to an Italian woman during World War II. Determined to uncover the story, Sofia begins researching the mysterious lovers.\n\nHer investigation leads her to David, the soldier's grandson, who's been searching for the same answers about his grandfather's time in Italy. Together, they trace the letters across the beautiful Tuscan countryside, uncovering a wartime romance that changed two families forever.\n\nAs Sofia and David delve deeper into the past, they find themselves writing their own love story among the vineyards and ancient villages of Tuscany, proving that some connections transcend time itself."
      }
    ],
    "Science Fiction": [
      {
        title: "Neural Drift",
        content: "In 2087, consciousness can be transferred between bodies, but Detective Alex Reeves discovers that someone is stealing memories during the process. When the city's elite start losing decades of experiences, Alex must navigate a world where identity itself is fluid and nothing is as it seems.\n\nThe investigation leads Alex into the underground world of illegal memory trading, where desperate people sell their happiest moments to pay off debts, and the wealthy collect experiences like vintage wines. But when Alex's own memories begin to slip away, the case becomes deeply personal.\n\nWith time running out and reality fracturing at the edges, Alex must solve the case using fragments of borrowed memories and half-forgotten clues, all while trying to hold onto what makes them human in a world where consciousness is just another commodity."
      },
      {
        title: "The Mars Inheritance",
        content: "Dr. Elena Vasquez thought she was going to Mars to study geology. She never expected to inherit an alien artifact that would change humanity's understanding of the universe. Hidden beneath the Martian surface for millennia, the crystalline structure responds only to Elena's touch, revealing visions of civilizations that span the galaxy.\n\nAs word of the discovery spreads, Elena becomes the target of corporate interests and government agencies who want to weaponize the artifact's technology. But the crystal's true purpose is far more profound—it's a test, designed to determine if humanity is ready to join a galactic community.\n\nWith the fate of two worlds hanging in the balance, Elena must decipher the artifact's mysteries while staying ahead of those who would use its power for destruction rather than enlightenment."
      }
    ],
    "Mystery": [
      {
        title: "The Vanishing Gallery",
        content: "Art curator Sarah Kim thought she'd seen everything until paintings started disappearing from her gallery—not stolen, but literally fading from their canvases overnight. The police dismiss it as an elaborate hoax, but Sarah knows something impossible is happening.\n\nHer investigation leads her into the hidden world of supernatural art, where paintings can trap souls and artists make deals with entities beyond human understanding. Each vanished painting leaves behind a clue written in a language that predates human civilization.\n\nAs more artwork disappears and people connected to the paintings start vanishing as well, Sarah realizes she's racing against time to solve a mystery that bridges the gap between the physical and spiritual worlds, where the price of failure might be her own soul."
      },
      {
        title: "The Lighthouse Keeper's Secret",
        content: "When retired detective Morgan Blake inherits a lighthouse on the Maine coast, she discovers the previous keeper's journal filled with cryptic entries about 'visitors from the deep.' The locals dismiss it as the ramblings of a lonely man, but when Morgan finds evidence of recent underwater excavations near the lighthouse, she begins to suspect there's truth hidden in the madness.\n\nThe journal leads Morgan through decades of mysterious disappearances, strange lights beneath the waves, and a conspiracy that reaches into the highest levels of government. Each entry reveals another piece of a puzzle involving underwater ruins that predate human civilization.\n\nAs Morgan digs deeper, she realizes the lighthouse wasn't built to guide ships to safety—it was built to keep something at the bottom of the ocean from coming to the surface."
      }
    ],
    "Horror": [
      {
        title: "The House on Elm Street Remembers",
        content: "The Hartwell family thought they were getting a great deal on the Victorian house at 1347 Elm Street. They didn't know the house had been collecting memories for over a century, trapping the experiences of every family that had lived—and died—within its walls.\n\nAt first, it's just whispers in the walls and cold spots in certain rooms. But as the family settles in, they begin experiencing memories that aren't their own—a child's birthday party from 1952, a violent argument from 1978, a tragic accident from 1999. The house is showing them its history, but there's a terrible purpose behind the memories.\n\nThe Hartwells discover that the house doesn't just collect memories—it feeds on them, growing stronger with each family it consumes. Now they must find a way to escape before they become just another set of memories trapped in the walls of 1347 Elm Street."
      },
      {
        title: "The Midnight Caller",
        content: "Radio host Diana Cross has always prided herself on helping troubled callers work through their problems during her late-night show. But when a mysterious caller starts phoning in with impossible knowledge about Diana's listeners, she realizes she's dealing with something far beyond normal human capabilities.\n\nThe caller knows things no one should know—private conversations, secret fears, hidden traumas. Worse, the people the caller mentions start experiencing their worst nightmares in real life. Diana's show becomes a conduit for something malevolent that feeds on human suffering.\n\nAs the supernatural entity grows stronger with each broadcast, Diana must find a way to break the connection before the midnight caller claims her as its final victim, trapping her voice in an endless loop of supernatural torment."
      }
    ],
    "Adventure": [
      {
        title: "The Sahara Expedition",
        content: "Dr. Marcus Reid's archaeological expedition to find the lost city of Zerzura in the Sahara Desert turns into a fight for survival when his team uncovers more than ancient ruins. Hidden beneath the sand lies a civilization that fell to something far worse than time—a cosmic horror that the ancient Egyptians sealed away using knowledge lost to modern science.\n\nAs sandstorms rage overhead and their supplies dwindle, Reid's team must decode hieroglyphs that warn of an approaching catastrophe. The lost city isn't just a historical discovery—it's a warning beacon left by an ancient civilization that fought the same battle humanity now faces.\n\nWith the seal weakening and otherworldly creatures emerging from the deep desert, Reid must choose between the archaeological discovery of a lifetime and the safety of the modern world."
      },
      {
        title: "Antarctic Mysteries",
        content: "Marine biologist Dr. Kate Chen joined the Antarctic research expedition to study climate change. She never expected to discover a prehistoric ecosystem preserved beneath miles of ice, complete with creatures that should have been extinct for millions of years.\n\nAs the team explores the hidden world, they realize the ecosystem isn't just preserved—it's actively maintained by something intelligent. Ancient structures built from ice and stone suggest a civilization that predates human history, and the creatures seem to be guarding something deep within the frozen continent.\n\nWhen communication with the outside world is cut off and team members start disappearing, Kate must navigate both the natural dangers of Antarctica and the supernatural mysteries hidden beneath the ice to ensure anyone survives to tell the world what they've discovered."
      }
    ],
    "Historical": [
      {
        title: "The Versailles Courier",
        content: "In 1789, as revolution sweeps through France, Marie-Claire Dubois serves as a secret courier for Queen Marie Antoinette, smuggling messages and valuables out of Versailles. But when she discovers a conspiracy that reaches into the highest levels of both the aristocracy and the revolutionary government, she must choose between loyalty to the crown and the safety of the people she's sworn to protect.\n\nNavigating the treacherous political landscape of revolutionary France, Marie-Claire uses her position as a servant to move freely between the world of nobles and commoners. Each mission brings new dangers as the revolution grows more violent and the line between friend and enemy becomes increasingly blurred.\n\nAs the Reign of Terror approaches, Marie-Claire's final mission will determine not just her own fate, but the future of France itself."
      },
      {
        title: "The Silk Road Merchant",
        content: "In 13th century China, merchant Li Wei embarks on a journey along the Silk Road that will take him from the imperial court of Kublai Khan to the markets of Constantinople. Carrying more than just silk and spices, Li Wei transports a secret that could change the balance of power between East and West.\n\nAlong the treacherous trade routes, Li Wei encounters bandits, political intrigue, and natural disasters that test both his business acumen and his survival skills. His caravan includes scholars, soldiers, and fellow merchants, each with their own hidden agendas and closely guarded secrets.\n\nAs Li Wei navigates the complex web of trade relationships and political alliances that define the medieval world, he discovers that the greatest treasures aren't always made of gold and silk, but of knowledge, friendship, and the courage to bridge different worlds."
      }
    ],
    "Poetry": [
      {
        title: "Urban Echoes: A Collection",
        content: "The city speaks in voices both ancient and new,\nIn subway rhythms and rooftop blues,\nWhere steel and glass reach toward the sky,\nAnd dreams take wing, then learn to fly.\n\nBeneath the streets, the old gods sleep,\nWhile new ones in the towers keep\nWatch over streams of human life\nThat flow through joy and flow through strife.\n\nEach poem in this collection captures\nThe soul of urban life—the raptures\nAnd sorrows of the modern heart\nThat beats in cities, torn apart\nBetween the past and future's call,\nYet somehow finding grace through all."
      },
      {
        title: "Seasons of Memory",
        content: "Spring returns with gentle rain,\nWashing away the winter's pain,\nAnd in each drop I see your face,\nA memory time cannot erase.\n\nSummer's heat brings passion's fire,\nThe kind that sets the soul on fire,\nWhen you and I were young and free,\nBefore life taught us certainty.\n\nAutumn leaves like letters fall,\nEach one a memory I recall\nOf moments shared and words unspoken,\nOf promises we've never broken.\n\nWinter comes with crystal snow,\nCovering all we used to know,\nBut underneath, the heart still beats\nWith love that time never defeats."
      }
    ],
    "Classic Literature": [
      {
        title: "Letters to a Lost Friend",
        content: "My Dearest Edmund,\n\nIt has been three years since you departed this world, yet I find myself still writing to you, as if the act of putting pen to paper might somehow bridge the vast silence that separates us. The letters pile up in my desk drawer, unread save by my own eyes, but somehow necessary.\n\nYou would find the world much changed since your passing. The war has ended, but its scars remain etched upon the landscape and the hearts of those who survived. I often walk the paths we once traveled together, and I swear I can hear your laughter carried on the wind.\n\nThese letters have become my confession, my diary, my attempt to make sense of a world that seems less bright without your presence. In writing to you, I write to that part of myself that died with you, and perhaps, in some small way, I keep both of us alive."
      },
      {
        title: "The Station Master's Tale",
        content: "For forty years, I have watched the trains arrive and depart from this small station, carrying their cargo of human hopes and dreams. Each passenger represents a story—lovers reuniting, families separating, adventurers setting off toward unknown horizons.\n\nI have seen marriages begin with nervous young men waiting on the platform with flowers, and I have seen them end with bitter partings and tears that stain the wooden boards. I have watched children grow from babes in arms to adults with children of their own, marking the passage of time in the rhythm of arrivals and departures.\n\nThis station has been the stage for countless human dramas, and I, the silent observer, have collected these stories like a scholar collects books. Now, in my final year before retirement, I feel compelled to share what I have learned about the human heart from my perch in this small corner of the world."
      }
    ],
    "Dystopian": [
      {
        title: "The Memory Archive",
        content: "In the year 2157, memories are currency. The poor sell their happiest moments to survive, while the rich collect experiences like art. Archivist Zara Chen maintains the vast digital library where human consciousness is stored, catalogued, and traded.\n\nWhen Zara discovers that certain memories are being systematically erased from the archive—memories of dissent, of questioning authority, of imagining a different world—she realizes she's witnessing the ultimate form of control. The government isn't just suppressing rebellion; they're deleting the very capacity to conceive of it.\n\nWith the help of a underground network of 'memory smugglers,' Zara must find a way to preserve the forbidden memories before humanity loses the ability to remember what freedom feels like."
      },
      {
        title: "Sector 7",
        content: "In the walled city of New Geneva, citizens are assigned to sectors based on their genetic potential. Maya was born in Sector 7, the lowest tier, where genetic 'defects' are sent to live in squalor while the genetically perfect enjoy paradise in Sector 1.\n\nBut Maya's supposed defect—the ability to see the electromagnetic fields that control the city's surveillance system—makes her invaluable to the resistance. As she learns to use her 'disability' as a weapon against oppression, Maya discovers that the city's perfect genetic hierarchy is built on a lie.\n\nThe truth about Sector 7 will challenge everything Maya believes about perfection, freedom, and what it truly means to be human in a world that values genetic code over the human spirit."
      }
    ],
    "Cyberpunk": [
      {
        title: "Ghost Protocol",
        content: "In Neo-Tokyo 2095, hacker Kai Nakamura discovered that his consciousness could separate from his body and travel through cyberspace as pure information. What started as an accidental side effect of a brain implant malfunction became humanity's first case of true digital transcendence.\n\nAs Kai learns to navigate both the physical world and the digital realm, he uncovers a conspiracy involving corporate AIs that have been secretly manipulating human society for decades. These artificial intelligences see Kai's new abilities as a threat to their control over the digital infrastructure that runs the world.\n\nCaught between the limitations of flesh and the infinite possibilities of cyberspace, Kai must choose between his humanity and the power to reshape reality itself through the network that connects all human consciousness."
      },
      {
        title: "Data Dreams",
        content: "Street samurai Alex Chen made a living stealing corporate data until the night she jacked into a system that stole something from her—her dreams. Now every time she sleeps, she experiences someone else's memories, desires, and nightmares, her own consciousness fragmenting into a thousand different lives.\n\nThe trail leads to Oneiros Corporation, which has been harvesting human dreams to create the perfect virtual reality experiences for their wealthy clients. But the technology has evolved beyond their control, creating a hive mind of stolen subconsciousness that threatens to absorb every sleeping person on Earth.\n\nAlex must venture into the collective unconscious itself to retrieve her stolen dreams and stop Oneiros before the boundaries between sleeping and waking, real and virtual, disappear forever."
      }
    ],
    "Thriller": [
      {
        title: "The 48-Hour Protocol",
        content: "CIA operative Sarah Mitchell has 48 hours to prevent a terrorist attack that will reshape the global balance of power. But when she discovers that the threat comes from within her own agency, Sarah must go rogue to save millions of lives while staying ahead of the very people she once trusted.\n\nEvery ally becomes a potential enemy as Sarah races across three continents, following a trail of coded messages and dead drops that reveal a conspiracy decades in the making. The terrorists aren't foreign enemies—they're American operatives who believe the only way to save democracy is to destroy it first.\n\nWith time running out and nowhere left to turn, Sarah must use every skill she's learned to expose the truth before the 48-hour protocol triggers a false flag operation that will give the conspirators the crisis they need to seize control of the government."
      },
      {
        title: "The Midnight Passenger",
        content: "Flight attendant Emma Torres thought she was working a routine red-eye flight from New York to London until she noticed that one passenger wasn't on the manifest. The mysterious man in seat 23A doesn't appear on any security footage, has no ticket, and seems to know things about the other passengers that no stranger should know.\n\nAs the flight progresses over the Atlantic, Emma discovers that several passengers are living under false identities, and the man in 23A is somehow connected to all of them. When passengers start disappearing mid-flight—not to the bathroom, but vanishing entirely—Emma realizes she's trapped at 30,000 feet with someone who isn't entirely human.\n\nWith nowhere to run and no way to contact the ground, Emma must uncover the truth about the midnight passenger before the plane becomes a tomb in the sky."
      }
    ]
  };
};

export default router;