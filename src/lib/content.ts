import { parse } from 'yaml';
import pagesSource from '../data/pages.yaml?raw';
import teamSource from '../data/team.yaml?raw';

export interface NavItem {
  label: string;
  href: string;
  section: string;
}

export interface TeamMember {
  group: 'officers' | 'technical' | 'advisory';
  order: number;
  name: string;
  title: string;
  photo: string;
  bio: string[];
}

export interface TechSection {
  heading: string;
  subheading?: string;
  paragraphs: string[];
  steps: { label: string; body: string }[];
}

export interface PageData {
  site: {
    name: string;
    tagline: string;
    footer: string;
    formIntro: string;
    nav: NavItem[];
  };
  home: {
    title: string;
    heroLines: string[];
    paragraphs: string[];
    actions: { label: string; href: string }[];
  };
  technology: {
    title: string;
    sections: TechSection[];
  };
  newsPage: {
    title: string;
    featuredHeading: string;
  };
  contact: {
    title: string;
    heading: string;
    paragraphs: string[];
  };
  teamPage: {
    title: string;
    groups: { id: TeamMember['group']; heading: string }[];
  };
}

export function loadPages(): PageData {
  return parse(pagesSource) as PageData;
}

export function loadTeam(): TeamMember[] {
  return parse(teamSource) as TeamMember[];
}

export function subtitlesOf(data: { subtitle?: string; subtitles?: string[] }): string[] {
  if (data.subtitles?.length) return data.subtitles;
  if (data.subtitle) return [data.subtitle];
  return [];
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
