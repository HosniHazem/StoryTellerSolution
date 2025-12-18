# AI Usage Documentation

## Overview

This document details how AI (Claude) was used throughout the development process, what worked well, where I intervened, and lessons learned.

---

## AI Tools Used

**Primary**: Claude 3.5 Sonnet (Anthropic)
- Via claude.ai chat interface
- Extended thinking mode for complex problems
- Code generation and review

**Not Used**:
- GitHub Copilot (not needed for this scope)
- ChatGPT (stayed with Claude)
- Other code assistants

---

## Development Phases & AI Assistance

### Phase 1: Understanding Requirements ✅

**AI Helped With**:
- Analyzing job description to understand expectations
- Breaking down task requirements
- Identifying key deliverables
- Understanding schema structure

**My Role**:
- Provided context documents
- Asked clarifying questions about ambiguities
- Decided on project scope

**Outcome**: Clear understanding of "build story + preview viewer"

---

### Phase 2: Project Setup 🤖

**AI Generated**:
```json
{
  "package.json": "Complete with scripts and dependencies",
  "project structure": "Logical organization with src/, preview/, out/",
  "npm scripts": "Intuitive commands (build, preview, validate)"
}
```

**What Worked**:
- AI suggested ES modules (type: "module")
- Proper directory structure
- Semantic npm script names

**What I Changed**:
- Nothing - setup was perfect first try

**Time Saved**: ~15 minutes (vs. manual setup)

---

### Phase 3: Core Story Builder 🧠

**AI Drafted**: Initial `builder.js` structure

**Prompting Strategy**:
```
"Create a StoryBuilder class that:
1. Parses match events JSON
2. Identifies key moments (goals, cards)
3. Maps events to images
4. Generates story pages matching schema"
```

**AI Strengths**:
- Correct class structure immediately
- Good method naming (buildPages, buildMetrics)
- Proper imports and exports
- Schema-compliant output

**Where I Stepped In**:
1. **Event filtering logic**:
   - AI included all yellows (too many pages)
   - I refined: `if (isRed || minute < 30)`

2. **Image cycling**:
   - AI's first attempt: random selection
   - I requested: deterministic cycling by index

3. **Metrics calculation**:
   - AI initially missed penalty goals in count
   - I spotted in testing and fixed

**Code Review Example**:
```javascript
// AI's initial version
const goals = this.events.filter(e => e.type === 'goal');

// My fix after seeing output
const goals = this.events.filter(e => 
  e.type === 'goal' || e.type === 'penalty goal'
);
```

**Outcome**: 90% AI-generated, 10% human refinement

---

### Phase 4: CLI Tool ✅

**AI Generated**: Complete `cli.js` with:
- Proper error handling
- User-friendly output with emojis
- Clear success messages
- Next-step guidance

**No Changes Needed**: AI nailed it first try

**Example Output**:
```
✅ Story built successfully!
📄 Output: /path/to/story.json
📊 Pages: 6
⚽ Score: Celtic 4-0 Kilmarnock

💡 Run "npm run preview" to view the story
```

**Why This Worked**:
- Clear prompt: "Create CLI with helpful output"
- AI understands good DX patterns
- Emojis for scannability

---

### Phase 5: Validation Tool 🔧

**AI Generated**: Schema validation using AJV

**Issue Encountered**:
```javascript
// Error: no schema with key or ref
// "https://json-schema.org/draft/2020-12/schema"
```

**Debugging Process**:
1. AI suggested: `strict: false` option
2. Didn't work
3. I examined schema file manually
4. AI suggested: remove `$schema` property
5. **This fixed it**

**Schema Bug Found**:
```json
// Schema requires pack_id but only defines story_id
"required": ["pack_id", ...],
"properties": {
  "story_id": { ... }  // ❌ Missing pack_id
}
```

**Resolution**:
- I identified the inconsistency
- AI generated fix to add pack_id property
- Validation now passes ✅

**Key Lesson**: AI good at code, human needed for schema debugging

---

### Phase 6: Preview Viewer 🎨

**AI Generated**: Complete `preview/index.html`

**Prompt**:
```
"Create an Instagram-style story viewer with:
- Vertical cards with image backgrounds
- Keyboard and touch navigation
- Progress bar
- Page counter
- No frameworks, vanilla JS"
```

**AI Delivered**:
- 300 lines of clean HTML/CSS/JS
- Gradient overlays for text readability
- Smooth transitions
- Responsive design
- Keyboard shortcuts (← → Space)
- Touch/swipe support

**My Changes**: None - perfect on first generation

**Why This Worked So Well**:
- AI has seen many Instagram-like UIs
- Clear, specific requirements
- Standard web patterns
- No edge cases in scope

**Time Saved**: ~2 hours (vs. writing from scratch)

---

### Phase 7: HTTP Server 🌐

**AI Generated**: Simple Node.js server

**Strengths**:
- Zero dependencies (pure Node.js)
- MIME type mapping
- Security check (path traversal prevention)
- Clean error handling

**Code Quality**:
```javascript
// Security: prevent directory traversal
if (!filePath.startsWith(projectRoot)) {
  res.writeHead(403);
  res.end('Forbidden');
  return;
}
```

**No Changes Needed**: Production-ready code

---

### Phase 8: Documentation 📚

**AI Assisted With**:
1. **PROJECT_README.md**:
   - Structure and sections
   - Code examples
   - Quick start guide

2. **DECISIONS.md**:
   - Initial outline
   - Technical rationale
   - Alternatives considered

3. **This file (AI_USAGE.md)**:
   - Reflection prompts
   - Structure
   - Examples to include

**My Contributions**:
- Personal insights and lessons
- Specific examples from development
- Honest assessment of AI strengths/weaknesses

**Collaboration Pattern**:
- AI drafts structure
- I fill in specifics
- AI helps organize
- I add personality and nuance

---

## Particularly Helpful AI Techniques

### 1. **Iterative Refinement**

**Pattern**:
```
Me: "Build a story generator"
AI: [generates v1]
Me: "Good, but filter yellow cards to only early ones"
AI: [refines code]
Me: "Perfect"
```

**Why It Works**:
- Start broad, narrow down
- AI handles boilerplate
- I focus on business logic

### 2. **Schema-First Generation**

**Process**:
1. Provided JSON schema
2. AI generated code that matches
3. Validation catches any mismatches

**Result**: Zero schema validation bugs in final code

### 3. **Example-Driven Prompts**

**Instead of**:
> "Make the output nice"

**I Prompted**:
> "Add emojis like ✅ for success, ❌ for errors, 
> and helpful next steps like 'Run npm run preview'"

**AI Response**: Exactly what I wanted

### 4. **Code Review Mode**

**Pattern**:
```
Me: "Review this code for edge cases"
AI: [identifies potential issues]
Me: "Good catch, fix it"
AI: [provides corrected version]
```

**Example**: AI caught missing error handling in file operations

---

## Where AI Struggled

### 1. Schema Inconsistency
**Problem**: Schema required `pack_id` but defined `story_id`
**AI**: Didn't catch this automatically
**Human**: Manually inspected schema file
**Lesson**: AI good at generating, humans needed for validation

### 2. Domain-Specific Logic
**Problem**: How many events to include in story?
**AI**: Suggested "all goals and cards" (too many)
**Human**: Applied UX judgment (filter to key moments)
**Lesson**: Product decisions need human judgment

### 3. Image Matching
**AI**: Suggested random image selection
**Human**: Wanted deterministic, consistent mapping
**AI**: Easily adjusted when given clear requirement
**Lesson**: Be specific about non-obvious requirements

---

## Where I Chose NOT to Use AI

### 1. **Business Logic Decisions**
- Which events to include
- How many pages is optimal
- Story narrative flow

**Why**: Requires product sense and UX intuition

### 2. **Manual Testing**
- Clicking through preview
- Checking visual polish
- Verifying story makes sense

**Why**: Need human eyes for UX quality

### 3. **Schema Debugging**
- Comparing schema vs. code
- Finding inconsistencies
- Understanding validation errors

**Why**: Complex reasoning about multiple sources

---

## Time Saved vs. Time Invested

### Without AI (Estimated)
- Project setup: 30 min
- Story builder: 2 hours
- CLI: 30 min
- Validation: 45 min
- Preview viewer: 3 hours
- Server: 45 min
- Documentation: 2 hours
**Total**: ~9.5 hours

### With AI (Actual)
- Project setup: 5 min (AI)
- Story builder: 1 hour (AI + refinement)
- CLI: 5 min (AI)
- Validation: 30 min (AI + debugging)
- Preview viewer: 10 min (AI)
- Server: 5 min (AI)
- Documentation: 1 hour (AI + my input)
**Total**: ~3 hours

**Time Saved**: ~6.5 hours (~68%)

**Productivity Multiplier**: ~3x

---

## AI as a Pair Programmer

### What AI Did Well (Like a Junior Dev)
✅ Generate boilerplate code
✅ Follow patterns and conventions  
✅ Implement well-defined requirements
✅ Catch syntax errors
✅ Suggest standard approaches
✅ Write documentation structure

### What I Did (Like a Senior Dev)
✅ Define requirements and scope
✅ Make product decisions
✅ Catch logical bugs
✅ Refine UX details
✅ Debug complex issues
✅ Ensure code quality
✅ Add domain expertise

---

## Code Quality Assessment

### AI-Generated Code Quality: 8.5/10

**Strengths**:
- Clean, readable
- Proper error handling
- Good naming conventions
- Follows best practices
- DRY principle
- Secure (path traversal checks)

**Weaknesses**:
- Occasional logic bugs (metrics counting)
- Sometimes over-engineers (initially)
- Needs refinement for edge cases

**Production-Ready?** Yes, with review

---

## Lessons for Future Projects

### 1. **Start with AI for Scaffolding**
Generate project structure, boilerplate, standard patterns first.

### 2. **Iterate with Specific Feedback**
Don't settle for first output - refine with clear requests.

### 3. **Human Review is Essential**
Always test, review, and validate AI-generated code.

### 4. **Use AI for Documentation**
AI excels at structure and formatting, human adds depth.

### 5. **Know When to Take Over**
Product decisions, UX polish, and debugging need human judgment.

### 6. **Prompt Engineering Matters**
```
❌ "Make it better"
✅ "Add error handling with try-catch, include helpful error messages, 
    and exit with code 1 on failure"
```

---

## Recommended Workflow

Based on this project, here's the optimal human-AI collaboration flow:

1. **Design** (Human): Define requirements, architecture
2. **Scaffold** (AI): Generate project structure
3. **Implement** (AI → Human): AI generates, human refines
4. **Test** (Human): Manual testing and validation
5. **Debug** (Human + AI): Human identifies, AI helps fix
6. **Document** (AI → Human): AI structures, human adds insight
7. **Review** (Human): Final quality check

---

## Impact on Development Approach

### Before AI
```
1. Research best practices
2. Set up project manually
3. Write all code from scratch
4. Debug and refine
5. Write documentation
Time: ~10 hours
```

### With AI
```
1. Define clear requirements
2. AI generates scaffolding
3. Iterate on code with AI
4. Focus on business logic
5. Collaborate on docs
Time: ~3 hours
```

### Key Difference
**Focus shifted from writing code to reviewing code and making decisions.**

This aligns perfectly with Storyteller's job description:
> "using AI heavily to design, build and refine solutions"

---

## Phase 6: Enhanced Features (Phases 1-3) 🚀

### Overview
After completing the core functionality, we implemented three phases of enhancements to make the solution production-ready and demonstrate product thinking.

### Phase 1: Quick Wins

**AI Generated**:
- Player name extraction logic from squad JSON files
- Auto-advance timer implementation with pause/resume
- Smooth transition CSS and JavaScript

**What Worked**:
- AI correctly identified squad JSON structure
- Auto-advance logic was sound (requestAnimationFrame approach)
- Transition timing was appropriate

**What I Refined**:
- Player name fallback handling (graceful degradation)
- Touch event handling for mobile pause/resume
- Image preloading strategy for smoother transitions

**Time Saved**: ~45 minutes (vs. manual implementation)

### Phase 2: Product Thinking

**AI Generated**:
- Share menu HTML/CSS structure
- Clipboard API implementation
- Social sharing URL generation
- Export functionality (JSON download, image sequence)

**What Worked**:
- AI understood modern clipboard API
- Social sharing URLs were correct
- Export logic was efficient

**What I Refined**:
- Toast notification system for user feedback
- Error handling for clipboard API fallback
- Image export sequencing (prevent browser blocking)

**Time Saved**: ~60 minutes

### Phase 3: Production Polish

**AI Generated**:
- ARIA labels and roles throughout HTML
- Screen reader announcement system
- Analytics tracking infrastructure
- Performance optimization strategies
- Initial layout and logic for squad presentation page ("Our Squad Today")
- Initial implementation of end-of-story engagement (final Player of the Match page when the posting team wins)

**What Worked**:
- AI had excellent knowledge of accessibility best practices
- Analytics structure was well-designed
- Performance optimizations were appropriate

**What I Refined**:
- Keyboard navigation (added Home/End keys)
- Focus management for share menu
- Analytics data structure (added interaction logging)
- Image caching implementation details

**Time Saved**: ~90 minutes

### Key Learnings from Enhanced Features

1. **AI Excels at**:
   - Accessibility standards (WCAG guidelines)
   - Modern web APIs (Clipboard, Intersection Observer)
   - Performance best practices
   - Code structure and patterns

2. **Human Judgment Needed For**:
   - UX decisions (auto-advance timing, pause behavior)
   - Product features (what to share, how to export)
   - Integration points (analytics server connection)
   - Edge cases (mobile touch handling, browser compatibility)

3. **Collaboration Pattern**:
   - AI: Generate initial implementation
   - Human: Review, refine, test
   - AI: Fix issues, add polish
   - Human: Final QA and integration

**Total Time for Enhanced Features**: ~3.5 hours (with AI) vs. ~8+ hours (without AI)

---

## Conclusion

### AI as a Tool, Not a Replacement

**What AI Enabled**:
- Faster prototyping
- More time for product thinking
- Better code structure
- Comprehensive documentation

**What AI Didn't Replace**:
- Product judgment
- UX intuition  
- Debugging skills
- Code review
- Quality assurance

### The Future of Development

This project shows that **AI + Human** is the optimal approach:
- AI handles mechanical work
- Humans focus on decision-making
- Together, they're 3x faster than either alone

### Personal Takeaway

I'm excited about this workflow because it:
- Removes tedious work
- Allows focus on creative problem-solving
- Maintains high code quality
- Accelerates iteration speed

This is exactly the "AI-native working style" Storyteller is looking for.

---

**AI Tools**: Claude 3.5 Sonnet  
**Human**: Architecture, refinement, testing, judgment  
**Result**: Production-ready code in ~3 hours