import { parse } from 'yaml';
import pagesSource from '../data/pages.yaml?raw';
import teamSource from '../data/team.yaml?raw';

export interface NavItem {
  label: string;
  href: string;
}

export interface TeamMember {
  group: 'officers' | 'technical' | 'advisory';
  order: number;
  name: string;
  title: string;
  photo: string;
  bio: string;
}

export interface PageData {
  site: {
    name: string;
    defaultTitle: string;
    copyright: string;
    nav: NavItem[];
    contactModal: {
      heading: string;
      intro: string;
      fields: string[];
      submit: string;
    };
  };
  home: {
    heroVideo: string;
    heroLogo: string;
    heading: string;
    heroButtons: { label: string; href: string }[];
    body: string[];
    bodyButtons: { label: string; href: string }[];
  };
  team: {
    title: string;
    heading: string;
    groups: Record<TeamMember['group'], string>;
  };
  technology: {
    title: string;
    heading: string;
    subheading: string;
    tagline: string;
    intro: string[];
    howItWorks: {
      heading: string;
      steps: { label: string; text: string }[];
      outro: string;
    };
    sections: { heading: string; body: string[] }[];
  };
  news: {
    title: string;
    heading: string;
    featuredHeading: string;
    pressReleaseLabel: string;
  };
  contact: {
    title: string;
    heading: string;
    subheading: string;
    body: string[];
    formHeading: string;
  };
}

export function bioParagraphs(bio: string): string[] {
  return bio
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
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
