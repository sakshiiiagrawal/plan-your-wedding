/** Wedding hashtag generator — pure builder + client island.
 *
 *  Same arrangement as the budget tool: the builder runs at build time to fill
 *  the page with a real worked example, and again in the browser when the
 *  reader types their own names.
 */

export interface HashtagInput {
  a: string;
  b: string;
  surname?: string;
  year?: string;
}

export interface HashtagGroup {
  title: string;
  tags: string[];
}

/** The example rendered into the static HTML. */
export const EXAMPLE: HashtagInput = { a: 'Aarav', b: 'Diya', surname: 'Mehta', year: '2026' };

function clean(value: string): string {
  return value.replace(/[^a-zA-Z]/g, '');
}

function cap(value: string): string {
  const c = clean(value);
  return c ? c[0]!.toUpperCase() + c.slice(1).toLowerCase() : '';
}

/** First half of one name welded to the second half of the other. Short names
 *  produce short blends, which is usually the good outcome. */
function blend(x: string, y: string): string {
  if (!x || !y) return '';
  const head = x.slice(0, Math.max(2, Math.ceil(x.length / 2)));
  const tail = y.slice(Math.max(1, Math.floor(y.length / 2)));
  return cap(head + tail);
}

function group(title: string, tags: (string | false | undefined)[]): HashtagGroup {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const tag of tags) {
    if (!tag) continue;
    // Digits survive here (they don't in `clean`) so year variants stay intact.
    const value = `#${tag.replace(/^#/, '').replace(/[^a-zA-Z0-9]/g, '')}`;
    if (value.length < 4 || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    kept.push(value);
  }
  return { title, tags: kept };
}

export function buildHashtags(input: HashtagInput): HashtagGroup[] {
  const a = cap(input.a);
  const b = cap(input.b);
  if (!a || !b) return [];
  const s = cap(input.surname ?? '');
  const year = (input.year ?? '').replace(/[^0-9]/g, '').slice(0, 4);
  const ab = a + b;

  return [
    group('Name blends', [
      blend(a, b),
      blend(b, a),
      `${blend(a, b)}Forever`,
      `${blend(a, b)}KiShaadi`,
      `${blend(b, a)}EverAfter`,
    ]),
    group('Classic', [
      `${ab}Wedding`,
      `The${ab}Wedding`,
      `${a}And${b}`,
      `${a}Weds${b}`,
      `${ab}Forever`,
      `${a}Plus${b}`,
      `HappilyEver${a}`,
      `HappilyEver${b}`,
    ]),
    group('Desi', [
      `${ab}KiShaadi`,
      `${ab}KiBaraat`,
      `ShaadiOf${a}And${b}`,
      `${ab}KaByah`,
      `${ab}SangeetNight`,
      `${a}${b}KiJodi`,
      `BajeGaaje${ab}`,
    ]),
    group('Family', [
      s && `MeetThe${s}s`,
      s && `${s}KiShaadi`,
      s && `The${s}Wedding`,
      s && `${a}Becomes${s}`,
      s && `${s}Sangeet`,
    ]),
    group('With the year', [
      year && `${ab}${year}`,
      year && `${blend(a, b)}${year}`,
      year && `Shaadi${year}${ab}`,
      year && s && `${s}${year}`,
    ]),
  ].filter((g) => g.tags.length > 0);
}

/* ── Client island ──────────────────────────────────────────────────────── */

export function mountHashtags(root: HTMLElement): void {
  const out = root.querySelector('#hg-output');
  if (!out) return;

  const read = (id: string): string =>
    (root.querySelector(`#${id}`) as HTMLInputElement | null)?.value ?? '';

  function render(): void {
    const groups = buildHashtags({
      a: read('hg-a'),
      b: read('hg-b'),
      surname: read('hg-surname'),
      year: read('hg-year'),
    });

    if (groups.length === 0) {
      out!.innerHTML =
        '<p class="text-[15px] leading-8 text-ink-low">Add both names to see suggestions.</p>';
      return;
    }

    out!.innerHTML = groups
      .map(
        (g) =>
          `<div class="mt-8 first:mt-0"><p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-700">${g.title}</p>` +
          `<ul class="mt-4 flex flex-wrap gap-2.5">` +
          g.tags
            .map(
              (t) =>
                `<li><button type="button" data-tag="${t}" class="rounded-full border border-line bg-surface-panel px-4 py-2 text-[15px] text-ink-high transition-colors hover:border-gold-300 hover:bg-gold-50">${t}</button></li>`,
            )
            .join('') +
          `</ul></div>`,
      )
      .join('');
  }

  root.addEventListener('input', render);

  // Tap a suggestion to copy it. Falls back silently where the clipboard API
  // is unavailable (older in-app browsers), leaving the text selectable.
  out.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest('[data-tag]') as HTMLElement | null;
    if (!button) return;
    const tag = button.dataset.tag ?? '';
    navigator.clipboard?.writeText(tag).then(
      () => {
        const original = button.textContent;
        button.textContent = 'Copied';
        setTimeout(() => {
          button.textContent = original;
        }, 1200);
      },
      () => {},
    );
  });

  render();
}
