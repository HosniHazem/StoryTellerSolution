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
  StoryPage
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

  constructor(eventsPath: string, assetsPath: string) {
    this.eventsData = JSON.parse(readFileSync(eventsPath, 'utf-8')) as EventsData;
    this.assetsPath = assetsPath;
    this.events = this.eventsData.messages[0].message;
    this.matchInfo = this.eventsData.matchInfo;
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

    // 1. Cover page
    pages.push(this.buildCoverPage());

    // 2. Highlight pages for key events
    pages.push(...this.buildHighlightPages());

    // 3. Final summary page
    pages.push(this.buildSummaryPage());

    return pages;
  }

  /**
   * Create cover page with match info
   */
  private buildCoverPage(): CoverPage {
    const homeTeam = this.matchInfo.contestant[0].name;
    const awayTeam = this.matchInfo.contestant[1].name;
    const goals = this.events.filter(e => e.type === 'goal' || e.type === 'penalty goal');
    const homeGoals = goals.filter(g => g.teamRef1 === this.matchInfo.contestant[0].id).length;
    const awayGoals = goals.filter(g => g.teamRef1 === this.matchInfo.contestant[1].id).length;

    return {
      type: 'cover',
      headline: `${homeTeam} ${homeGoals}-${awayGoals} ${awayTeam}`,
      subheadline: `${this.matchInfo.competition.knownName} • ${this.formatDate(this.matchInfo.date)}`,
      image: this.getAssetPath('21521989.jpg') // Use first available image
    };
  }

  /**
   * Create highlight pages for goals, cards, and key moments
   */
  private buildHighlightPages(): HighlightPage[] {
    const highlights: HighlightPage[] = [];
    
    // Extract key events
    const goals = this.events.filter(e => e.type === 'goal');
    const penaltyGoals = this.events.filter(e => e.type === 'penalty goal');
    const yellowCards = this.events.filter(e => e.type === 'yellow card');
    const redCards = this.events.filter(e => e.type === 'red card');

    // Add goals as highlights
    [...goals, ...penaltyGoals].forEach((goal, index) => {
      const teamName = this.getTeamName(goal.teamRef1);
      const minute = parseInt(goal.minute);
      const isPenalty = goal.type === 'penalty goal';
      
      highlights.push({
        type: 'highlight',
        minute: minute,
        headline: isPenalty ? '⚽ Penalty Goal!' : '⚽ GOAL!',
        caption: `${teamName} scores${isPenalty ? ' from the penalty spot' : ''}`,
        image: this.getImageForEvent(goal, index),
        explanation: this.cleanComment(goal.comment)
      });
    });

    // Add significant cards
    [...yellowCards, ...redCards].forEach((card, index) => {
      const teamName = this.getTeamName(card.teamRef1);
      const minute = parseInt(card.minute);
      const isRed = card.type === 'red card';
      
      // Only include red cards and early yellow cards to keep story focused
      if (isRed || minute < 30) {
        highlights.push({
          type: 'highlight',
          minute: minute,
          headline: isRed ? '🟥 Red Card!' : '🟨 Yellow Card',
          caption: `${teamName} player booked`,
          image: this.getImageForEvent(card, index + goals.length),
          explanation: this.cleanComment(card.comment)
        });
      }
    });

    // Sort by minute
    return highlights.sort((a, b) => a.minute - b.minute);
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

    const winner = homeGoals > awayGoals ? homeTeam : 
                   awayGoals > homeGoals ? awayTeam : 
                   'Draw';

    let body = `Full Time: ${homeTeam} ${homeGoals}-${awayGoals} ${awayTeam}\n\n`;
    body += `Venue: ${this.matchInfo.venue.longName}\n`;
    body += `Competition: ${this.matchInfo.competition.knownName}\n\n`;
    
    if (winner !== 'Draw') {
      body += `${winner} takes all three points with a dominant performance.`;
    } else {
      body += `Both teams share the points in an evenly contested match.`;
    }

    return {
      type: 'info',
      headline: winner !== 'Draw' ? `${winner} Wins! 🏆` : 'Match Drawn',
      body: body
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
   * Helper: Map events to available images
   */
  private getImageForEvent(event: MatchEvent, index: number): string {
    // Available images based on assets folder
    const images = [
      '21521989.jpg', '21521990.jpg', '21522003.jpg', '21522014.jpg',
      '21522057.jpg', '21522058.jpg', '21522071.jpg', '21522140.jpg',
      '21522328.jpg', '21522345.jpg', '21522412.jpg', '21522413.jpg',
      '21522414.jpg', '21522436.jpg', '21522449.jpg', '21522450.jpg'
    ];
    
    // Cycle through available images
    const imageIndex = index % images.length;
    return this.getAssetPath(images[imageIndex]);
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
}
