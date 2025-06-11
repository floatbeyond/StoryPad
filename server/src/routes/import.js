import express from 'express';
import { Story } from '../models/Story.js';
import { User } from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Import from online datasets
router.post('/dataset', authenticateToken, async (req, res) => {
  try {
    const { source = 'gutenberg', limit = 20 } = req.body;
    
    console.log(`📚 Starting import from ${source} with limit ${limit}`);

    const users = await User.find({});
    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No users found. Create users first.'
      });
    }

    const createdStories = [];

    if (source === 'gutenberg') {
      // Import from Project Gutenberg
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`https://gutendex.com/books/?page=1&page_size=${limit}`);
      const data = await response.json();

      console.log(`📖 Found ${data.results.length} books from Project Gutenberg`);

      for (let i = 0; i < data.results.length; i++) {
        const book = data.results[i];
        
        try {
          // Assign to users in a cycle
          const assignedUser = users[i % users.length];
          
          // Extract and clean up categories
          const categories = book.subjects.slice(0, 3).map(subject => {
            if (subject.includes('Fiction')) return 'Fiction';
            if (subject.includes('Adventure')) return 'Adventure';
            if (subject.includes('Romance')) return 'Romance';
            if (subject.includes('Mystery')) return 'Mystery';
            if (subject.includes('Science')) return 'Science Fiction';
            if (subject.includes('Historical')) return 'Historical';
            if (subject.includes('Children')) return 'Young Adult';
            if (subject.includes('Horror')) return 'Horror';
            if (subject.includes('Fantasy')) return 'Fantasy';
            return 'Literature';
          });

          // Get book text preview
          const textUrl = book.formats['text/plain; charset=utf-8'] || 
                         book.formats['text/plain'];
          
          let chapterContent = `This is a classic work from Project Gutenberg by ${book.authors.map(a => a.name).join(', ')}. 

The story unfolds with compelling characters and an engaging plot that has captivated readers for generations. This timeless piece of literature explores themes that are as relevant today as they were when first written.

The narrative begins with rich descriptions and well-developed characters that draw readers into a world both familiar and extraordinary...`;
          
          if (textUrl) {
            try {
              const textResponse = await fetch(textUrl);
              const fullText = await textResponse.text();
              
              // Skip Project Gutenberg headers and find actual content
              const lines = fullText.split('\n');
              let contentStart = 0;
              
              // Find where the actual story starts (after headers)
              for (let j = 0; j < lines.length; j++) {
                if (lines[j].includes('START OF THE PROJECT GUTENBERG') || 
                    lines[j].includes('***START OF THE PROJECT GUTENBERG') ||
                    (j > 50 && lines[j].trim().length > 100)) {
                  contentStart = j + 1;
                  break;
                }
              }
              
              // Get meaningful content
              const contentLines = lines.slice(contentStart).filter(line => line.trim().length > 0);
              if (contentLines.length > 0) {
                chapterContent = contentLines.slice(0, 10).join('\n\n').substring(0, 1500) + "...\n\n[This is a sample from the full text available in the public domain.]";
              }
            } catch (e) {
              console.log(`Could not fetch full text for "${book.title}"`);
            }
          }

          // Check if story already exists
          const existingStory = await Story.findOne({ 
            title: book.title,
            author: assignedUser._id 
          });
          
          if (existingStory) {
            console.log(`⏭️  Story "${book.title}" already exists`);
            continue;
          }

          const story = new Story({
            title: book.title,
            description: `A classic work by ${book.authors.map(a => a.name).join(', ')}. ${book.subjects.slice(0, 2).join(', ')}. This timeless story explores themes of human nature, society, and the complexities of life, making it a must-read for literature enthusiasts.`,
            category: [...new Set(categories)], // Remove duplicates
            language: book.languages[0] === 'en' ? 'English' : 'Other',
            author: assignedUser._id,
            chapters: [{
              title: "Chapter 1",
              content: chapterContent,
              published: true,
              publishedAt: new Date(),
              lastEditedBy: assignedUser._id,
              lastEditedAt: new Date()
            }],
            published: true,
            publishedAt: new Date(),
            lastPublishedAt: new Date(),
            publishedChapters: [0],
            views: Math.floor(Math.random() * 1000) + 100,
            cover: book.formats['image/jpeg'] ? 
              `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.cover.medium.jpg` : 
              process.env.DEFAULT_COVER_URL
          });

          await story.save();
          createdStories.push(story);
          
          console.log(`✅ Created "${story.title}" for ${assignedUser.username}`);
          
          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`❌ Error creating story "${book.title}":`, error.message);
        }
      }

    } else if (source === 'openlibrary') {
      // Import from Open Library
      const fetch = (await import('node-fetch')).default;
      const subjects = ['love', 'adventure', 'mystery', 'science_fiction', 'fantasy', 'horror', 'thriller'];
      
      for (const subject of subjects.slice(0, Math.ceil(limit / 5))) {
        try {
          const response = await fetch(`https://openlibrary.org/subjects/${subject}.json?limit=8`);
          const data = await response.json();

          for (const book of data.works.slice(0, 3)) {
            const assignedUser = users[Math.floor(Math.random() * users.length)];

            // Check if already exists
            const existingStory = await Story.findOne({ 
              title: book.title,
              author: assignedUser._id 
            });
            
            if (existingStory) continue;

            const categoryName = subject.charAt(0).toUpperCase() + subject.slice(1).replace('_', ' ');
            const chapterContent = `This is the beginning of "${book.title}", a compelling ${subject.replace('_', ' ')} story that will take you on an unforgettable journey.

The story unfolds with rich character development and intricate plot lines that keep readers engaged from start to finish. Through masterful storytelling, this work explores the depths of human emotion and the complexities of life.

Each page reveals new layers of meaning, drawing readers deeper into a world where every decision matters and every character has a story to tell...`;

            const story = new Story({
              title: book.title,
              description: `A captivating ${subject.replace('_', ' ')} story that explores themes of human nature and adventure. This work has been beloved by readers and continues to inspire new generations with its timeless narrative and memorable characters.`,
              category: [categoryName],
              language: 'English',
              author: assignedUser._id,
              chapters: [{
                title: "Chapter 1",
                content: chapterContent,
                published: true,
                publishedAt: new Date(),
                lastEditedBy: assignedUser._id,
                lastEditedAt: new Date()
              }],
              published: true,
              publishedAt: new Date(),
              lastPublishedAt: new Date(),
              publishedChapters: [0],
              views: Math.floor(Math.random() * 500) + 50,
              cover: book.cover_id ? 
                `https://covers.openlibrary.org/b/id/${book.cover_id}-M.jpg` : 
                process.env.DEFAULT_COVER_URL
            });

            await story.save();
            createdStories.push(story);
            console.log(`✅ Created "${story.title}" for ${assignedUser.username}`);
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`❌ Error fetching ${subject}:`, error.message);
        }
      }

    } else if (source === 'sample') {
      // Create sample stories with rich content
      const sampleBooks = [
        {
          title: "The Digital Nomad's Journey",
          description: "A modern adventure about remote work and digital entrepreneurship in exotic locations around the world.",
          category: ["Adventure", "Contemporary"],
          content: "Sarah stared at her laptop screen, the blue glow illuminating her frustrated face in the dimly lit office cubicle. The fluorescent lights hummed overhead, creating a monotonous soundtrack to her corporate existence. After five years of climbing the corporate ladder, she had reached a breaking point...",
        },
        {
          title: "Midnight in the Library",
          description: "A spine-chilling horror story about a librarian who discovers that some books come alive after midnight.",
          category: ["Horror", "Mystery"],
          content: "Emma had always loved working the night shift at the university library. The quiet halls and empty reading rooms gave her time to think and catch up on her own research. But tonight felt different. Tonight, she could swear she heard whispers coming from the rare books section...",
        },
        {
          title: "Love in the Time of Code",
          description: "A romantic comedy about two rival software developers forced to work together on a critical project.",
          category: ["Romance", "Comedy"],
          content: "Alex couldn't believe it. Of all the developers in the company, they had to pair her with Marcus Chen - the same Marcus who had beaten her to the promotion last year and who insisted on using tabs instead of spaces. This project was going to be a disaster...",
        },
        {
          title: "The Last Dragon Keeper",
          description: "In a world where dragons are nearly extinct, a young keeper must protect the last dragon egg.",
          category: ["Fantasy", "Adventure"],
          content: "Deep in the Whispering Woods, where ancient trees touched the clouds and magic still flowed like rivers of starlight, Kira tended to her most precious charge. The dragon egg pulsed with a warm, golden light, its surface covered in scales that shifted color with each heartbeat...",
        },
        {
          title: "Quantum Hearts",
          description: "A science fiction romance about physicists whose research brings them together across parallel universes.",
          category: ["Science Fiction", "Romance"],
          content: "Dr. Elena Vasquez adjusted the quantum field generator for the hundredth time that morning. The readings were still inconsistent, and her research grant was running out. Little did she know that in a parallel universe, another version of herself was having the exact same problem...",
        }
      ];

      for (let i = 0; i < Math.min(sampleBooks.length, limit); i++) {
        const bookData = sampleBooks[i];
        const assignedUser = users[i % users.length];

        const existingStory = await Story.findOne({ 
          title: bookData.title,
          author: assignedUser._id 
        });
        
        if (existingStory) {
          console.log(`⏭️  Story "${bookData.title}" already exists`);
          continue;
        }

        const story = new Story({
          title: bookData.title,
          description: bookData.description,
          category: bookData.category,
          language: 'English',
          author: assignedUser._id,
          chapters: [{
            title: "Chapter 1",
            content: bookData.content + "\n\n[This is a sample story created for demonstration purposes. Continue reading to see how the story unfolds...]",
            published: true,
            publishedAt: new Date(),
            lastEditedBy: assignedUser._id,
            lastEditedAt: new Date()
          }],
          published: true,
          publishedAt: new Date(),
          lastPublishedAt: new Date(),
          publishedChapters: [0],
          views: Math.floor(Math.random() * 300) + 25,
          cover: process.env.DEFAULT_COVER_URL
        });

        await story.save();
        createdStories.push(story);
        console.log(`✅ Created "${story.title}" for ${assignedUser.username}`);
      }
    }

    res.json({
      success: true,
      message: `Successfully imported ${createdStories.length} stories from ${source}`,
      storiesCreated: createdStories.length,
      source: source,
      stories: createdStories.map(s => ({ id: s._id, title: s.title, author: s.author }))
    });

  } catch (error) {
    console.error('❌ Error importing dataset:', error);
    res.status(500).json({
      success: false,
      message: 'Dataset import failed',
      error: error.message
    });
  }
});

// Get import status/stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const totalStories = await Story.countDocuments();
    const publishedStories = await Story.countDocuments({ published: true });
    const totalUsers = await User.countDocuments();
    
    // Stories by category
    const categoriesData = await Story.aggregate([
      { $unwind: '$category' },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      stats: {
        totalStories,
        publishedStories,
        totalUsers,
        categoriesData
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get import stats',
      error: error.message
    });
  }
});

export default router;