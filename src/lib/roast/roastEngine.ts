import { AnalysisResult } from '../parser/dataTypes';

export interface VibeComment {
  title: string;
  badge: string;
  description: string;
  type: 'positive' | 'playful' | 'energetic';
}

export function generateVibeReport(results: AnalysisResult, t: (key: string, variables?: Record<string, string | number>) => string): VibeComment[] {
  const vibes: VibeComment[] = [];

  // Vibe 1: Time Cell
  const hours = results.timeCell.hours;
  if (hours > 100) {
    vibes.push({
      title: t('vibe.1.title.connoisseur'),
      badge: t('vibe.1.badge.connoisseur'),
      description: t('vibe.1.desc.connoisseur', { hours }),
      type: 'positive'
    });
  } else {
    vibes.push({
      title: t('vibe.1.title.mindful'),
      badge: t('vibe.1.badge.mindful'),
      description: t('vibe.1.desc.mindful', { hours }),
      type: 'positive'
    });
  }

  // Vibe 2: Algorithm Hypnosis
  const hypTime = results.algorithmHypnosis.durationMinutes;
  if (hypTime > 45) {
    vibes.push({
      title: t('vibe.2.title.focus'),
      badge: t('vibe.2.badge.focus'),
      description: t('vibe.2.desc.focus', { minutes: hypTime }),
      type: 'energetic'
    });
  } else {
    vibes.push({
      title: t('vibe.2.title.quick'),
      badge: t('vibe.2.badge.quick'),
      description: t('vibe.2.desc.quick'),
      type: 'positive'
    });
  }

  // Vibe 3: Simp Evidence
  if (results.simpEvidence) {
    vibes.push({
      title: t('vibe.3.title.simp'),
      badge: t('vibe.3.badge.simp'),
      description: t('vibe.3.desc.simp', { comment: results.simpEvidence.comment }),
      type: 'positive'
    });
  } else {
    vibes.push({
      title: t('vibe.3.title.observer'),
      badge: t('vibe.3.badge.observer'),
      description: t('vibe.3.desc.observer'),
      type: 'playful'
    });
  }

  // Vibe 4: Employment Index (Work scroll)
  const workPercent = results.employmentIndex;
  if (workPercent > 40) {
    vibes.push({
      title: t('vibe.4.title.multitasker'),
      badge: t('vibe.4.badge.multitasker'),
      description: t('vibe.4.desc.multitasker', { percentage: workPercent }),
      type: 'playful'
    });
  } else {
    vibes.push({
      title: t('vibe.4.title.focused'),
      badge: t('vibe.4.badge.focused'),
      description: t('vibe.4.desc.focused', { percentage: workPercent }),
      type: 'positive'
    });
  }

  // Vibe 5: Goldfish Syndrome
  const goldfish = results.goldfishSyndromePercentage;
  if (goldfish > 50) {
    vibes.push({
      title: t('vibe.5.title.speed'),
      badge: t('vibe.5.badge.speed'),
      description: t('vibe.5.desc.speed', { percentage: goldfish }),
      type: 'energetic'
    });
  } else {
    vibes.push({
      title: t('vibe.5.title.watcher'),
      badge: t('vibe.5.badge.watcher'),
      description: t('vibe.5.desc.watcher'),
      type: 'positive'
    });
  }

  // Vibe 6: Stalk Target / Worshipped Creator
  if (results.worshippedCreator) {
    vibes.push({
      title: t('vibe.6.title.fan', { creator: results.worshippedCreator }),
      badge: t('vibe.6.badge.fan'),
      description: t('vibe.6.desc.fan', { creator: results.worshippedCreator }),
      type: 'positive'
    });
  }

  // Vibe 7: Insomnia
  if (results.insomniaHours > 10) {
    vibes.push({
      title: t('vibe.7.title.insomniac'),
      badge: t('vibe.7.badge.insomniac'),
      description: t('vibe.7.desc.insomniac', { hours: results.insomniaHours }),
      type: 'playful'
    });
  }

  return vibes;
}

