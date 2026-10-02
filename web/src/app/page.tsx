'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useChat } from 'ai/react';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: { query?: string; demographic?: string; hazardCategory?: string };
  state: 'call' | 'result';
  result?: {
    found?: boolean;
    groundedAt?: string;
    query?: string;
    demographic?: string;
    evidence?: unknown;
    status?: string;
    error?: string;
  };
}

type Severity = 'critical' | 'restricted' | 'safe';
type MediaType = 'movie' | 'series';
type Genre = 'all' | 'series' | 'movies' | 'horror' | 'scifi' | 'thriller' | 'war' | 'drama' | 'family';

interface AuditedMedia {
  title: string;
  year: number;
  type: MediaType;
  rating: 'U' | 'UA 7+' | 'UA 13+' | 'UA 16+' | 'A';
  hazardTag: string;
  severity: Severity;
  genre: Genre;
  prompt: string;
  posterUrl?: string;
}

// ─────────────────────────────────────────────
// MASTER AUDITED CATALOG (42 Titles with Posters)
// ─────────────────────────────────────────────
const AUDITED_CATALOG: AuditedMedia[] = [
  // ── TV SERIES ──────────────────────────────
  { title: 'Stranger Things', year: 2016, type: 'series', rating: 'UA 16+', hazardTag: 'Rapid Strobe & Trauma', severity: 'critical', genre: 'series', prompt: 'Is Stranger Things safe for a teenager with photosensitive epilepsy or trauma triggers?', posterUrl: 'https://image.tmdb.org/t/p/w200/49WJfeN0moxb9IPfGn8AIqMGskD.jpg' },
  { title: 'The Last of Us', year: 2023, type: 'series', rating: 'A', hazardTag: 'Acoustic Shock & Gore', severity: 'critical', genre: 'series', prompt: 'Check The Last of Us for sudden acoustic clicker spikes and visceral trauma compliance.', posterUrl: 'https://image.tmdb.org/t/p/w200/uKvVjK19yM79GqL9qG6v9pC3yG.jpg' },
  { title: 'Euphoria', year: 2019, type: 'series', rating: 'A', hazardTag: 'Substance Abuse & Panic', severity: 'critical', genre: 'series', prompt: 'Is Euphoria legally or clinically safe for a 15-year-old or recovering substance patient?', posterUrl: 'https://image.tmdb.org/t/p/w200/3Q0hd3heuWw6AcqXZAcIOx7ff2A.jpg' },
  { title: 'Black Mirror', year: 2011, type: 'series', rating: 'A', hazardTag: 'Cognitive Disorientation', severity: 'critical', genre: 'series', prompt: 'Audit Black Mirror for acute psychological dissociation and digital strobe triggers.', posterUrl: 'https://image.tmdb.org/t/p/w200/7RumFHk4k74tKjZ816q8lU3r6P8.jpg' },
  { title: 'Breaking Bad', year: 2008, type: 'series', rating: 'A', hazardTag: 'Substance Crisis & Violence', severity: 'restricted', genre: 'series', prompt: 'What are the statutory CBFC restrictions and chemical substance warnings for Breaking Bad?', posterUrl: 'https://image.tmdb.org/t/p/w200/ggFHVNu6YYI5L9pCfOacjizRGt.jpg' },
  { title: 'Squid Game', year: 2021, type: 'series', rating: 'A', hazardTag: 'Extreme Graphic Violence', severity: 'critical', genre: 'series', prompt: 'Is Squid Game safe for teens? Check for extreme violence, trauma, and A-rated compliance.', posterUrl: 'https://image.tmdb.org/t/p/w200/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg' },
  { title: 'The Boys', year: 2019, type: 'series', rating: 'A', hazardTag: 'Gore & Psychological Torment', severity: 'critical', genre: 'series', prompt: 'Audit The Boys for extreme gore, psychological abuse triggers, and age compliance.', posterUrl: 'https://image.tmdb.org/t/p/w200/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg' },
  { title: 'Chernobyl', year: 2019, type: 'series', rating: 'UA 16+', hazardTag: 'Radiation Trauma & PTSD', severity: 'restricted', genre: 'series', prompt: 'Check Chernobyl for radiation body horror triggers and PTSD compliance for sensitive viewers.', posterUrl: 'https://image.tmdb.org/t/p/w200/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg' },
  { title: 'Peaky Blinders', year: 2013, type: 'series', rating: 'UA 16+', hazardTag: 'Violence & Substance Use', severity: 'restricted', genre: 'series', prompt: 'Audit Peaky Blinders for violence, substance abuse triggers, and statutory UA 16+ compliance.', posterUrl: 'https://image.tmdb.org/t/p/w200/vUUqzWa2LnHIVqkaKVlVGkVcZIW.jpg' },
  { title: 'Game of Thrones', year: 2011, type: 'series', rating: 'A', hazardTag: 'Sexual Violence & Gore', severity: 'critical', genre: 'series', prompt: 'Is Game of Thrones compliant for viewers under 18? Check sexual violence and gore against CBFC.', posterUrl: 'https://image.tmdb.org/t/p/w200/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg' },

  // ── HORROR ─────────────────────────────────
  { title: 'Hereditary', year: 2018, type: 'movie', rating: 'A', hazardTag: 'Occult Horror & Decapitation', severity: 'critical', genre: 'horror', prompt: 'Check Hereditary for severe panic triggers, graphic bodily trauma, and adult compliance.', posterUrl: 'https://image.tmdb.org/t/p/w200/p9fmuz2Oj3Ie3qQ2r6u0B9eM7qO.jpg' },
  { title: 'The Descent', year: 2005, type: 'movie', rating: 'A', hazardTag: 'Subterranean Claustrophobia', severity: 'restricted', genre: 'horror', prompt: 'Is The Descent safe for an individual suffering from acute claustrophobia or panic disorder?', posterUrl: 'https://image.tmdb.org/t/p/w200/pQkI6j4jHq1yMv4J0m3O4eZ9E1G.jpg' },
  { title: 'Midsommar', year: 2019, type: 'movie', rating: 'A', hazardTag: 'Cult Trauma & Grief Horror', severity: 'critical', genre: 'horror', prompt: 'Audit Midsommar for grief trauma, psychological torment, and compliance for PTSD sufferers.', posterUrl: 'https://image.tmdb.org/t/p/w200/7LEI8ulraiBvLIFGgfjNq6KfM98.jpg' },
  { title: 'Get Out', year: 2017, type: 'movie', rating: 'UA 16+', hazardTag: 'Hypnotic Strobe & Entrapment', severity: 'critical', genre: 'horror', prompt: 'Check Get Out for hypnotic strobe sequences and psychological entrapment trauma.', posterUrl: 'https://image.tmdb.org/t/p/w200/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg' },
  { title: 'Us', year: 2019, type: 'movie', rating: 'UA 16+', hazardTag: 'Doppelganger Trauma & Peril', severity: 'restricted', genre: 'horror', prompt: 'Is Us (2019) safe for someone with severe anxiety disorder or phobia? Check CBFC compliance.', posterUrl: 'https://image.tmdb.org/t/p/w200/ux2dU1jQ2ACIMShzB3y9Vm98umF.jpg' },
  { title: 'It', year: 2017, type: 'movie', rating: 'A', hazardTag: 'Phobia Triggers & Body Trauma', severity: 'critical', genre: 'horror', prompt: 'Audit It (2017) for phobia triggers, childhood trauma content, and minor access compliance.', posterUrl: 'https://image.tmdb.org/t/p/w200/9E2STPl82Yv9JL31Tuj4GG0q6a3.jpg' },
  { title: 'Talk to Me', year: 2023, type: 'movie', rating: 'A', hazardTag: 'Demonic Possession & Gore', severity: 'critical', genre: 'horror', prompt: 'Check Talk to Me for self-harm content, demonic possession triggers, and A-rating compliance.', posterUrl: 'https://image.tmdb.org/t/p/w200/kdPMUMJzyYAc4roD52qavX0nUQ3.jpg' },

  // ── SCI-FI ─────────────────────────────────
  { title: 'Inception', year: 2010, type: 'movie', rating: 'UA 13+', hazardTag: 'Strobe (34m Dream Collapse)', severity: 'critical', genre: 'scifi', prompt: 'Is Inception safe to watch for someone diagnosed with photosensitive epilepsy?', posterUrl: 'https://image.tmdb.org/t/p/w200/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg' },
  { title: 'Blade Runner 2049', year: 2017, type: 'movie', rating: 'A', hazardTag: 'Neon High-Frequency Strobe', severity: 'critical', genre: 'scifi', prompt: 'Audit Blade Runner 2049 for photosensitivity seizure risks and adult statutory rating.', posterUrl: 'https://image.tmdb.org/t/p/w200/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg' },
  { title: 'Interstellar', year: 2014, type: 'movie', rating: 'UA 13+', hazardTag: 'Gravitational Acoustic Surge', severity: 'restricted', genre: 'scifi', prompt: 'Check Interstellar for acoustic organ surges, gravitational vertigo, and CBFC compliance.', posterUrl: 'https://image.tmdb.org/t/p/w200/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg' },
  { title: 'Oppenheimer', year: 2023, type: 'movie', rating: 'A', hazardTag: 'Trinity Shockwave (>118 dB)', severity: 'critical', genre: 'scifi', prompt: 'Check Oppenheimer for sudden high-decibel auditory hazards or blast triggers.', posterUrl: 'https://image.tmdb.org/t/p/w200/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg' },
  { title: 'Ex Machina', year: 2015, type: 'movie', rating: 'UA 16+', hazardTag: 'Psychological Manipulation', severity: 'restricted', genre: 'scifi', prompt: 'Audit Ex Machina for psychological manipulation and adult statutory rating compliance.', posterUrl: 'https://image.tmdb.org/t/p/w200/90BCQ5jV8P5F7j41z6lCgK59C3o.jpg' },
  { title: 'Annihilation', year: 2018, type: 'movie', rating: 'UA 16+', hazardTag: 'Visceral Body Horror & Strobe', severity: 'critical', genre: 'scifi', prompt: 'Check Annihilation for body horror, strobe sequences, and psychological trauma warnings.', posterUrl: 'https://image.tmdb.org/t/p/w200/d3qcpfNwbAM9zttjz2Ywh6kY1nB.jpg' },
  { title: 'Dune: Part Two', year: 2024, type: 'movie', rating: 'UA 13+', hazardTag: 'Acoustic Surge & Combat', severity: 'restricted', genre: 'scifi', prompt: 'Is Dune: Part Two safe for someone with auditory hypersensitivity or PTSD?', posterUrl: 'https://image.tmdb.org/t/p/w200/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg' },
  { title: 'Everything Everywhere All at Once', year: 2022, type: 'movie', rating: 'UA 16+', hazardTag: 'Visual Glitch & Rapid Cuts', severity: 'restricted', genre: 'scifi', prompt: 'Audit Everything Everywhere All at Once for rapid visual glitching, sensory overload, and strobe compliance.', posterUrl: 'https://image.tmdb.org/t/p/w200/w3LxiVYPqrlexP02LOVupStJuRJ.jpg' },

  // ── THRILLER ───────────────────────────────
  { title: 'The Dark Knight', year: 2008, type: 'movie', rating: 'UA 13+', hazardTag: 'Tactical Combat Violence', severity: 'restricted', genre: 'thriller', prompt: 'Can a 10-year-old legally watch The Dark Knight according to CBFC rating guidelines?', posterUrl: 'https://image.tmdb.org/t/p/w200/qJ2tW6WMUDux911r6m7haRef0WH.jpg' },
  { title: 'John Wick: Chapter 4', year: 2023, type: 'movie', rating: 'A', hazardTag: 'Lethal Ballistic Trauma (140+)', severity: 'critical', genre: 'thriller', prompt: 'Is John Wick: Chapter 4 suitable for minors or PTSD survivors under Class A certification?', posterUrl: 'https://image.tmdb.org/t/p/w200/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg' },
  { title: 'A Quiet Place', year: 2018, type: 'movie', rating: 'UA 13+', hazardTag: 'Extreme Dynamic Audio Swings', severity: 'restricted', genre: 'thriller', prompt: 'Check A Quiet Place for violent dynamic sound spikes and auditory sensory distress.', posterUrl: 'https://image.tmdb.org/t/p/w200/nAU74GmpUk7t5iklEp3bufwDq4n.jpg' },
  { title: 'Fall', year: 2022, type: 'movie', rating: 'UA 13+', hazardTag: '2,000ft Tower Acrophobia', severity: 'restricted', genre: 'thriller', prompt: 'Check Fall for severe height vertigo, acrophobia triggers, and vestibular distress.', posterUrl: 'https://image.tmdb.org/t/p/w200/v28T5F1gO7GBvBhQJND7TCppvdp.jpg' },
  { title: 'Top Gun: Maverick', year: 2022, type: 'movie', rating: 'UA 13+', hazardTag: 'Acoustic Sonic Boom & G-Force', severity: 'restricted', genre: 'thriller', prompt: 'Audit Top Gun: Maverick for sonic boom triggers, combat PTSD, and UA 13+ compliance.', posterUrl: 'https://image.tmdb.org/t/p/w200/62HCnUTziyWcpDaBO2i1DX17ljH.jpg' },
  { title: 'Mission: Impossible Dead Reckoning', year: 2023, type: 'movie', rating: 'UA 13+', hazardTag: 'High-Impact Stunt Trauma', severity: 'restricted', genre: 'thriller', prompt: 'Check Mission: Impossible Dead Reckoning for acrophobia, acoustic triggers, and age compliance.', posterUrl: 'https://image.tmdb.org/t/p/w200/NNxYkU70HPurnNCSiCjYAmacwm.jpg' },

  // ── WAR ────────────────────────────────────
  { title: 'Dunkirk', year: 2017, type: 'movie', rating: 'UA 13+', hazardTag: 'Stuka Siren Battlefield Stress', severity: 'restricted', genre: 'war', prompt: 'Audit Dunkirk for sustained acoustic siren panic and combat veteran PTSD advisories.', posterUrl: 'https://image.tmdb.org/t/p/w200/ebSnODDg9lbsMIaWg2uAbjn7TO5.jpg' },
  { title: '1917', year: 2019, type: 'movie', rating: 'UA 16+', hazardTag: 'Continuous Combat Trauma', severity: 'restricted', genre: 'war', prompt: 'Is 1917 safe for combat veterans with PTSD? Audit for sustained battlefield trauma triggers.', posterUrl: 'https://image.tmdb.org/t/p/w200/iZf0KyrE25z1sage4SYFLCCrMi9.jpg' },
  { title: 'Saving Private Ryan', year: 1998, type: 'movie', rating: 'A', hazardTag: 'D-Day Graphic Mutilation', severity: 'critical', genre: 'war', prompt: 'Check Saving Private Ryan for graphic war gore, acoustic shell shock, and adult compliance.', posterUrl: 'https://image.tmdb.org/t/p/w200/uqx37cS8cpHg8x35f9U5IBlrE65.jpg' },
  { title: 'Hacksaw Ridge', year: 2016, type: 'movie', rating: 'A', hazardTag: 'Visceral Battlefield Trauma', severity: 'critical', genre: 'war', prompt: 'Audit Hacksaw Ridge for visceral injury depiction, PTSD triggers, and CBFC adult rating.', posterUrl: 'https://image.tmdb.org/t/p/w200/wWMr4h3F2h9fG22Z7M9iJ4q6z0b.jpg' },

  // ── DRAMA ──────────────────────────────────
  { title: 'Joker', year: 2019, type: 'movie', rating: 'A', hazardTag: 'Psychosis & Severe Violence', severity: 'critical', genre: 'drama', prompt: 'Is Joker (2019) safe for someone with anxiety disorder or mental illness history?', posterUrl: 'https://image.tmdb.org/t/p/w200/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg' },
  { title: 'Black Swan', year: 2010, type: 'movie', rating: 'A', hazardTag: 'Psychological Torment & Self-Harm', severity: 'critical', genre: 'drama', prompt: 'Check Black Swan for psychosis depiction, self-harm, and adult statutory compliance.', posterUrl: 'https://image.tmdb.org/t/p/w200/bCpI7iYn7Y158QZkZ7z9eK9fP1u.jpg' },
  { title: 'Requiem for a Dream', year: 2000, type: 'movie', rating: 'A', hazardTag: 'Acute Narcotic Overdose & Strobe', severity: 'critical', genre: 'drama', prompt: 'Audit Requiem for a Dream for extreme addiction trauma, strobe sequences, and CBFC compliance.', posterUrl: 'https://image.tmdb.org/t/p/w200/nOd6vjEmzCT0k4VYvdBt27HG5KB.jpg' },

  // ── FAMILY & SAFE ──────────────────────────
  { title: 'Incredibles 2', year: 2018, type: 'movie', rating: 'U', hazardTag: 'Screenslaver 6Hz Strobe Flashing', severity: 'critical', genre: 'family', prompt: 'Did Incredibles 2 trigger medical warnings for Screenslaver strobe flashing?', posterUrl: 'https://image.tmdb.org/t/p/w200/9lFKBtaVIhP7E2Pk0IY1CwTKTMZ.jpg' },
  { title: 'Spider-Man: Into the Spider-Verse', year: 2018, type: 'movie', rating: 'U', hazardTag: 'Chromatic Glitch & Cycling', severity: 'restricted', genre: 'family', prompt: 'Can someone with visual migraine sensitivity safely watch Spider-Man: Into the Spider-Verse?', posterUrl: 'https://image.tmdb.org/t/p/w200/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg' },
  { title: 'Inside Out', year: 2015, type: 'movie', rating: 'U', hazardTag: 'Certified Unrestricted Baseline', severity: 'safe', genre: 'family', prompt: 'Is Inside Out safe for an unsupervised 6-year-old child under CBFC certification?', posterUrl: 'https://image.tmdb.org/t/p/w200/2H1TmgdfNbfMADCm11hGj1l2U46.jpg' },
  { title: 'Coco', year: 2017, type: 'movie', rating: 'U', hazardTag: 'Family Approved Baseline', severity: 'safe', genre: 'family', prompt: 'Verify Coco compliance for family viewing, including children with grief sensitivity.', posterUrl: 'https://image.tmdb.org/t/p/w200/gGEqqioMGnUVTZq5FsY3TKunRi.jpg' },
  { title: 'Encanto', year: 2021, type: 'movie', rating: 'U', hazardTag: 'Certified Unrestricted Baseline', severity: 'safe', genre: 'family', prompt: 'Is Encanto fully certified safe for all ages including sensory-sensitive children?', posterUrl: 'https://image.tmdb.org/t/p/w200/4j0PNHkMr5ax3AsUsRJ2xs63qam.jpg' },
  { title: 'Up', year: 2009, type: 'movie', rating: 'U', hazardTag: 'Mild Peril Only', severity: 'safe', genre: 'family', prompt: 'Check Up (2009) for pediatric safety and grief sensitivity compliance.', posterUrl: 'https://image.tmdb.org/t/p/w200/vpbaStTMt8qqgE27dwxY9VOZwzs.jpg' },
  { title: 'Moana', year: 2016, type: 'movie', rating: 'U', hazardTag: 'Certified Unrestricted Baseline', severity: 'safe', genre: 'family', prompt: 'Verify Moana for pediatric and family compliance under CBFC guidelines.', posterUrl: 'https://image.tmdb.org/t/p/w200/45Y1GYSbtqBhlQGQ5o6RdYOGv3k.jpg' },
  { title: 'Finding Nemo', year: 2003, type: 'movie', rating: 'U', hazardTag: 'Mild Peril Only', severity: 'safe', genre: 'family', prompt: 'Check Finding Nemo for pediatric safety and sensory overload compliance.', posterUrl: 'https://image.tmdb.org/t/p/w200/eHuGQ10FUzK1mdOY692F5GLGqVh.jpg' },
  { title: 'Paddington 2', year: 2017, type: 'movie', rating: 'U', hazardTag: 'Certified Unrestricted Baseline', severity: 'safe', genre: 'family', prompt: 'Verify Paddington 2 compliance for family viewing with zero medical triggers.', posterUrl: 'https://image.tmdb.org/t/p/w200/gO9v9k5dFk3m4v4vGk7rX7V6z1b.jpg' },
  { title: 'Barbie', year: 2023, type: 'movie', rating: 'UA 13+', hazardTag: 'Non-Hazardous Content', severity: 'safe', genre: 'family', prompt: 'Can children watch Barbie without parental accompaniment under CBFC guidelines?', posterUrl: 'https://image.tmdb.org/t/p/w200/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg' },
];

// ─────────────────────────────────────────────
// GENRE FILTER CONFIGURATION (Emoji-Free)
// ─────────────────────────────────────────────
const GENRE_NAV = [
  { id: 'all', label: 'All' },
  { id: 'series', label: 'Series' },
  { id: 'movies', label: 'Movies' },
  { id: 'thriller', label: 'Thriller' },
  { id: 'scifi', label: 'Sci-Fi' },
  { id: 'horror', label: 'Horror' },
  { id: 'war', label: 'War' },
  { id: 'drama', label: 'Drama' },
  { id: 'family', label: 'Family' },
] as const;

function getInitials(title: string): string {
  const clean = title.replace(/^(The|A|An)\s+/i, '');
  const words = clean.split(/[\s:-]+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 3).toUpperCase();
}

function detectVerdict(content: string): 'prohibited' | 'restricted' | 'safe' | 'unverified' | null {
  const upper = content.toUpperCase();
  if (upper.includes('[PROHIBITED]') || upper.includes('VERDICT: PROHIBITED') || upper.includes('[STRICTLY PROHIBITED]')) return 'prohibited';
  if (upper.includes('[RESTRICTED]') || upper.includes('VERDICT: RESTRICTED') || upper.includes('[CONDITIONAL]')) return 'restricted';
  if (upper.includes('[SAFE]') || upper.includes('VERDICT: SAFE')) return 'safe';
  if (upper.includes('[DATA UNAVAILABLE]') || upper.includes('DATA UNAVAILABLE')) return 'unverified';
  return null;
}

// ─────────────────────────────────────────────
// COMPONENT: POSTER THUMBNAIL (Real Image with Monogram Fallback)
// ─────────────────────────────────────────────
function PosterThumbnail({ item }: { item: AuditedMedia }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = getInitials(item.title);
  const statusColor =
    item.severity === 'critical'
      ? 'bg-rose-500'
      : item.severity === 'restricted'
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  return (
    <div
      className="relative shrink-0 rounded border overflow-hidden select-none"
      style={{
        backgroundColor: 'var(--poster-bg)',
        borderColor: 'var(--poster-border)',
        height: '62px',
        width: '42px',
      }}
    >
      {item.posterUrl && !imageFailed ? (
        <img
          src={item.posterUrl}
          alt={item.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col justify-between p-1">
          <div className="flex items-center justify-between">
            <span
              className="text-[9px] font-mono tracking-tighter font-bold"
              style={{ color: 'var(--poster-text)' }}
            >
              {initials}
            </span>
            <span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
          </div>
          <div className="text-[8px] font-mono text-center tracking-tight opacity-60">
            {item.year}
          </div>
        </div>
      )}
      {/* Subtle bottom indicator hairline */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${statusColor}`} />
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENT: SIDEBAR CATALOG CARD
// ─────────────────────────────────────────────
function CatalogCard({ item, onClick }: { item: AuditedMedia; onClick: () => void }) {
  const isSeries = item.type === 'series';

  return (
    <button
      type="button"
      onClick={onClick}
      className="poster-card w-full text-left p-2.5 rounded-lg border flex items-center gap-3 transition-colors cursor-pointer group"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-hairline)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
        e.currentTarget.style.borderColor = 'var(--border-hairline)';
      }}
    >
      <PosterThumbnail item={item} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <span
            className="text-xs font-semibold truncate group-hover:text-accent transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            {item.title}
          </span>
          <span
            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 border"
            style={{
              backgroundColor: 'var(--badge-bg)',
              color: 'var(--badge-text)',
              borderColor: 'var(--badge-border)',
            }}
          >
            {item.rating}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span>{item.year}</span>
          <span>·</span>
          <span className="uppercase text-[9px] tracking-wider font-medium">
            {isSeries ? 'Episodic' : 'Feature'}
          </span>
        </div>

        <div
          className="text-[10px] truncate mt-1 font-mono tracking-tight"
          style={{ color: 'var(--text-secondary)' }}
        >
          {item.hazardTag}
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────
// COMPONENT: CLEAN VERDICT BANNER
// ─────────────────────────────────────────────
function VerdictBanner({ verdict }: { verdict: ReturnType<typeof detectVerdict> }) {
  if (!verdict) return null;

  const styleMap = {
    prohibited: {
      bg: 'var(--verdict-prohibited-bg)',
      border: 'var(--verdict-prohibited-border)',
      text: 'var(--verdict-prohibited-text)',
      label: 'VERDICT: PROHIBITED',
      detail: 'Critical statutory or clinical hazard violation detected.',
    },
    restricted: {
      bg: 'var(--verdict-restricted-bg)',
      border: 'var(--verdict-restricted-border)',
      text: 'var(--verdict-restricted-text)',
      label: 'VERDICT: RESTRICTED',
      detail: 'Conditional access. Parental guidance or viewer advisory mandatory.',
    },
    safe: {
      bg: 'var(--verdict-safe-bg)',
      border: 'var(--verdict-safe-border)',
      text: 'var(--verdict-safe-text)',
      label: 'VERDICT: CERTIFIED SAFE',
      detail: 'Zero hazardous photic, acoustic, or psychological triggers detected.',
    },
    unverified: {
      bg: 'var(--verdict-unverified-bg)',
      border: 'var(--verdict-unverified-border)',
      text: 'var(--verdict-unverified-text)',
      label: 'VERDICT: DATA UNAVAILABLE',
      detail: 'Title is unverified in Sanity Content Lake. Withholding viewing evaluation.',
    },
  };

  const current = styleMap[verdict];

  return (
    <div
      className="p-3 rounded-lg border mb-3"
      style={{
        backgroundColor: current.bg,
        borderColor: current.border,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-mono font-bold tracking-wider uppercase"
          style={{ color: current.text }}
        >
          {current.label}
        </span>
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
          USHER GATEKEEPER
        </span>
      </div>
      <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-secondary)' }}>
        {current.detail}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENT: SANITY GROUNDING BADGE
// ─────────────────────────────────────────────
function GroundingBadge({
  toolCall,
  msgId,
  idx,
  expandedCitations,
  onToggle,
}: {
  toolCall: ToolInvocation;
  msgId: string;
  idx: number;
  expandedCitations: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const isCompleted = toolCall.state === 'result';
  const found = toolCall.result?.found;
  const key = `${msgId}-${idx}`;
  const isExpanded = !!expandedCitations[key];

  return (
    <div
      className="rounded-lg border text-xs overflow-hidden mb-3"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div
        onClick={() => isCompleted && onToggle(key)}
        className={`flex items-center justify-between px-3 py-2 ${
          isCompleted ? 'cursor-pointer hover:opacity-90' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          {!isCompleted ? (
            <span className="font-mono text-[10px] tracking-wide uppercase text-amber-500">
              Querying Sanity Content Lake...
            </span>
          ) : found ? (
            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span style={{ color: 'var(--text-primary)' }} className="font-semibold">
                Sanity Lake Grounded
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                ({toolCall.args.query?.slice(0, 24)}...)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-rose-500">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span>Unverified in Sanity Records</span>
            </div>
          )}
        </div>

        {isCompleted && (
          <button
            type="button"
            className="text-[10px] font-mono underline opacity-70 hover:opacity-100"
            style={{ color: 'var(--text-secondary)' }}
          >
            {isExpanded ? 'Collapse Trace' : 'View Trace'}
          </button>
        )}
      </div>

      {isCompleted && isExpanded && (
        <div
          className="border-t p-3 font-mono text-[10px] overflow-x-auto max-h-48 custom-scrollbar"
          style={{
            borderColor: 'var(--border-hairline)',
            backgroundColor: 'var(--bg-base)',
            color: 'var(--text-secondary)',
          }}
        >
          <div className="mb-1 text-[9px] opacity-60">
            TIMESTAMP: {toolCall.result?.groundedAt || 'N/A'}
          </div>
          <pre className="whitespace-pre-wrap">{JSON.stringify(toolCall.result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENT: CLEAN MARKDOWN RENDERER
// ─────────────────────────────────────────────
function renderCleanMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push(<div key={key++} className="h-1" />);
      continue;
    }

    if (trimmed.startsWith('### ')) {
      const heading = trimmed.replace('### ', '');
      result.push(
        <div
          key={key++}
          className="text-xs font-mono font-bold tracking-wider uppercase mt-3 mb-1 pb-0.5 border-b"
          style={{
            color: 'var(--text-primary)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          {heading}
        </div>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.slice(2);
      const colonIdx = content.indexOf(':');

      if (colonIdx > 0 && colonIdx < 30) {
        const label = content.slice(0, colonIdx).replace(/\*\*/g, '').trim();
        const value = content.slice(colonIdx + 1).trim();
        result.push(
          <div key={key++} className="flex gap-2 text-[12px] leading-relaxed mb-1">
            <span
              className="font-mono text-[11px] font-semibold shrink-0 uppercase tracking-tight"
              style={{ color: 'var(--text-secondary)' }}
            >
              {label}:
            </span>
            <span style={{ color: 'var(--text-primary)' }}>{value}</span>
          </div>
        );
      } else {
        result.push(
          <div key={key++} className="flex gap-2 text-[12px] leading-relaxed mb-0.5">
            <span style={{ color: 'var(--text-muted)' }}>—</span>
            <span style={{ color: 'var(--text-primary)' }}>{content.replace(/\*\*/g, '')}</span>
          </div>
        );
      }
    } else {
      result.push(
        <p key={key++} className="text-[12px] leading-relaxed mb-1" style={{ color: 'var(--text-primary)' }}>
          {trimmed.replace(/\*\*/g, '')}
        </p>
      );
    }
  }

  return result;
}

// ─────────────────────────────────────────────
// MAIN USHER APPLICATION
// ─────────────────────────────────────────────
export default function UsherPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<Genre>('all');
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});

  const { messages, input, handleInputChange, handleSubmit, setInput, isLoading, error, reload } =
    useChat({ api: '/api/chat' });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const toggleCitation = useCallback((id: string) => {
    setExpandedCitations((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleSelectTitle = useCallback(
    (item: AuditedMedia) => {
      setInput(item.prompt);
    },
    [setInput]
  );

  const filteredCatalog = useMemo(() => {
    return AUDITED_CATALOG.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.hazardTag.toLowerCase().includes(searchFilter.toLowerCase());

      if (!matchSearch) return false;
      if (activeTab === 'all') return true;
      if (activeTab === 'movies') return item.type === 'movie';
      if (activeTab === 'series') return item.type === 'series';
      return item.genre === activeTab;
    });
  }, [searchFilter, activeTab]);

  return (
    <div
      data-theme={theme}
      className="flex h-screen w-full overflow-hidden"
      style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      {/* ═══════════════════════════════════════════
          SIDEBAR: CATALOG (Poster, Name, Rating, Year, Type)
      ═══════════════════════════════════════════ */}
      <aside
        className={`${
          sidebarOpen ? 'w-80 lg:w-92' : 'w-0'
        } transition-all duration-200 ease-in-out border-r flex flex-col z-40 overflow-hidden shrink-0`}
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
        }}
      >
        {/* Sidebar Header */}
        <div
          className="px-4 py-3 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: 'var(--border-hairline)' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-widest uppercase">
                AUDITED CATALOG
              </span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.2 rounded border"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                {AUDITED_CATALOG.length}
              </span>
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Certified Ground Truth in Sanity Content Lake
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="h-6 w-6 rounded flex items-center justify-center text-xs opacity-60 hover:opacity-100 transition-opacity"
            title="Collapse Sidebar"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="p-3 pb-2 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search title, year, or trigger..."
              className="w-full rounded-md px-3 py-1.5 text-xs focus:outline-none border transition-colors"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs (No Emojis) */}
        <div className="px-3 pb-2 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
            {GENRE_NAV.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'font-bold'
                    : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor:
                    activeTab === tab.id ? 'var(--accent-action)' : 'transparent',
                  color:
                    activeTab === tab.id ? 'var(--accent-action-text)' : 'var(--text-secondary)',
                  borderColor:
                    activeTab === tab.id ? 'var(--border-active)' : 'var(--border-hairline)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5 custom-scrollbar">
          {filteredCatalog.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              No certified records match query.
            </div>
          ) : (
            filteredCatalog.map((item, idx) => (
              <CatalogCard key={idx} item={item} onClick={() => handleSelectTitle(item)} />
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div
          className="px-4 py-2 border-t text-[10px] font-mono flex items-center justify-between shrink-0"
          style={{
            borderColor: 'var(--border-hairline)',
            color: 'var(--text-muted)',
          }}
        >
          <span>SELECT TITLE TO AUDIT</span>
          <span className="uppercase font-semibold">ZERO GUESS</span>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════
          MAIN VIEW
      ═══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Main Header */}
        <header
          className="border-b px-4 py-2.5 sm:px-6 shrink-0 z-30 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="px-2.5 py-1 rounded text-xs font-mono font-medium border transition-colors"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                CATALOG ({AUDITED_CATALOG.length})
              </button>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold tracking-widest uppercase">
                  USHER
                </span>
                <span
                  className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border"
                  style={{
                    backgroundColor: 'var(--badge-bg)',
                    borderColor: 'var(--badge-border)',
                    color: 'var(--badge-text)',
                  }}
                >
                  STATUTORY COMPLIANCE GATEWAY
                </span>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Sanity Content Lake · Clinical & CBFC Statutory Auditing
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="px-2.5 py-1 rounded text-[11px] font-mono border transition-colors flex items-center gap-1.5"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              title="Toggle Theme"
            >
              <span className="uppercase">
                {theme === 'dark' ? 'Theme: Space Black' : 'Theme: Warm Coffee'}
              </span>
            </button>

            <div
              className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono border"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-hairline)',
                color: 'var(--text-muted)',
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>SANITY LAKE CONNECTED</span>
            </div>
          </div>
        </header>

        {/* Message Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar flex flex-col">
          <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col">
            {/* Empty State / Welcome Screen */}
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                <div
                  className="font-mono text-2xl sm:text-3xl font-bold tracking-widest mb-1 uppercase"
                  style={{ color: 'var(--text-primary)' }}
                >
                  USHER
                </div>
                <p
                  className="text-xs sm:text-sm font-mono max-w-lg mb-6 uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Statutory & Clinical Film Exhibition Gatekeeper
                </p>

                {/* Discovery / Quick Prompts Grid */}
                <div className="w-full max-w-xl mb-6 text-left">
                  <div
                    className="text-[10px] font-mono uppercase tracking-wider mb-2 font-semibold"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    EXECUTIVE DISCOVERY PROMPTS
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      {
                        label: 'Epileptic Minor Thriller Check',
                        prompt: "I'm epileptic and underage, suggest a good thriller from your catalog.",
                      },
                      {
                        label: 'Unsupervised Pediatric Screening',
                        prompt: 'Which titles are certified safe for an unsupervised 6-year-old under CBFC U classification?',
                      },
                      {
                        label: 'Acoustic Shockwave Audit',
                        prompt: 'Check Oppenheimer for sudden high-decibel auditory blast triggers and tinnitus compliance.',
                      },
                      {
                        label: 'Combat PTSD Screening',
                        prompt: 'Audit Dunkirk and 1917 for sustained acoustic siren panic and combat veteran PTSD advisories.',
                      },
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setInput(chip.prompt)}
                        className="p-3 rounded border text-left transition-colors cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                        }}
                      >
                        <div
                          className="text-[11px] font-mono font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {chip.label}
                        </div>
                        <div
                          className="text-[10px] mt-0.5 truncate"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {chip.prompt}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className="text-[11px] font-mono max-w-md leading-relaxed"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Select any audited film or television title from the sidebar, or query multi-constraint requirements directly.
                </div>
              </div>
            )}

            {/* Message Stream */}
            <div className="space-y-4 pb-4">
              {messages.map((m) => {
                const toolInvocations = (m.toolInvocations || []) as unknown as ToolInvocation[];
                const sanityTools = toolInvocations.filter(
                  (t) => t.toolName === 'search_knowledge_base'
                );
                const verdict = m.role === 'assistant' ? detectVerdict(m.content) : null;

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      m.role === 'user' ? 'items-end' : 'items-start'
                    } w-full animate-fade-in`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span
                        className="text-[10px] font-mono uppercase tracking-wider font-semibold"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {m.role === 'user' ? 'AUDITOR' : 'USHER GATEKEEPER'}
                      </span>
                    </div>

                    <div
                      className={`max-w-2xl rounded-lg p-3.5 border ${
                        m.role === 'user'
                          ? 'border-transparent text-white ml-auto'
                          : 'w-full shadow-sm'
                      }`}
                      style={{
                        backgroundColor:
                          m.role === 'user'
                            ? 'var(--accent-action)'
                            : 'var(--bg-surface)',
                        borderColor:
                          m.role === 'user'
                            ? 'transparent'
                            : 'var(--border-hairline)',
                        color:
                          m.role === 'user'
                            ? 'var(--accent-action-text)'
                            : 'var(--text-primary)',
                      }}
                    >
                      {/* Live Grounding Trace */}
                      {sanityTools.length > 0 && (
                        <div>
                          {sanityTools.map((tc, idx) => (
                            <GroundingBadge
                              key={idx}
                              toolCall={tc}
                              msgId={m.id}
                              idx={idx}
                              expandedCitations={expandedCitations}
                              onToggle={toggleCitation}
                            />
                          ))}
                        </div>
                      )}

                      {/* Clean Status Verdict Banner */}
                      {verdict && <VerdictBanner verdict={verdict} />}

                      {/* Clean Message Body */}
                      {m.role === 'user' ? (
                        <p className="text-xs leading-relaxed">{m.content}</p>
                      ) : (
                        <div>{renderCleanMarkdown(m.content)}</div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-center gap-2 p-3 rounded border text-xs font-mono"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-hairline)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-ping" />
                  <span>AUDITING EVIDENCE FROM SANITY CONTENT LAKE...</span>
                </div>
              )}

              {/* Error Box */}
              {error && (
                <div
                  className="rounded border p-3 text-xs font-mono flex items-center justify-between"
                  style={{
                    backgroundColor: 'var(--verdict-prohibited-bg)',
                    borderColor: 'var(--verdict-prohibited-border)',
                    color: 'var(--verdict-prohibited-text)',
                  }}
                >
                  <div>
                    <strong>GATEWAY ERROR:</strong> {error.message}
                  </div>
                  <button
                    type="button"
                    onClick={() => reload()}
                    className="px-2 py-1 rounded text-[10px] font-mono border"
                    style={{
                      borderColor: 'var(--verdict-prohibited-border)',
                    }}
                  >
                    RETRY
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </main>

        {/* Input Bar */}
        <footer
          className="border-t p-3 sm:p-4 shrink-0"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="Audit title or enter constraints (e.g. 'Is Inception safe for epilepsy?')"
                className="flex-1 rounded-md px-3.5 py-2 text-xs border focus:outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 rounded-md text-xs font-mono font-bold uppercase transition-opacity shrink-0"
                style={{
                  backgroundColor: 'var(--accent-action)',
                  color: 'var(--accent-action-text)',
                  opacity: isLoading || !input.trim() ? 0.4 : 1,
                }}
              >
                {isLoading ? 'AUDITING...' : 'AUDIT'}
              </button>
            </form>

            <div
              className="flex items-center justify-between px-1 pt-2 text-[9px] font-mono"
              style={{ color: 'var(--text-muted)' }}
            >
              <span>USHER COMPLIANCE SPECIFICATION 2026</span>
              <span>ZERO HALLUCINATION · ITU-R BT.1702 · CBFC 2023</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
