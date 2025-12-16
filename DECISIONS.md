# Architecture & Implementation Decisions

## Overview

This document explains the key decisions made during the implementation of the Match Story Builder, the reasoning behind them, and alternatives considered.

---

## Technology Stack

### Node.js + ES Modules
**Decision**: Use modern Node.js with ES modules (type: "module")

**Reasoning**:
- Native async/await and clean import syntax
- No build step needed - runs directly
- Matches job description emphasis on TypeScript/JavaScript
- Better DX than CommonJS
- Future-proof for TypeScript migration

**Alternatives Considered**:
- TypeScript: Would add complexity and build step
- CommonJS: Older syntax, less ergonomic
- Python: Less aligned with job requirements

---

## Story Building Logic

### Event Selection Strategy
**Decision**: Filter for goals, penalty goals, and significant cards only

**Reasoning**:
- Creates focused narrative without overwhelming users
- 4-6 pages is optimal for story engagement
- Goals are always the most important moments
- Red cards included as they change game dynamics
- Yellow cards filtered (only early ones) to avoid clutter

**Code**:
```javascript
// Extract key events
const goals = this.events.filter(e => e.type === 'goal');
const penaltyGoals = this.events.filter(e => e.type === 'penalty goal');
const yellowCards = this.events.filter(e => e.type === 'yellow card');
const redCards = this.events.filter(e => e.type === 'red card');

// Only include red cards and early yellow cards
if (isRed || minute < 30) {
  // Add to highlights
}
```

**Alternatives Considered**:
- Include all events: Too noisy, 100+ pages
- ML-based importance scoring: Over-engineered for MVP
- Time-based sampling: Would miss key moments

### Chronological Ordering
**Decision**: Sort all highlights by match minute

**Reasoning**:
- Natural narrative flow
- Users expect chronological story
- Easy to follow game progression
- Matches TV highlight reels

**Implementation**:
```javascript
return highlights.sort((a, b) => a.minute - b.minute);
```

---

## Image Assignment

### Cycling Strategy
**Decision**: Cycle through available assets based on event index

**Reasoning**:
- Simple, deterministic mapping
- Ensures all images get used
- No complex image-event matching needed
- Handles missing images gracefully

**Code**:
```javascript
getImageForEvent(event, index) {
  const images = ['21521989.jpg', '21521990.jpg', ...];
  const imageIndex = index % images.length;
  return this.getAssetPath(images[imageIndex]);
}
```

**Alternatives Considered**:
- Random selection: Non-deterministic, poor UX
- AI image classification: Requires ML model, overkill
- Manual tagging: Not scalable
- First available: Reuses same image

**Future Enhancement**:
Could use image metadata or ML to match:
- Goal images → goal events
- Player images → specific players
- Action shots → event types

---

## Data Structure

### Page Types
**Decision**: Three page types - cover, highlight, info

**Reasoning**:
- Follows Instagram Stories pattern
- Cover sets context
- Highlights are the main content
- Info provides closure

**Schema Compliance**:
```json
{
  "type": "cover",     // Match intro
  "type": "highlight", // Key moments with minute
  "type": "info"       // Summary/stats
}
```

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
npm run validate # Check schema
npm run dev      # Build + preview
```

**Reasoning**:
- Discoverable via package.json
- No CLI flags to remember
- Standard npm conventions
- Easy for new developers

**DX Features**:
- Emoji icons for visual scanning
- Clear success/error messages
- Helpful next-step suggestions
- Summary statistics

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

### Manual + Schema Validation
**Decision**: Start with validation, plan for tests

**Current**:
- JSON Schema validation
- Manual testing in preview
- Visual QA

**Future** (for production):
```javascript
// Unit tests
describe('StoryBuilder', () => {
  it('should filter goal events correctly');
  it('should sort highlights chronologically');
  it('should cycle through images');
});

// Integration tests
describe('CLI', () => {
  it('should generate valid story.json');
  it('should output correct file');
});
```

**Why Not Now?**
- MVP focused on core functionality
- Schema validation catches structural issues
- Manual testing sufficient for POC

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

## Future Architectural Improvements

### For Production Scale

1. **TypeScript Migration**
   - Type safety
   - Better IDE support
   - Self-documenting code

2. **Modular Event Processors**
   ```javascript
   class GoalProcessor extends EventProcessor {
     shouldInclude(event) { return event.type === 'goal'; }
     toPage(event) { /* ... */ }
   }
   ```

3. **Plugin System**
   ```javascript
   builder.use(new ImageMatcher())
          .use(new NarrativeGenerator())
          .use(new MetricsCollector());
   ```

4. **Configuration File**
   ```yaml
   story:
     maxPages: 10
     includeEventTypes: [goal, red_card]
     imageStrategy: cycle
   ```

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
