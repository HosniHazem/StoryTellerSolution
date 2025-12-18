# Architecture & Implementation Decisions

## Overview

This document explains the key decisions made during the implementation of the Match Story Builder, the reasoning behind them, and alternatives considered.

---

## Technology Stack

### TypeScript + ES Modules
**Decision**: Use TypeScript with ES modules (type: "module")

**Reasoning**:
- Type safety and better IDE support
- Self-documenting code with interfaces
- Catches errors at compile time
- Matches job description emphasis on TypeScript/JavaScript
- Better DX than plain JavaScript
- Compiles to ES modules for runtime

**Implementation**:
- TypeScript 5.3.3 with strict mode
- Compiles to `dist/` directory
- Type definitions in `src/types.ts`
- All source files use `.ts` extension

**Alternatives Considered**:
- Plain JavaScript: Less type safety, more runtime errors
- CommonJS: Older syntax, less ergonomic
- Python: Less aligned with job requirements

---

## Story Building Logic

### Event Classification & Selection Strategy
**Decision**: Intelligent event classification with importance scoring

**Reasoning**:
- Creates focused narrative without overwhelming users
- Configurable max pages via `story-config.json`
- Goals are always the most important moments
- Posts (woodwork) included as big chances
- Red cards included as they change game dynamics
- Yellow cards filtered (only early ones) to avoid clutter
- Score-aware narrative (different headlines for first goal, equalizer, etc.)

**Implementation**:
```typescript
// Event classification with importance scoring
classifyEvent(event: MatchEvent): { category, importance } {
  if (event.type === 'goal' || event.type === 'penalty goal') {
    return { category: 'goal', importance: 100 };
  }
  if (event.type === 'post') {
    return { category: 'big_chance', importance: 80 };
  }
  // ... more classification logic
}

// Select top N by importance, then sort chronologically
const top = scored
  .sort((a, b) => b.importance - a.importance)
  .slice(0, maxHighlightPages)
  .sort((a, b) => a.minute - b.minute);
```

**Alternatives Considered**:
- Include all events: Too noisy, 100+ pages
- ML-based importance scoring: Over-engineered for MVP
- Time-based sampling: Would miss key moments
- Simple filtering: Less flexible, harder to tune

### Chronological Ordering
**Decision**: Sort all highlights by match minute

**Reasoning**:
- Natural narrative flow
- Users expect chronological story
- Easy to follow game progression
- Matches TV highlight reels

**Implementation**:
```typescript
return highlights.sort((a, b) => a.minute - b.minute);
```

### Narrative Intelligence
**Decision**: Score-aware headlines and team perspective support

**Reasoning**:
- Creates emotional arc (tension → breakthrough → dominance → closure)
- Different messaging for different game situations
- Fan-friendly language when team is losing
- "We/our" language creates connection when teamId is set

**Implementation**:
```typescript
// Score-aware goal headlines
if (scoreBeforeHome === 0 && scoreBeforeAway === 0) {
  headline = '⚽ Breakthrough!'; // First goal
} else if (wasBehindBefore && postingTeamLeadingAfter) {
  headline = '⚽ Turnaround!'; // Comeback
} else if (goalForPostingTeam && wasLevelBefore && postingTeamLeadingAfter) {
  headline = '⚽ Go-ahead goal!'; // Taking the lead
} else if (goalForPostingTeam && leadMarginAfter >= 2 && minute >= 60) {
  headline = '⚽ Turning the screw!'; // Extending lead
} else if (goalForPostingTeam && isLate) {
  headline = '⚽ Late clincher!'; // Late goal
}

// Calm tone for losses
if (opponentScores && hasPostingTeam) {
  headline = '⚽ Goal.'; // Calm, no exclamation
  caption = `${teamName} score, we stay composed and push on.`;
}
```

**Team Perspective**:
- When `teamId` is set, uses "We/our" instead of team name
- Automatically adjusts pronouns ("their" → "our")
- Calm tone when team is losing or conceding
- Half-time and final pages adapt to score state

**Alternatives Considered**:
- Generic headlines: Less engaging, misses emotional moments
- Always aggressive: Poor UX when team is losing
- No perspective: Less personal connection

---

## Image Assignment

### No-Duplicate Strategy
**Decision**: Track used images and assign unique images until pool exhausted

**Reasoning**:
- Better visual variety in stories
- Each page feels distinct
- Simple tracking with Set data structure
- Falls back to cycling when all images used
- Editor allows manual image override

**Code**:
```typescript
private usedImages: Set<string> = new Set();

getImageForEvent(event: MatchEvent, index: number): string {
  // Prefer unused images first
  for (let i = 0; i < images.length; i++) {
    const candidate = images[(index + i) % images.length];
    if (!this.usedImages.has(candidate)) {
      this.usedImages.add(candidate);
      return this.getAssetPath(candidate);
    }
  }
  // Fallback: all used, cycle deterministically
  return this.getAssetPath(images[index % images.length]);
}
```

**Alternatives Considered**:
- Random selection: Non-deterministic, poor UX
- AI image classification: Requires ML model, overkill
- Manual tagging: Not scalable
- Simple cycling: Reuses images too early
- First available: Reuses same image

**Future Enhancement**:
Could use image metadata or ML to match:
- Goal images → goal events
- Player images → specific players
- Action shots → event types

---

## Data Structure

### Page Types
**Decision**: Three page types - cover, highlight, info (with half-time variant)

**Reasoning**:
- Follows Instagram Stories pattern
- Cover sets context (no score, builds tension)
- Highlights are the main content (goals, posts, penalties)
- Info provides closure (half-time + final summary)
- Half-time page creates natural narrative break

**Schema Compliance**:
```json
{
  "type": "cover",     // Match intro (no score)
  "type": "highlight", // Key moments with minute
  "type": "info"       // Half-time + final summary (with image)
}
```

**Page Structure**:
1. **Cover**: Match teams, competition, venue, date (no score)
2. **Highlights**: Goals, posts, penalties (chronological, split by half)
3. **Half-time Info**: Score at break with narrative context
4. **Final Info**: Full-time score, venue, competition, result narrative

**Why Not More Types?**
- Stats page: Info covers this
- Player spotlight: Not in event data
- Comparison page: Outside scope

---

## Preview Viewer

### Vanilla JavaScript
**Decision**: No frameworks, pure HTML/CSS/JS

**Reasoning**:
- Zero dependencies = instant load
- Easy to understand and modify
- No build step required
- Demonstrates fundamentals
- Can be upgraded to React later

**Code Size**: ~300 lines of clean, readable code

**Alternatives Considered**:
- React: Adds complexity for simple viewer
- Vue: Similar concerns
- Svelte: Better but still overkill

### Story-Style UI
**Decision**: Instagram/Snapchat-inspired vertical cards

**Reasoning**:
- Familiar UX pattern
- Mobile-first design
- Swipe-friendly
- Focus on one moment at a time
- Progress bar gives context

**Features**:
- Keyboard navigation (← → Space)
- Touch/swipe support
- Progress tracking
- Page counter
- Gradient overlays for text readability

---

## CLI Design

### Single Command Workflow
**Decision**: Simple npm scripts for common tasks

```bash
npm run build    # Generate story
npm run preview  # View story
npm run editor   # Edit story in browser
npm run validate # Check schema
npm test         # Run automated tests
npm run dev      # Build + preview
```

**Reasoning**:
- Discoverable via package.json
- No CLI flags to remember
- Standard npm conventions
- Easy for new developers
- Editor provides live editing without code changes

**DX Features**:
- Emoji icons for visual scanning
- Clear success/error messages
- Helpful next-step suggestions
- Summary statistics
- In-browser editor for quick tweaks

---

## Validation

### Schema-First Approach
**Decision**: Validate against provided JSON Schema

**Reasoning**:
- Ensures compatibility with Storyteller platform
- Catches bugs early
- Documents expected structure
- Can be integrated into CI/CD

**Implementation**:
- AJV for validation
- Detailed error messages
- Statistics about page types

**Schema Fix**:
Found and fixed schema bug (required `pack_id` but only defined `story_id`)

---

## Error Handling

### Fail Fast Philosophy
**Decision**: Exit with clear errors vs. silent failures

**Example**:
```javascript
try {
  const story = builder.build();
  writeFileSync(outputPath, JSON.stringify(story, null, 2));
  console.log('✅ Story built successfully!');
} catch (error) {
  console.error('❌ Error building story:', error.message);
  process.exit(1);
}
```

**Reasoning**:
- Developers need to know when things break
- Stack traces help debugging
- Exit codes enable CI/CD integration

---

## Code Organization

### Class-Based Builder
**Decision**: StoryBuilder class with focused methods

**Structure**:
```javascript
class StoryBuilder {
  build()              // Orchestrator
  buildMetrics()       // Analytics
  buildPages()         // Page array
  buildCoverPage()     // First page
  buildHighlightPages() // Main content
  buildSummaryPage()   // Final page
  // Helpers...
}
```

**Reasoning**:
- Single Responsibility Principle
- Easy to test individual methods
- Clear separation of concerns
- Extensible for new page types

**Alternatives Considered**:
- Functional approach: Less state management but harder to extend
- Multiple classes: Over-engineered for this scope

---

## Testing Strategy

### Automated Tests + Schema Validation
**Decision**: Node.js built-in test runner with comprehensive coverage

**Current**:
- JSON Schema validation
- Automated test suite (`tests/story-builder.test.js`)
- Manual testing in preview
- Visual QA
- CI/CD pipeline (GitHub Actions)

**Test Coverage**:
```typescript
// Unit tests
describe('StoryBuilder', () => {
  it('should create cover page without score');
  it('should insert half-time page when second half exists');
  it('should not reuse images until pool exhausted');
  it('should use calm tone when posting team is losing');
  it('should handle team perspective correctly');
});
```

**CI/CD Integration**:
- GitHub Actions workflow (`.github/workflows/ci.yml`)
- Runs on push/PR to main/master
- Builds TypeScript → Runs tests → Validates schema
- Catches regressions early

---

## Performance Considerations

### Current: Simple & Fast
- Synchronous file operations (acceptable for CLI)
- No unnecessary parsing
- Minimal memory footprint
- ~100ms execution time

### For Production:
- Stream large JSON files
- Async I/O for server
- Image optimization
- Caching layer
- Progressive loading in viewer

---

## Security

### Current: Local Only
- No user input validation needed
- Trusted data source
- No network exposure (except preview server)

### For Production:
- Sanitize event comments (XSS)
- Validate image paths (directory traversal)
- Rate limiting on preview server
- CORS configuration
- Content Security Policy

---

## Scalability

### Single Match Focus
**Current**: One match, one story

**For Production**:
```javascript
// Batch processing
const matches = await fetchMatches();
const stories = await Promise.all(
  matches.map(m => buildStory(m))
);

// Incremental updates
const liveStory = await buildLiveStory(matchId, {
  appendOnly: true,
  updateInterval: 30000
});
```

**Considerations**:
- Parallel processing
- Worker threads for CPU-intensive tasks
- Queue system for batch jobs
- Incremental story updates for live matches

---

## Trade-offs Made

### Simplicity vs. Features
**Chose**: Simple, working solution over feature-rich but complex

**Examples**:
- ❌ AI-powered narrative generation
- ❌ Real-time live updates
- ❌ Advanced image matching
- ✅ Clear, maintainable code
- ✅ Easy to understand
- ✅ Quick to extend

### Reusability vs. Specificity
**Chose**: Specific solution with clear extension points

**Example**:
- Hard-coded event types (but easy to modify)
- Fixed page structure (but schema-compliant)
- Single sport focus (but adaptable)

**Why?**
Better to ship a working solution for one use case than a complex framework for many.

---

## Lessons Learned

1. **Schema-first development works**
   - Having schema upfront guided implementation
   - Validation caught bugs early

2. **Simple is maintainable**
   - No frameworks = no upgrade burden
   - Easy for new developers to understand

3. **DX matters**
   - Good CLI output makes debugging easier
   - Clear error messages save time

4. **Test the output format early**
   - Schema validation saved rework
   - Preview viewer caught UX issues

---

## Configuration System

### Story Configuration File
**Decision**: JSON-based configuration (`story-config.json`)

**Reasoning**:
- Easy to modify without code changes
- Supports different perspectives (home/away/neutral/team)
- Configurable limits and filters
- Enables "We/our" language for team-specific stories

**Implementation**:
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

**Features**:
- Team perspective control (We/our vs. team names)
- Calm tone for losses (automatic when teamId is losing)
- Configurable highlight limits
- Opponent big chances toggle
- Card filtering by minute

## Enhanced Features (Phases 1-3)

### Phase 1: Quick Wins

#### Player Names in Headlines
**Decision**: Extract player names from squad JSON files and include in headlines

**Reasoning**:
- Personalizes the story experience
- Makes headlines more engaging ("⚽ Johnny Kenny!" vs "⚽ GOAL!")
- Shows attention to detail and user experience
- Falls back gracefully if squad data unavailable

**Implementation**:
- Loads squad JSON files on builder initialization
- Caches player names in Map for O(1) lookup
- Includes player name in headline when available
- Context-aware headlines (e.g., "Johnny Kenny breaks through!" for first goal)

#### Auto-Advance with Pause
**Decision**: Auto-advance stories every 6 seconds with pause on interaction

**Reasoning**:
- Mimics Instagram Stories behavior (familiar UX)
- Allows passive viewing while maintaining user control
- Pause on hover/touch prevents accidental skips
- Progress indicator shows remaining time

**Implementation**:
- 6-second timer per page (configurable)
- Visual progress bar at top of page
- Pauses on mouseenter/touchstart
- Resumes automatically after interaction
- Respects `prefers-reduced-motion`

#### Smooth Transitions
**Decision**: Fade animations between pages

**Reasoning**:
- Professional polish
- Smooth visual experience
- Non-intrusive transitions
- Respects accessibility preferences

**Implementation**:
- CSS transitions (400ms fade)
- Preloads next page image for seamless transitions
- Separates transition logic from content rendering

### Phase 2: Product Thinking

#### Squad Presentation Page
**Decision**: Add a dedicated squad info page after the cover for the posting team (based on `teamId`)

**Reasoning**:
- Gives fans context on who is involved in the match
- Uses existing squad data files (`celtic-squad.json`, `kilmarnock-squad.json`)
- Only shows active players and active coach for the configured team
- Layout mirrors a tactical view (Goalkeepers/Defenders on one side, Midfielders/Attackers on the other, coach centered below)

**Implementation**:
- Loads squad data and indexes by `contestantId`
- Builds a squad info page (`"Our Squad Today"` or `"{Team} Squad"`)
- Groups players by position: Goalkeepers, Defenders, Midfielders, Attackers
- Renders squad in a responsive two-column layout in `preview/index.html`

#### End-of-Story Engagement (Player of the Match)
**Decision**: Add an optional final info page asking "Who was your Player of the Match?" when the posting team wins

**Reasoning**:
- Increases engagement at the end of the story
- Encourages fans to reflect on the match and key performers
- Only appears when the configured `teamId` wins (avoids awkward prompts after losses or draws)

**Implementation**:
- Computes winner based on goals
- If `teamId` is set and matches the winner, appends an extra `info` page:
  - Headline: "Who was your Player of the Match?"
  - Body: full-time score + short call-to-action
- Uses a dedicated background image for this closing slide

#### Share Functionality
**Decision**: Comprehensive sharing menu with multiple export options

**Reasoning**:
- Real-world use case (users want to share stories)
- Multiple sharing methods increase reach
- Export options enable offline use
- Demonstrates product thinking

**Implementation**:
- Dropdown menu with share options
- Copy link to clipboard (with fallback)
- Social sharing (Twitter, Facebook)
- JSON download
- Image sequence export
- Toast notifications for feedback

#### Match Context & Stats
**Decision**: Enhance summary pages with match context and key players

**Reasoning**:
- Richer story experience
- Provides additional context
- Highlights key performers
- Shows data-driven thinking

**Implementation**:
- Extracts matchweek, stage from match data
- Identifies top scorers from events
- Includes context in final summary page
- Gracefully handles missing data

### Phase 3: Production Polish

#### Accessibility
**Decision**: Full WCAG-compliant accessibility implementation

**Reasoning**:
- Inclusive design is essential
- Legal/compliance requirements
- Better UX for all users
- Demonstrates professional standards

**Implementation**:
- ARIA labels and roles throughout
- Screen reader announcements (aria-live)
- Complete keyboard navigation (Home/End keys)
- Skip links for keyboard users
- Focus indicators
- High contrast mode support
- Semantic HTML structure

#### Analytics Tracking
**Decision**: Comprehensive analytics infrastructure (client-side, ready for server integration)

**Reasoning**:
- Data-driven product decisions
- Understand user behavior
- Measure engagement
- Identify drop-off points

**Implementation**:
- Page view tracking
- Time on page metrics
- Story completion detection
- Interaction logging (keyboard, swipe, click)
- Console logging (ready for server API integration)
- Session metrics

#### Performance Optimizations
**Decision**: Image lazy loading, preloading, and caching

**Reasoning**:
- Faster initial load
- Smoother user experience
- Reduced bandwidth usage
- Better mobile performance

**Implementation**:
- Native `loading="lazy"` attribute
- Background preloading of all images
- Image cache (Map) to prevent re-downloads
- Next page preloading for transitions
- Efficient memory management

## Future Architectural Improvements

### For Production Scale

1. **✅ TypeScript Migration** - COMPLETE
   - Type safety
   - Better IDE support
   - Self-documenting code

2. **Modular Event Processors**
   ```typescript
   class GoalProcessor extends EventProcessor {
     shouldInclude(event) { return event.type === 'goal'; }
     toPage(event) { /* ... */ }
   }
   ```

3. **Plugin System**
   ```typescript
   builder.use(new ImageMatcher())
          .use(new NarrativeGenerator())
          .use(new MetricsCollector());
   ```

4. **✅ Configuration File** - COMPLETE
   - JSON-based (`story-config.json`)
   - Supports perspective, teamId, limits
   - Easy to extend

---

## Conclusion

The architecture prioritizes:
- ✅ Simplicity and clarity
- ✅ Easy to understand and modify
- ✅ Production-ready code quality
- ✅ Clear extension points
- ✅ Good developer experience

Every decision was made with the job requirements in mind:
- First principles thinking
- AI-assisted where helpful
- Focus on integration quality
- Maintainable code
- Real problems, simple solutions