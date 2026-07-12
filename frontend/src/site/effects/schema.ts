import { createContext, useContext } from 'react';

/**
 * The template effects system: every "advanced animation" option a couple can
 * tune in the Studio is a named-choice control declared here. Templates list
 * the controls they honor (`TemplateDefinition.effectControls`); the Studio
 * renders them generically; the picks live in the page's `config.effects` as
 * sparse `{ [controlId]: choiceId }` — human-readable, no migration risk.
 *
 * Controls with SHARED ids (scrollAnim, galleryHover, …) persist across
 * template switches: the couple's choice carries to any template that also
 * declares that id.
 */

export interface EffectChoice {
  id: string;
  name: string;
  hint?: string;
}

export interface EffectControl {
  /** Storage key in `config.effects`. Shared ids survive template switches. */
  id: string;
  /** Studio panel grouping. */
  group: 'atmosphere' | 'motion' | 'interaction';
  label: string;
  hint?: string;
  /** One control type on purpose: a toggle is 2 choices, a slider is 3 named ones. */
  choices: EffectChoice[];
  defaultId: string;
}

// ---------------------------------------------------------------------------
// Shared control library — any template adopts these verbatim.
// ---------------------------------------------------------------------------

export const SCROLL_ANIM_CONTROL: EffectControl = {
  id: 'scrollAnim',
  group: 'motion',
  label: 'Section entrances',
  hint: 'How sections animate in as guests scroll.',
  choices: [
    { id: 'full', name: 'Full', hint: 'Rich fades and rises — the designed look' },
    { id: 'gentle', name: 'Gentle', hint: 'Softer, quicker entrances' },
    { id: 'off', name: 'Off', hint: 'Everything appears instantly' },
  ],
  defaultId: 'full',
};

export const GALLERY_HOVER_CONTROL: EffectControl = {
  id: 'galleryHover',
  group: 'interaction',
  label: 'Photo hover',
  hint: 'What gallery photos do under the cursor.',
  choices: [
    { id: 'zoom', name: 'Zoom', hint: 'Photos ease in closer' },
    { id: 'tilt', name: 'Tilt', hint: 'A playful keepsake tilt' },
    { id: 'lift', name: 'Lift', hint: 'Photos rise off the page' },
    { id: 'none', name: 'None', hint: 'Photos stay still' },
  ],
  defaultId: 'zoom',
};

export const FALL_DENSITY_CONTROL: EffectControl = {
  id: 'fallDensity',
  group: 'atmosphere',
  label: 'Density',
  hint: 'How much drifts through the air.',
  choices: [
    { id: 'sparse', name: 'Sparse', hint: 'A whisper of movement' },
    { id: 'normal', name: 'Normal', hint: 'The designed balance' },
    { id: 'lush', name: 'Lush', hint: 'A full flurry' },
  ],
  defaultId: 'normal',
};

export const HERO_PARALLAX_CONTROL: EffectControl = {
  id: 'heroParallax',
  group: 'interaction',
  label: 'Cursor drift',
  hint: 'The hero leans gently with the mouse (desktop only).',
  choices: [
    { id: 'on', name: 'On' },
    { id: 'off', name: 'Off' },
  ],
  defaultId: 'on',
};

export const HEADING_SHIMMER_CONTROL: EffectControl = {
  id: 'headingShimmer',
  group: 'motion',
  label: 'Name shimmer',
  hint: 'A soft light sweep across the couple’s names.',
  choices: [
    { id: 'on', name: 'On' },
    { id: 'off', name: 'Off' },
  ],
  defaultId: 'on',
};

/** Per-template "what falls" picker under the shared `falling` id, so a
 *  couple's choice maps onto the closest kind after a template switch. */
export function fallingControl(choices: EffectChoice[], defaultId: string): EffectControl {
  return {
    id: 'falling',
    group: 'atmosphere',
    label: 'Falling in the air',
    hint: 'What drifts down through the page.',
    choices,
    defaultId,
  };
}

// ---------------------------------------------------------------------------
// Per-template control sets (data only — safe to import eagerly). Every
// template declares one: the shared motion/interaction controls verbatim,
// plus an atmosphere control for its signature effect where it has one
// (Botanical's falling petals & arch, Classic's gold dust, Midnight's stars,
// Fiesta's confetti & mandala, Editorial's marquee).
// ---------------------------------------------------------------------------

export const BOTANICAL_EFFECTS: EffectControl[] = [
  fallingControl(
    [
      { id: 'petals', name: 'Petals' },
      { id: 'leaves', name: 'Leaves' },
      { id: 'blossoms', name: 'Blossoms' },
      { id: 'mixed', name: 'Mixed' },
      { id: 'none', name: 'None' },
    ],
    'petals',
  ),
  FALL_DENSITY_CONTROL,
  {
    id: 'arch',
    group: 'atmosphere',
    label: 'Garden arch',
    hint: 'The living arch behind the names.',
    choices: [
      { id: 'catch', name: 'Catch', hint: 'Petals settle on the arch and slide off' },
      { id: 'sway', name: 'Sway', hint: 'Petals drift straight through' },
      { id: 'hidden', name: 'Hidden', hint: 'No arch — open sky' },
    ],
    defaultId: 'catch',
  },
  SCROLL_ANIM_CONTROL,
  GALLERY_HOVER_CONTROL,
  HERO_PARALLAX_CONTROL,
];

export const CLASSIC_EFFECTS: EffectControl[] = [
  {
    id: 'goldDust',
    group: 'atmosphere',
    label: 'Gold dust',
    hint: 'The fine motes drifting through the hero and RSVP.',
    choices: [
      { id: 'sparse', name: 'Sparse', hint: 'A whisper of glimmer' },
      { id: 'normal', name: 'Normal', hint: 'The designed balance' },
      { id: 'lush', name: 'Lush', hint: 'A full golden haze' },
      { id: 'none', name: 'None', hint: 'Clear air' },
    ],
    defaultId: 'normal',
  },
  SCROLL_ANIM_CONTROL,
  GALLERY_HOVER_CONTROL,
  HERO_PARALLAX_CONTROL,
  HEADING_SHIMMER_CONTROL,
];

export const EDITORIAL_EFFECTS: EffectControl[] = [
  {
    id: 'marquee',
    group: 'atmosphere',
    label: 'Save-the-date ticker',
    hint: 'The running masthead strip along the bottom of the cover.',
    choices: [
      { id: 'scroll', name: 'Scrolling', hint: 'Loops like a newsroom ticker' },
      { id: 'static', name: 'Still', hint: 'Printed once, centered' },
      { id: 'hidden', name: 'Hidden', hint: 'No strip' },
    ],
    defaultId: 'scroll',
  },
  SCROLL_ANIM_CONTROL,
  GALLERY_HOVER_CONTROL,
  HERO_PARALLAX_CONTROL,
];

export const MIDNIGHT_EFFECTS: EffectControl[] = [
  {
    id: 'stars',
    group: 'atmosphere',
    label: 'Night sky',
    hint: 'The twinkling stars and shooting star behind the hero.',
    choices: [
      { id: 'on', name: 'On' },
      { id: 'off', name: 'Off' },
    ],
    defaultId: 'on',
  },
  SCROLL_ANIM_CONTROL,
  GALLERY_HOVER_CONTROL,
  HEADING_SHIMMER_CONTROL,
];

export const JOURNEY_EFFECTS: EffectControl[] = [SCROLL_ANIM_CONTROL, GALLERY_HOVER_CONTROL];

export const FIESTA_EFFECTS: EffectControl[] = [
  {
    id: 'confetti',
    group: 'atmosphere',
    label: 'Welcome confetti',
    hint: 'The burst that greets guests as the page opens.',
    choices: [
      { id: 'burst', name: 'Burst', hint: 'One celebratory shower on arrival' },
      { id: 'off', name: 'Off' },
    ],
    defaultId: 'burst',
  },
  {
    id: 'mandala',
    group: 'atmosphere',
    label: 'Mandala',
    hint: 'The line-drawn chakra behind the names.',
    choices: [
      { id: 'turning', name: 'Turning', hint: 'Slowly rotates — the designed look' },
      { id: 'still', name: 'Still', hint: 'Drawn but motionless' },
      { id: 'hidden', name: 'Hidden', hint: 'No mandala' },
    ],
    defaultId: 'turning',
  },
  SCROLL_ANIM_CONTROL,
  GALLERY_HOVER_CONTROL,
];

export const INVITE_EFFECTS: EffectControl[] = [SCROLL_ANIM_CONTROL, HEADING_SHIMMER_CONTROL];

export const REEL_EFFECTS: EffectControl[] = [SCROLL_ANIM_CONTROL, HEADING_SHIMMER_CONTROL];

export const BOARDING_EFFECTS: EffectControl[] = [SCROLL_ANIM_CONTROL];

export const CARD_EFFECTS: EffectControl[] = [SCROLL_ANIM_CONTROL];

// ---------------------------------------------------------------------------
// Resolution + context
// ---------------------------------------------------------------------------

/**
 * Trust boundary: `config.effects` is client-writable JSON and must never
 * crash a template. Unknown keys are dropped, unknown values fall back to the
 * control's default. Returns a complete `{ controlId: choiceId }` map.
 */
export function resolveEffects(
  controls: EffectControl[],
  saved: Record<string, string> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const control of controls) {
    const v = saved?.[control.id];
    out[control.id] =
      typeof v === 'string' && control.choices.some((c) => c.id === v) ? v : control.defaultId;
  }
  return out;
}

/** Template roots resolve once and provide; deep shared components (e.g.
 *  GalleryGrid) read presets without prop drilling. */
export const SiteEffectsContext = createContext<Record<string, string>>({});

/** Falls back to the control's default when no provider (templates that
 *  haven't adopted effects yet). */
export function useEffectValue(control: EffectControl): string {
  return useContext(SiteEffectsContext)[control.id] ?? control.defaultId;
}
