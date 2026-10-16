import { parse } from 'yaml';
import pagesSource from '../data/pages.yaml?raw';
import teamSource from '../data/team.yaml?raw';
import coverageSource from '../data/coverage.yaml?raw';
import mediaSource from '../data/media.yaml?raw';

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

export interface CoverageItem {
  outlet: string;
  logo?: string;
  title: string;
  date: string | Date;
  url: string;
}

export interface MediaItem {
  type: 'video' | 'podcast';
  title: string;
  show: string;
  date: string | Date;
  url: string;
  image?: string;
  youtubeId?: string;
}

function loadYamlList<T>(source: string): T[] {
  const data = parse(source);
  return Array.isArray(data) ? (data as T[]) : [];
}

export function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function byNewest<T extends { date: string | Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => toDate(b.date).valueOf() - toDate(a.date).valueOf());
}

export function loadCoverage(): CoverageItem[] {
  return byNewest(loadYamlList<CoverageItem>(coverageSource));
}

export function loadMedia(): MediaItem[] {
  return byNewest(loadYamlList<MediaItem>(mediaSource));
}

export function mediaImage(item: MediaItem): string | undefined {
  if (item.image) return item.image;
  if (item.youtubeId) return `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`;
  return undefined;
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
