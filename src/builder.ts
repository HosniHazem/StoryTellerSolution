import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  EventsData,
  MatchEvent,
  Story,
  StoryMetrics,
  CoverPage,
  HighlightPage,
  InfoPage,
  StoryPage,
  StoryConfig,
  StoryPerspective
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Story Builder - Converts match events into a Story JSON
 * 
 * Design principles:
 * - Extract key moments (goals, cards, penalties)
 * - Create narrative flow (cover -> highlights -> summary)
 * - Match images to events where available
 * - Keep it simple and maintainable
 */

export class StoryBuilder {
  private eventsData: EventsData;
  private events: MatchEvent[];
  private matchInfo: EventsData['matchInfo'];
  private assetsPath: string;
  private config: StoryConfig;
  private usedImages: Set<string> = new Set();
  private playerCache: Map<string, string> = new Map();
  private squadsByTeamId: Map<string, any> = new Map();

  private static readonly IMAGE_POOL: string[] = [
    '21521989.jpg', '21521990.jpg', '21522003.jpg', '21522014.jpg',
    '21522057.jpg', '21522058.jpg', '21522071.jpg', '21522140.jpg',
    '21522328.jpg', '21522345.jpg', '21522412.jpg', '21522413.jpg',
    '21522414.jpg', '21522436.jpg', '21522449.jpg', '21522450.jpg'
  ];

  private static DEFAULT_CONFIG: StoryConfig = {
    perspective: 'home',
    teamId: null,
    maxHighlightPages: 6,
    includeOpponentBigChances: true,
    includeCards: true,
    cardMinuteCutoff: 30
  };

  constructor(eventsPath: string, assetsPath: string) {
    this.eventsData = JSON.parse(readFileSync(eventsPath, 'utf-8')) as EventsData;
    this.assetsPath = assetsPath;
    this.events = this.eventsData.messages[0].message;
    this.matchInfo = this.eventsData.matchInfo;
    this.config = this.loadConfig();
    this.loadPlayerNames();
  }

  /**
   * Main build method - orchestrates story creation
   */
  build(): Story {
    const story: Story = {
      pack_id: this.matchInfo.id,
      title: this.matchInfo.description,
      source: 'match_events',
      created_at: new Date().toISOString(),
      metrics: this.buildMetrics(),
      pages: this.buildPages()
    };

    return story;
  }

  /**
   * Build story metrics for analytics
   */
  private buildMetrics(): StoryMetrics {
    const goals = this.events.filter(e => e.type === 'goal' || e.type === 'penalty goal');
    const homeTeam = this.matchInfo.contestant[0].name;
    const awayTeam = this.matchInfo.contestant[1].name;
    
    const homeGoals = goals.filter(g => g.teamRef1 === this.matchInfo.contestant[0].id).length;
    const awayGoals = goals.filter(g => g.teamRef1 === this.matchInfo.contestant[1].id).length;

    return {
      total_events: this.events.length,
      total_goals: goals.length,
      score: `${homeTeam} ${homeGoals}-${awayGoals} ${awayTeam}`,
      match_date: this.matchInfo.date,
      venue: this.matchInfo.venue.longName
    };
  }

  /**
   * Build all pages in the story
   */
  private buildPages(): StoryPage[] {
    const pages: StoryPage[] = [];

    // 1. Intro / cover page (no score)
    pages.push(this.buildCoverPage());

    // 1b. Squad page for posting team (if configured and data available)
    const squadPage = this.buildSquadPage();
    if (squadPage) {
      pages.push(squadPage);
    }

    // 2. Highlight pages for key events
    const highlights = this.buildHighlightPages();
    const firstHalfHighlights = highlights.filter(h => h.minute <= 45);
    const secondHalfHighlights = highlights.filter(h => h.minute > 45);

    pages.push(...firstHalfHighlights);

    // 3. Half-time info page (only if there are second-half events)
    if (this.hasSecondHalf()) {
      pages.push(this.buildHalfTimePage());
    }

    pages.push(...secondHalfHighlights);

    // 4. Final summary page
    pages.push(this.buildSummaryPage());

    // 5. Optional engagement page (only when posting team wins)
    const motmPage = this.buildPlayerOfTheMatchPage();
    if (motmPage) {
      pages.push(motmPage);
    }

    return pages;
  }

  /**
   * Create cover page with match info
   */
  private buildCoverPage(): CoverPage {
    const homeTeam = this.matchInfo.contestant[0].name;
    const awayTeam = this.matchInfo.contestant[1].name;

    return {
      type: 'cover',
      headline: `${homeTeam} vs ${awayTeam}`,
      subheadline: `${this.matchInfo.competition.knownName} • ${this.matchInfo.venue.longName} • ${this.formatDate(this.matchInfo.date)}`,
      image: this.reserveSpecificImage('21521989.jpg') // Use first available image (and ensure uniqueness)
    };
  }

  /**
   * Create squad info page for the configured posting team (teamId).
   * Shows only active players and coach, grouped by position.
   */
  private buildSquadPage(): InfoPage | null {
    const postingTeamId = this.config.teamId;
    if (!postingTeamId) {
      return null;
    }

    const squad = this.squadsByTeamId.get(postingTeamId);
    if (!squad || !Array.isArray(squad.person)) {
      return null;
    }

    const activePeople = squad.person.filter((p: any) => p.active === 'yes' || p.active === true || p.active === 'Y');
    const players = activePeople.filter((p: any) => p.type === 'player');
    const coach = activePeople.find((p: any) => p.type === 'coach');

    if (players.length === 0 && !coach) {
      return null;
    }

    // Group players by position
    const playersByPosition: Record<string, any[]> = {};
    players.forEach((p: any) => {
      const pos = p.position || 'Other';
      if (!playersByPosition[pos]) {
        playersByPosition[pos] = [];
      }
      playersByPosition[pos].push(p);
    });

    // Determine team name and headline
    const teamContestant = this.matchInfo.contestant.find(c => c.id === postingTeamId);
    const teamName = teamContestant ? teamContestant.name : this.getTeamName(postingTeamId);
    const isExplicitPostingTeam =
      this.config.teamId !== null &&
      this.config.teamId !== undefined &&
      postingTeamId === this.config.teamId;

    const headline = isExplicitPostingTeam ? 'Our Squad Today' : `${teamName} Squad`;

    const bodyLines: string[] = [];
    bodyLines.push('Squad for this match:');

    const positionOrder = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'];
    const addedPositions = new Set<string>();

    const pushPositionGroup = (position: string, label?: string) => {
      const group = playersByPosition[position];
      if (!group || group.length === 0) return;
      addedPositions.add(position);

      const lines: string[] = [];
      lines.push(`${label || position}s:`);
      group
        .sort((a: any, b: any) => (a.shirtNumber || 0) - (b.shirtNumber || 0))
        .forEach((p: any) => {
          const number = p.shirtNumber ? `#${p.shirtNumber} ` : '';
          const name = `${p.firstName} ${p.lastName}`.trim();
          lines.push(`- ${number}${name}`);
        });

      bodyLines.push(lines.join('\n'));
    };

    // Preferred order
    positionOrder.forEach(pos => pushPositionGroup(pos));

    // Any remaining positions not in the preferred order
    Object.keys(playersByPosition)
      .filter(pos => !addedPositions.has(pos))
      .sort()
      .forEach(pos => pushPositionGroup(pos));

    if (coach) {
      const coachName = `${coach.firstName} ${coach.lastName}`.trim();
      bodyLines.push(`Coach: ${coachName}`);
    }

    return {
      type: 'info',
      headline,
      body: bodyLines.join('\n\n'),
      image: this.reserveSpecificImage('21522071.jpg')
    };
  }

  /**
   * Create half-time info page with score at the break.
   */
  private buildHalfTimePage(): InfoPage {
    const homeTeam = this.matchInfo.contestant[0].name;
    const awayTeam = this.matchInfo.contestant[1].name;

    const goals = this.events.filter(
      e =>
        (e.type === 'goal' || e.type === 'penalty goal') &&
        (e.period === '1' || parseInt(e.minute || '0', 10) <= 45)
    );

    const homeGoals = goals.filter(g => g.teamRef1 === this.matchInfo.contestant[0].id).length;
    const awayGoals = goals.filter(g => g.teamRef1 === this.matchInfo.contestant[1].id).length;

    const headline = 'Half-time whistle';
    const bodyLines: string[] = [];
    bodyLines.push(`Score at the break: ${homeTeam} ${homeGoals}-${awayGoals} ${awayTeam}.`);

    const postingTeamId = this.config.teamId;
    const postingIsHome = postingTeamId && postingTeamId === this.matchInfo.contestant[0].id;
    const postingIsAway = postingTeamId && postingTeamId === this.matchInfo.contestant[1].id;

    if (postingTeamId) {
      const postingGoals = postingIsHome ? homeGoals : postingIsAway ? awayGoals : null;
      const otherGoals = postingIsHome ? awayGoals : postingIsAway ? homeGoals : null;

      if (postingGoals !== null && otherGoals !== null) {
        if (postingGoals > otherGoals) {
          bodyLines.push('We take a lead into the interval after a strong first half.');
        } else if (postingGoals < otherGoals) {
          bodyLines.push('We trail at the break; we stay calm and adjust for the second half.');
        } else {
          bodyLines.push('All square at the break; we stay focused for the next 45.');
        }
      } else {
        // Fallback to neutral if posting team not in contestants
        if (homeGoals > awayGoals) {
          bodyLines.push(`${homeTeam} take a lead into the interval after a strong first half.`);
        } else if (awayGoals > homeGoals) {
          bodyLines.push(`${awayTeam} go in ahead at half-time against the run of play.`);
        } else {
          bodyLines.push('All square at the break after a tightly contested first half.');
        }
      }
    } else {
      if (homeGoals > awayGoals) {
        bodyLines.push(`${homeTeam} take a lead into the interval after a strong first half.`);
      } else if (awayGoals > homeGoals) {
        bodyLines.push(`${awayTeam} go in ahead at half-time against the run of play.`);
      } else {
        bodyLines.push('All square at the break after a tightly contested first half.');
      }
    }

    return {
      type: 'info',
      headline,
      body: bodyLines.join('\n\n'),
      image: this.reserveSpecificImage('21522014.jpg')
    };
  }

  /**
   * Create highlight pages for goals, cards, and key moments
   */
  private buildHighlightPages(): HighlightPage[] {
    type ScoredHighlight = HighlightPage & { importance: number };

    const scored: ScoredHighlight[] = [];

    // Track score over time to understand turning points
    const homeTeamId = this.matchInfo.contestant[0].id;
    const awayTeamId = this.matchInfo.contestant[1].id;
    let homeGoalsSoFar = 0;
    let awayGoalsSoFar = 0;

    this.events.forEach((event, index) => {
      const classification = this.classifyEvent(event);
      if (classification.importance <= 0) {
        return;
      }

      const minute = parseInt(event.minute || '0', 10);
      const teamName = this.getTeamName(event.teamRef1);
      const narrativeName = this.getNarrativeTeamName(event.teamRef1);
      const isPostingTeam = this.isPostingTeam(event.teamRef1);

      // Goals and penalty goals
      if (event.type === 'goal' || event.type === 'penalty goal') {
        const isPenalty = event.type === 'penalty goal';

        // Score before this goal
        const isHomeTeam = event.teamRef1 === homeTeamId;
        const scoreBeforeHome = homeGoalsSoFar;
        const scoreBeforeAway = awayGoalsSoFar;

        // Update running score
        if (isHomeTeam) {
          homeGoalsSoFar += 1;
        } else if (event.teamRef1 === awayTeamId) {
          awayGoalsSoFar += 1;
        }

        const scoreAfterHome = homeGoalsSoFar;
        const scoreAfterAway = awayGoalsSoFar;

        // Narrative-aware headline & caption
        const goalForPostingTeam = isPostingTeam;
        const postingTeamLeadingAfter =
          goalForPostingTeam &&
          ((isHomeTeam && scoreAfterHome > scoreAfterAway) ||
            (!isHomeTeam && scoreAfterAway > scoreAfterHome));

        const wasLevelBefore = scoreBeforeHome === scoreBeforeAway;
        const wasBehindBefore =
          goalForPostingTeam &&
          ((isHomeTeam && scoreBeforeHome < scoreBeforeAway) ||
            (!isHomeTeam && scoreBeforeAway < scoreBeforeHome));

        const leadMarginAfter = Math.abs(scoreAfterHome - scoreAfterAway);
        const isLate = minute >= 80;

        // Get player name for headline
        const playerName = this.getPlayerName(event.playerRef1);
        const playerDisplay = playerName ? `${playerName} ` : '';

        let headline: string;
        let caption: string;

        if (scoreBeforeHome === 0 && scoreBeforeAway === 0) {
          // First goal of the match
          if (playerName) {
            headline = isPenalty 
              ? `⚽ ${playerName} from the spot!` 
              : `⚽ ${playerName} breaks through!`;
          } else {
            headline = isPenalty ? '⚽ Breakthrough from the spot!' : '⚽ Breakthrough!';
          }
          caption = `${narrativeName} open the scoring and set the tone of the match.`;
        } else if (wasBehindBefore && postingTeamLeadingAfter) {
          // Comeback turning point
          if (playerName) {
            headline = `⚽ ${playerName} turns it around!`;
          } else {
            headline = '⚽ Turnaround!';
          }
          caption = `${narrativeName} flip the game on its head with a crucial goal.`;
        } else if (goalForPostingTeam && wasLevelBefore && postingTeamLeadingAfter) {
          // Go-ahead goal from level
          if (playerName) {
            headline = `⚽ ${playerName} puts ${narrativeName} ahead!`;
          } else {
            headline = '⚽ Go-ahead goal!';
          }
          caption = `${narrativeName} edge in front as the pressure pays off.`;
        } else if (goalForPostingTeam && leadMarginAfter >= 2 && minute >= 60) {
          // Extending an already strong lead late on
          if (playerName) {
            headline = `⚽ ${playerName} extends the lead!`;
          } else {
            headline = '⚽ Turning the screw!';
          }
          caption = `${narrativeName} tighten their grip on the match with another goal.`;
        } else if (goalForPostingTeam && isLate) {
          // Late clincher
          if (playerName) {
            headline = isPenalty 
              ? `⚽ ${playerName} from the spot!` 
              : `⚽ ${playerName} seals it!`;
          } else {
            headline = isPenalty ? '⚽ Late penalty!' : '⚽ Late clincher!';
          }
          caption = `${narrativeName} all but settle the contest in the closing stages.`;
        } else if (goalForPostingTeam && wasBehindBefore && scoreAfterHome === scoreAfterAway) {
          // From behind to level
          if (playerName) {
            headline = `⚽ ${playerName} levels it!`;
          } else {
            headline = '⚽ Level again!';
          }
          caption = `${narrativeName} draw level and ramp up the pressure.`;
        } else if (goalForPostingTeam && wasBehindBefore && !postingTeamLeadingAfter) {
          // From behind but still behind (pull one back)
          if (playerName) {
            headline = `⚽ ${playerName} pulls one back!`;
          } else {
            headline = '⚽ Back in it!';
          }
          caption = `${narrativeName} pull one back and keep pushing.`;
        } else {
          // Generic but still contextual
          const hasPostingTeam = !!this.config.teamId;
          if (!goalForPostingTeam && hasPostingTeam) {
            // Opponent scores against us: keep calm, fan-friendly tone
            if (playerName) {
              headline = isPenalty ? `⚽ ${playerName} from the spot.` : `⚽ ${playerName} scores.`;
            } else {
              headline = isPenalty ? '⚽ Penalty goal.' : '⚽ Goal.';
            }
            caption = `${teamName} score, we stay composed and push on.`;
          } else {
            if (playerName) {
              headline = isPenalty 
                ? `⚽ ${playerName} from the spot!` 
                : `⚽ ${playerName}!`;
            } else {
              headline = isPenalty ? '⚽ Penalty Goal!' : '⚽ GOAL!';
            }
            const isExplicitPostingTeam =
              isPostingTeam && this.config.teamId && event.teamRef1 === this.config.teamId;
            const advantagePhrase = isExplicitPostingTeam
              ? 'extend our advantage'
              : 'extend their advantage';
            caption = `${narrativeName} ${isPostingTeam ? advantagePhrase : 'find the net'}${isPenalty ? ' from the spot' : ''}.`;
          }
        }

        // If this is a penalty, first show the award as its own moment
        if (isPenalty) {
          const { won, lost } = this.getPenaltyContext(event);
          if (won || lost) {
            const contextParts: string[] = [];
            if (won) {
              const isWonPostingTeam = this.isPostingTeam(won.teamRef1);
              contextParts.push(
                this.localizePronouns(this.cleanComment(won.comment), isWonPostingTeam)
              );
            }
            if (lost) {
              const isLostPostingTeam = this.isPostingTeam(lost.teamRef1);
              contextParts.push(
                this.localizePronouns(this.cleanComment(lost.comment), isLostPostingTeam)
              );
            }

            const awardMinute = won
              ? parseInt(won.minute || event.minute || '0', 10)
              : minute;

            const hasPostingTeam = !!this.config.teamId;
            let awardCaption: string;
            if (isPostingTeam) {
              awardCaption = `${narrativeName} earn a golden chance from the spot.`;
            } else if (hasPostingTeam) {
              awardCaption = `${teamName} win a penalty, we stay calm and regroup.`;
            } else {
              awardCaption = `${narrativeName} concede a crucial penalty.`;
            }

            scored.push({
              type: 'highlight',
              minute: awardMinute,
              headline: 'Penalty awarded!',
              caption: awardCaption,
              image: this.getImageForEvent(won ?? event, index),
              explanation: contextParts.join(' '),
              // Slightly lower importance so the outcome slide is prioritised if we hit the max
              importance: classification.importance - 2
            });
          }
        }

        const explanation = this.localizePronouns(
          this.cleanComment(event.comment),
          isPostingTeam
        );

        scored.push({
          type: 'highlight',
          minute,
          headline,
          caption,
          image: this.getImageForEvent(event, index),
          explanation,
          importance: classification.importance
        });
        return;
      }

      // Big chances (posts, dangerous misses/saves/blocks)
      if (classification.category === 'big_chance') {
        const playerName = this.getPlayerName(event.playerRef1);
        let headline: string;
        if (event.type === 'post') {
          if (playerName) {
            headline = `🚨 ${playerName} hits the post!`;
          } else {
            headline = '🚨 Off the Post!';
          }
        } else {
          headline = '🚨 Big Chance!';
        }
        const caption = isPostingTeam
          ? `${narrativeName} go close to scoring`
          : `${narrativeName} threaten the goal`;
        const explanation = this.localizePronouns(
          this.cleanComment(event.comment),
          isPostingTeam
        );

        scored.push({
          type: 'highlight',
          minute,
          headline,
          caption,
          image: this.getImageForEvent(event, index),
          explanation,
          importance: classification.importance
        });
        return;
      }

      // Cards
      if (classification.category === 'card' && this.config.includeCards) {
        const isRed = event.type === 'red card';
        const caption = isRed
          ? `${narrativeName} reduced to ten men`
          : `${narrativeName} player booked`;

        const explanation = this.localizePronouns(
          this.cleanComment(event.comment),
          isPostingTeam
        );

        scored.push({
          type: 'highlight',
          minute,
          headline: isRed ? '🟥 Red Card!' : '🟨 Yellow Card',
          caption,
          image: this.getImageForEvent(event, index),
          explanation,
          importance: classification.importance
        });
      }
    });

    if (scored.length === 0) {
      return [];
    }

    // Limit number of highlights by importance, then restore chronological order
    const maxHighlights = Math.max(1, this.config.maxHighlightPages);
    const top = scored
      .sort((a, b) => b.importance - a.importance || a.minute - b.minute)
      .slice(0, maxHighlights)
      .sort((a, b) => a.minute - b.minute);

    return top.map(({ importance, ...page }) => page);
  }

  /**
   * Create final summary/info page
   */
  private buildSummaryPage(): InfoPage {
    const goals = this.events.filter(e => e.type === 'goal' || e.type === 'penalty goal');
    const homeTeam = this.matchInfo.contestant[0].name;
    const awayTeam = this.matchInfo.contestant[1].name;
    const homeGoals = goals.filter(g => g.teamRef1 === this.matchInfo.contestant[0].id).length;
    const awayGoals = goals.filter(g => g.teamRef1 === this.matchInfo.contestant[1].id).length;

    const winnerTeamId =
      homeGoals > awayGoals
        ? this.matchInfo.contestant[0].id
        : awayGoals > homeGoals
        ? this.matchInfo.contestant[1].id
        : null;

    const winner =
      homeGoals > awayGoals ? homeTeam :
      awayGoals > homeGoals ? awayTeam :
      'Draw';

    const postingTeamWins =
      winnerTeamId !== null &&
      this.config.teamId !== null &&
      this.config.teamId !== undefined &&
      winnerTeamId === this.config.teamId;

    const headline =
      winner === 'Draw'
        ? 'Match Drawn'
        : postingTeamWins
        ? 'We Won! 🏆'
        : `${winner} Wins! 🏆`;

    const context = this.getMatchContext();
    const keyPlayers = this.getKeyPlayers();

    let body = `Full Time: ${homeTeam} ${homeGoals}-${awayGoals} ${awayTeam}\n\n`;
    body += `Venue: ${context.venue}\n`;
    body += `Competition: ${context.competition}\n`;
    
    // Add match context if available
    if (context.week) {
      body += `Matchweek: ${context.week}\n`;
    }
    if (context.stage) {
      body += `Stage: ${context.stage}\n`;
    }
    
    body += `\n`;

    // Add key players if available
    if (keyPlayers.length > 0) {
      const topScorer = keyPlayers[0];
      if (topScorer.count > 1) {
        body += `⚽ ${topScorer.name} scored ${topScorer.count} goals\n`;
      } else if (keyPlayers.length > 0) {
        body += `⚽ ${topScorer.name} on the scoresheet\n`;
      }
      body += `\n`;
    }

    if (winner === 'Draw') {
      body += 'Both teams share the points in an evenly contested match.';
    } else if (postingTeamWins) {
      body += 'We take all three points with a dominant performance.';
    } else if (this.config.teamId) {
      body += 'We fall short today but will regroup and go again.';
    } else {
      body += `${winner} takes all three points.`;
    }

    return {
      type: 'info',
      headline,
      body,
      image: this.reserveSpecificImage('21522057.jpg')
    };
  }

  /**
   * Create an engaging final page asking fans for their player of the match,
   * but only when the configured posting team (teamId) wins the game.
   */
  private buildPlayerOfTheMatchPage(): InfoPage | null {
    if (!this.config.teamId) return null;

    const goals = this.events.filter(e => e.type === 'goal' || e.type === 'penalty goal');
    const homeTeamId = this.matchInfo.contestant[0].id;
    const awayTeamId = this.matchInfo.contestant[1].id;
    const homeTeam = this.matchInfo.contestant[0].name;
    const awayTeam = this.matchInfo.contestant[1].name;

    const homeGoals = goals.filter(g => g.teamRef1 === homeTeamId).length;
    const awayGoals = goals.filter(g => g.teamRef1 === awayTeamId).length;

    const winnerTeamId =
      homeGoals > awayGoals ? homeTeamId :
      awayGoals > homeGoals ? awayTeamId :
      null;

    // Only show this page if the posting team actually won
    if (!winnerTeamId || winnerTeamId !== this.config.teamId) {
      return null;
    }

    const scoreLine = `${homeTeam} ${homeGoals}-${awayGoals} ${awayTeam}`;
    const headline = 'Who was your Player of the Match?';
    const bodyLines: string[] = [];

    bodyLines.push(`Full Time: ${scoreLine}`);
    bodyLines.push('');
    bodyLines.push('We get the win today – now it\'s over to you. 👀');
    bodyLines.push('Who stood out the most for you?');

    return {
      type: 'info',
      headline,
      body: bodyLines.join('\n'),
      image: this.reserveSpecificImage('21522140.jpg')
    };
  }

  /**
   * Helper: Get team name from team reference ID
   */
  private getTeamName(teamRef: string): string {
    const team = this.matchInfo.contestant.find(c => c.id === teamRef);
    return team ? team.name : 'Unknown';
  }

  /**
   * Load player names from squad JSON files
   */
  private loadPlayerNames(): void {
    const projectRoot = join(__dirname, '..');
    const homeTeamId = this.matchInfo.contestant[0].id;
    const awayTeamId = this.matchInfo.contestant[1].id;

    // Try to load squad files
    const squadFiles = [
      { path: join(projectRoot, 'data', 'celtic-squad.json'), teamId: homeTeamId },
      { path: join(projectRoot, 'data', 'kilmarnock-squad.json'), teamId: awayTeamId }
    ];

    squadFiles.forEach(({ path, teamId }) => {
      try {
        const squadData = JSON.parse(readFileSync(path, 'utf-8'));
        if (squadData.squad && Array.isArray(squadData.squad)) {
          squadData.squad.forEach((squad: any) => {
            if (squad.contestantId) {
              this.squadsByTeamId.set(squad.contestantId, squad);
            }
            if (squad.contestantId === teamId && squad.person) {
              squad.person.forEach((person: any) => {
                if (person.id && person.firstName && person.lastName) {
                  const fullName = `${person.firstName} ${person.lastName}`;
                  this.playerCache.set(person.id, fullName);
                }
              });
            }
          });
        }
      } catch {
        // Squad file not found or invalid - continue without it
      }
    });
  }

  /**
   * Get player name from player reference ID
   */
  private getPlayerName(playerRef: string | undefined): string | null {
    if (!playerRef) return null;
    return this.playerCache.get(playerRef) || null;
  }

  /**
   * Helper: Get the narrative subject for a team:
   * - If story-config.json has a teamId and it matches, use "We"
   * - Otherwise fall back to the actual team name
   */
  private getNarrativeTeamName(teamRef: string | undefined): string {
    if (teamRef && this.config.teamId && teamRef === this.config.teamId) {
      return 'We';
    }
    return teamRef ? this.getTeamName(teamRef) : 'Unknown';
  }

  /**
   * Helper: Adjust pronouns for "our" perspective when the posting team is speaking.
   * Currently focuses on "their" → "our" while preserving capitalization.
   */
  private localizePronouns(text: string, isPostingTeam: boolean): string {
    if (!isPostingTeam) return text;
    return text.replace(/\b[tT]heir\b/g, (match) =>
      match[0] === 'T' ? 'Our' : 'our'
    );
  }

  /**
   * Helper: Map events to available images
   */
  private getImageForEvent(event: MatchEvent, index: number): string {
    const images = StoryBuilder.IMAGE_POOL;
    const total = images.length;
    const startIndex = index % total;

    // Prefer an unused image, starting from a position based on the event index
    for (let i = 0; i < total; i++) {
      const candidateIndex = (startIndex + i) % total;
      const filename = images[candidateIndex];
      if (!this.usedImages.has(filename)) {
        this.usedImages.add(filename);
        return this.getAssetPath(filename);
      }
    }

    // Fallback: all images used, so reuse deterministically
    const fallback = images[startIndex];
    return this.getAssetPath(fallback);
  }

  /**
   * Helper: Reserve a specific image filename if available, otherwise pick
   * the first unused image from the pool. Ensures we don't reuse images
   * until we've exhausted the pool.
   */
  private reserveSpecificImage(preferred: string): string {
    const images = StoryBuilder.IMAGE_POOL;

    let filename = preferred;
    if (this.usedImages.has(preferred)) {
      const unused = images.find(img => !this.usedImages.has(img));
      if (unused) {
        filename = unused;
      }
    }

    this.usedImages.add(filename);
    return this.getAssetPath(filename);
  }

  /**
   * Helper: Get asset path (relative for JSON, works in preview)
   */
  private getAssetPath(filename: string): string {
    return `../assets/${filename}`;
  }

  /**
   * Helper: Clean up comment text
   */
  private cleanComment(comment: string): string {
    return comment
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Helper: Format date nicely
   */
  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }

  /**
   * Get match context information
   */
  private getMatchContext(): {
    competition: string;
    venue: string;
    date: string;
    week?: string;
    stage?: string;
  } {
    return {
      competition: this.matchInfo.competition.knownName || this.matchInfo.competition.name,
      venue: this.matchInfo.venue.longName,
      date: this.matchInfo.date,
      week: (this.matchInfo as any).week,
      stage: (this.matchInfo as any).stage?.name
    };
  }

  /**
   * Get key players from the match (scorers, assist providers)
   */
  private getKeyPlayers(): Array<{ name: string; role: 'scorer' | 'assist'; count: number }> {
    const playerStats = new Map<string, { name: string; goals: number; assists: number }>();

    this.events.forEach(event => {
      if (event.type === 'goal' || event.type === 'penalty goal') {
        const playerId = event.playerRef1;
        if (playerId) {
          const playerName = this.getPlayerName(playerId);
          if (playerName) {
            const stats = playerStats.get(playerId) || { name: playerName, goals: 0, assists: 0 };
            stats.goals += 1;
            playerStats.set(playerId, stats);
          }
        }
      }
    });

    const keyPlayers: Array<{ name: string; role: 'scorer' | 'assist'; count: number }> = [];
    playerStats.forEach((stats, playerId) => {
      if (stats.goals > 0) {
        keyPlayers.push({ name: stats.name, role: 'scorer', count: stats.goals });
      }
    });

    return keyPlayers.sort((a, b) => b.count - a.count).slice(0, 3);
  }

  /**
   * Load story configuration from the project root, falling back to defaults.
   */
  private loadConfig(): StoryConfig {
    const projectRoot = join(__dirname, '..');
    const configPath = join(projectRoot, 'story-config.json');

    try {
      const raw = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<StoryConfig>;
      return {
        ...StoryBuilder.DEFAULT_CONFIG,
        ...parsed
      };
    } catch {
      return StoryBuilder.DEFAULT_CONFIG;
    }
  }

  /**
   * Determine the "posting team" id based on the configured perspective.
   */
  private getPostingTeamId(): string | null {
    // Explicit teamId always wins if provided
    if (this.config.teamId) {
      return this.config.teamId;
    }

    const perspective: StoryPerspective = this.config.perspective;

    if (perspective === 'home') {
      return this.matchInfo.contestant[0]?.id ?? null;
    }
    if (perspective === 'away') {
      return this.matchInfo.contestant[1]?.id ?? null;
    }
    if (perspective === 'team') {
      return this.config.teamId ?? null;
    }
    // neutral
    return null;
  }

  private isPostingTeam(teamRef: string | undefined): boolean {
    if (!teamRef) return false;
    const postingTeamId = this.getPostingTeamId();
    if (!postingTeamId) return false;
    return teamRef === postingTeamId;
  }

  /**
   * Classify an event into a narrative category and assign an importance score.
   * This is used to pick the best moments for the story.
   */
  private classifyEvent(event: MatchEvent): { category: 'goal' | 'big_chance' | 'card' | 'other'; importance: number } {
    const minute = parseInt(event.minute || '0', 10);
    const isPostingTeam = this.isPostingTeam(event.teamRef1);

    // All goals and penalty goals are top-tier
    if (event.type === 'goal' || event.type === 'penalty goal') {
      let importance = 100;
      if (isPostingTeam) importance += 10;
      return { category: 'goal', importance };
    }

    // Woodwork is a big chance
    if (event.type === 'post') {
      let importance = 80;
      if (!this.config.includeOpponentBigChances && !isPostingTeam) {
        importance = 0;
      } else if (isPostingTeam) {
        importance += 5;
      }
      return { category: 'big_chance', importance };
    }

    // Discipline
    if (event.type === 'red card' || event.type === 'yellow card') {
      if (!this.config.includeCards) {
        return { category: 'card', importance: 0 };
      }

      if (event.type === 'red card') {
        // Always important
        return { category: 'card', importance: 85 };
      }

      // Yellow cards: only early ones by default
      if (minute >= this.config.cardMinuteCutoff) {
        return { category: 'card', importance: 0 };
      }

      let importance = 45;
      if (isPostingTeam) importance += 5;
      return { category: 'card', importance };
    }

    // Everything else is not highlight-worthy by default
    return { category: 'other', importance: 0 };
  }

  /**
   * Detect if the match contains any second-half events (for placing half-time page).
   */
  private hasSecondHalf(): boolean {
    return this.events.some(e => e.period === '2' || parseInt(e.minute || '0', 10) > 45);
  }

  /**
   * Find the penalty-won and penalty-lost events that belong to a given penalty goal.
   */
  private getPenaltyContext(goalEvent: MatchEvent): { won?: MatchEvent; lost?: MatchEvent } {
    const minute = parseInt(goalEvent.minute || '0', 10);
    const period = goalEvent.period;

    const related = this.events.filter(e => {
      if (!e.type) return false;
      if (e.period !== period) return false;
      const m = parseInt(e.minute || '0', 10);
      // Same minute or immediately preceding minute to capture the foul
      const closeInTime = m === minute || m === minute - 1;
      const isPenaltyContext = e.type === 'penalty won' || e.type === 'penalty lost';
      return closeInTime && isPenaltyContext;
    });

    const won = related.find(e => e.type === 'penalty won');
    const lost = related.find(e => e.type === 'penalty lost');

    return { won, lost };
  }
}