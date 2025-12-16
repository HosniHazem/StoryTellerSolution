# Match Story Builder

Convert live sports match events into engaging Story format - complete with a beautiful preview viewer.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Build story from match events
npm run build

# Preview the story
npm run preview
# Open http://localhost:3000

# Validate output
npm run validate
```

## 📁 Project Structure

```
├── src/
│   ├── builder.js      # Core story generation logic
│   ├── cli.js          # Command-line interface
│   ├── server.js       # Preview server
│   └── validate.js     # Schema validator
├── preview/
│   └── index.html      # Story viewer (Instagram-style)
├── data/
│   ├── match_events.json    # Input: match events
│   ├── celtic-squad.json    # Squad data
│   └── kilmarnock-squad.json
├── assets/              # Match images
├── out/
│   └── story.json      # Generated story
└── schema/
    └── story.schema.json # JSON Schema for validation
```

## 🎯 How It Works

### 1. **Story Builder** (`src/builder.js`)
   - Ingests match events JSON
   - Identifies key moments (goals, cards, penalties)
   - Maps events to available images
   - Generates structured story pages

### 2. **Page Types**
   - **Cover**: Match result and competition info
   - **Highlight**: Goals, penalties, key cards (chronological)
   - **Info**: Final summary and statistics

### 3. **Preview Viewer** (`preview/index.html`)
   - Instagram/Snapchat-style story interface
   - Keyboard navigation (← → Space)
   - Touch/swipe support for mobile
   - Progress bar and page counter
   - Responsive design

## 🔧 Architecture Decisions

### Why This Approach?

**Simple & Maintainable**
- Pure Node.js, no build tools needed
- ES modules for clean imports
- Single-file preview (no frameworks)

**Event Selection Logic**
- Prioritizes goals and red cards
- Filters early yellow cards for story focus
- Sorts chronologically for narrative flow

**Image Assignment**
- Cycles through available assets
- Maps images to events consistently
- Handles missing images gracefully

**DX First**
- Clear npm scripts
- Helpful CLI output with emojis
- Validation with detailed feedback
- Zero-config preview server

## 📊 Metrics & Analytics

The story includes match metrics:
```json
{
  "total_events": 102,
  "total_goals": 4,
  "score": "Celtic 4-0 Kilmarnock",
  "match_date": "2025-11-09Z",
  "venue": "Celtic Park"
}
```

## 🎨 Preview Features

- **Keyboard Controls**: ← → arrows or Space to navigate
- **Touch Support**: Swipe left/right on mobile
- **Visual Polish**: Gradient overlays, smooth transitions
- **Responsive**: Works on desktop and mobile
- **Progress Tracking**: Bar and page counter

## 🧪 Testing

```bash
# Run validation
npm run validate

# Expected output:
✅ Story is valid!
📊 Pack ID: 6lqto88nzncqhvtv45a0rmcyc
📄 Title: Celtic vs Kilmarnock
📖 Pages: 6
  - Cover: 1
  - Highlights: 4
  - Info: 1
```

## 🔄 Reusability

This tool is designed to be easily adapted:

1. **Different Sports**: Modify event type filters in `builder.js`
2. **New Page Types**: Add cases in schema and builder
3. **Custom Styling**: Edit `preview/index.html` CSS
4. **Multiple Matches**: Loop CLI with different input paths

### Extending for Other Matches

```javascript
import { StoryBuilder } from './src/builder.js';

const builder = new StoryBuilder(
  './data/new-match.json',
  './assets'
);
const story = builder.build();
```

## 📝 Output Format

Conforms to `schema/story.schema.json`:

```json
{
  "pack_id": "string",
  "title": "string", 
  "source": "string",
  "created_at": "ISO date",
  "metrics": {},
  "pages": [
    {
      "type": "cover",
      "headline": "Celtic 4-0 Kilmarnock",
      "subheadline": "Scottish Premiership • 9 November 2025",
      "image": "../assets/21521989.jpg"
    },
    {
      "type": "highlight",
      "minute": 9,
      "headline": "⚽ GOAL!",
      "caption": "Celtic scores",
      "image": "../assets/21522003.jpg",
      "explanation": "Johnny Kenny scores from close range..."
    },
    {
      "type": "info",
      "headline": "Celtic Wins! 🏆",
      "body": "Full Time: Celtic 4-0 Kilmarnock..."
    }
  ]
}
```

## 🚢 Production Considerations

For real-world deployment:

1. **Add Tests**: Unit tests for builder logic, integration tests for CLI
2. **Error Handling**: Graceful degradation for missing images/data
3. **Performance**: Image optimization, lazy loading
4. **Caching**: CDN for assets, cache story JSON
5. **Analytics**: Track page views, completion rates
6. **A/B Testing**: Test different narratives, page orders

## 💡 Future Enhancements

- **Video Support**: Add video clips to highlights
- **Interactive Elements**: Polls, quizzes on info pages
- **Live Updates**: WebSocket for real-time event streaming
- **Personalization**: Custom highlight selection per user
- **Multi-language**: i18n for global audiences
- **Accessibility**: Screen reader support, high contrast mode

## 📚 Documentation Files

- `DECISIONS.md` - Architecture and implementation choices
- `AI_USAGE.md` - How AI assisted in development
- `EVALS.md` - Quality metrics and evaluation criteria

---

**Built with ❤️ for Storyteller**
