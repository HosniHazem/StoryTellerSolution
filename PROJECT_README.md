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

# Edit story in browser
npm run editor
# Open http://localhost:3000/preview/editor.html

# Validate output
npm run validate

# Run tests
npm test
```

## 📁 Project Structure

```
├── src/
│   ├── builder.ts       # Core story generation logic (TypeScript)
│   ├── cli.ts           # Command-line interface
│   ├── server.ts        # Preview server with editor API
│   ├── validate.ts      # Schema validator
│   └── types.ts         # TypeScript type definitions
├── preview/
│   ├── index.html       # Story viewer (Instagram-style)
│   └── editor.html      # In-browser story editor
├── data/
│   ├── match_events.json              # Input: match events
│   ├── match_events_celtic_loss.json  # Test: Celtic losing
│   ├── match_events_draw.json         # Test: Draw match
│   ├── match_events_two_teams_score.json # Test: Both teams score
│   ├── celtic-squad.json              # Squad data
│   └── kilmarnock-squad.json
├── assets/              # Match images
├── out/
│   └── story.json       # Generated story
├── schema/
│   └── story.schema.json # JSON Schema for validation
├── story-config.json    # Story configuration (perspective, teamId, etc.)
├── tests/
│   └── story-builder.test.js # Automated tests
└── .github/workflows/
    └── ci.yml           # GitHub Actions CI/CD
```

## 🎯 How It Works

### 1. **Story Builder** (`src/builder.ts`)
   - Ingests match events JSON
   - **Intelligent event classification** with importance scoring
   - **Team perspective support** via `story-config.json` (We/our language)
   - **Calm tone for losses** (fan-friendly when team is losing)
   - **Emotional arc focus** (tension → breakthrough → dominance → closure)
   - **Player name extraction** from squad JSON files
   - **Match context** (matchweek, stage, key players)
   - Maps events to available images (no duplicates until pool exhausted)
   - Generates structured story pages with half-time break

### 2. **Page Types**
   - **Cover**: Match intro (no score) with competition info
   - **Info (Squad)**: Squad presentation for the posting team (only when `teamId` is configured and squad data exists)
   - **Highlight**: Goals, penalties, posts (chronological)
   - **Info**: Half-time score page, final summary, and an optional final engagement slide asking "Who was your Player of the Match?" when the posting team wins

### 3. **Preview Viewer** (`preview/index.html`)
   - Instagram/Snapchat-style story interface
   - **Auto-advance** with pause on hover/touch (6 seconds per page)
   - **Smooth transitions** (fade animations between pages)
   - **Full keyboard navigation** (← → Space Home End)
   - Touch/swipe support for mobile
   - Progress bar with auto-advance indicator
   - **Share functionality** (copy link, social sharing, export)
   - **Rich text formatting** (bold labels: Goal!, Score at the break:, etc.)
   - **Accessibility** (ARIA labels, screen reader support)
   - **Analytics tracking** (page views, time on page, completion)
   - **Performance optimized** (lazy loading, image preloading)
   - Responsive design

### 4. **Story Editor** (`preview/editor.html`)
   - In-browser editor for live story manipulation
   - Edit text fields (headline, caption, explanation, body)
   - Reorder pages (↑/↓ buttons)
   - Delete pages
   - Save changes to `out/story.json` via API
   - Live preview integration

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

### Navigation
- **Keyboard Controls**: ← → arrows, Space (next), Home/End (first/last page)
- **Touch Support**: Swipe left/right on mobile
- **Auto-Advance**: Automatically progresses every 6 seconds
- **Pause Controls**: Pauses on hover (desktop) or touch (mobile)

### Visual Experience
- **Smooth Transitions**: Fade animations between pages
- **Gradient Overlays**: Professional visual polish
- **Progress Tracking**: Visual progress bar with auto-advance indicator
- **Responsive Design**: Works seamlessly on desktop and mobile

### Sharing & Export
- **Share Menu**: Copy link, share on Twitter/Facebook
- **Export Options**: Download JSON, export image sequence
- **Toast Notifications**: User feedback for actions

### Accessibility
- **ARIA Labels**: Full semantic markup for screen readers
- **Keyboard Navigation**: Complete keyboard-only experience
- **Screen Reader Support**: Live announcements for page changes
- **Focus Management**: Visible focus indicators
- **High Contrast**: Supports system high contrast mode

### Analytics
- **Page View Tracking**: Tracks which pages are viewed
- **Time Metrics**: Measures time spent on each page
- **Completion Detection**: Identifies when story is finished
- **Interaction Logging**: Records navigation methods
- **Console Logging**: Analytics data available in browser console (ready for server integration)

### Performance
- **Lazy Loading**: Images load on demand
- **Image Preloading**: Background preloading of all story images
- **Caching**: Efficient image cache to prevent re-downloads
- **Next Page Preloading**: Preloads next page for smooth transitions

## 🧪 Testing

```bash
# Run automated tests
npm test

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

### Test Coverage
- ✅ Cover page generation (no score)
- ✅ Half-time page insertion
- ✅ Player name extraction and inclusion
- ✅ Match context in summary pages
- ✅ Image uniqueness tracking
- ✅ Calm tone for losses
- ✅ Team perspective handling

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

## ⚙️ Configuration

### Story Configuration (`story-config.json`)

```json
{
  "perspective": "home",
  "teamId": "dvnjvad3p09dugr79gktlrtll",
  "maxHighlightPages": 10,
  "includeOpponentBigChances": true,
  "includeCards": true,
  "cardMinuteCutoff": 30
}
```

**Settings**:
- `perspective`: `"home" | "away" | "neutral" | "team"` - Story perspective
- `teamId`: Team ID for "We/our" language (null for neutral)
- `maxHighlightPages`: Maximum highlight pages (excluding cover/info)
- `includeOpponentBigChances`: Include opponent's big chances (posts)
- `includeCards`: Include card events as highlights
- `cardMinuteCutoff`: Only yellow cards before this minute are included

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
      "headline": "Celtic vs Kilmarnock",
      "subheadline": "Scottish Premiership • Celtic Park • 9 November 2025",
      "image": "../assets/21521989.jpg"
    },
    {
      "type": "highlight",
      "minute": 9,
      "headline": "⚽ Johnny Kenny!",
      "caption": "We extend our advantage.",
      "image": "../assets/21522003.jpg",
      "explanation": "Goal! Celtic 1, Kilmarnock 0. Johnny Kenny..."
    },
    {
      "type": "info",
      "headline": "Half-time whistle",
      "body": "Score at the break: Celtic 1-0 Kilmarnock.\n\nWe take a lead into the interval...",
      "image": "../assets/21522014.jpg"
    },
    {
      "type": "info",
      "headline": "We Won! 🏆",
      "body": "Full Time: Celtic 4-0 Kilmarnock\n\nVenue: Celtic Park\nCompetition: Scottish Premiership\nMatchweek: 12\nStage: 1st Phase\n\n⚽ Arne Engels on the scoresheet\n\nWe take all three points with a dominant performance.",
      "image": "../assets/21522057.jpg"
    }
  ]
}
```

## 🚢 Production Considerations

For real-world deployment:

1. ✅ **Tests**: Automated test suite with CI/CD pipeline
2. ✅ **Error Handling**: Graceful degradation for missing images/data
3. ✅ **Performance**: Image lazy loading, preloading, and caching implemented
4. ✅ **Analytics**: Comprehensive tracking infrastructure (ready for server integration)
5. ✅ **Accessibility**: WCAG-compliant with full ARIA support
6. **CDN**: Deploy assets to CDN for faster global delivery
7. **A/B Testing**: Test different narratives, page orders
8. **Server Integration**: Connect analytics to backend service

## 🎨 Story Features

### Narrative Intelligence
- **Emotional Arc**: Tension → Breakthrough → Dominance → Closure
- **Score-Aware Headlines**: Different messaging for first goal, equalizer, go-ahead, late clincher
- **Team Perspective**: "We/our" language when `teamId` is configured
- **Calm Tone for Losses**: Fan-friendly language when team is losing or conceding
- **Penalty Storytelling**: Two-page sequence (award + outcome)

### Event Classification
- **Importance Scoring**: Events ranked by narrative value
- **Big Chances**: Only posts (woodwork) included, not all attempts
- **Chronological Flow**: All highlights sorted by match minute
- **Half-Time Break**: Dedicated info page with score at interval

### Image Management
- **No Duplicates**: Each page gets unique image until pool exhausted
- **Deterministic Assignment**: Consistent image mapping
- **Editor Support**: Change images in browser editor

## 💡 Future Enhancements

- **Video Support**: Add video clips to highlights
- **Interactive Elements**: Polls, quizzes on info pages
- **Live Updates**: WebSocket for real-time event streaming
- **Personalization**: Custom highlight selection per user
- **Multi-language**: i18n for global audiences
- **Accessibility**: Screen reader support, high contrast mode
- **ML-Based Importance**: AI-powered event ranking

## 📚 Documentation Files

- `DECISIONS.md` - Architecture and implementation choices
- `AI_USAGE.md` - How AI assisted in development
- `EVALS.md` - Quality metrics and evaluation criteria

---

**Built with ❤️ for Storyteller**