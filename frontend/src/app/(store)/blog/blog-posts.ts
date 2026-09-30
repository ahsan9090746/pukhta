export interface BlogPost {
  slug: string;
  title: string;
  tag: string;
  /** Human readable date shown on the card. */
  date: string;
  /** Machine readable date (ISO) — used by `<time>` and the page's JSON-LD. */
  dateISO: string;
  readTime: string;
  author: string;
  excerpt: string;
  body: string[];
  /** Hero slot on the listing page. */
  featured?: boolean;
}

/**
 * Store journal posts. Kept in one place so the listing page stays a pure
 * presentational component (each post opens inline — no separate routes).
 */
export const POSTS: BlogPost[] = [
  {
    slug: "how-to-break-in-leather-chappals",
    title: "How to break in a new pair of leather chappals",
    tag: "Care Guide",
    date: "March 12, 2025",
    dateISO: "2025-03-12",
    readTime: "4 min read",
    author: "Workshop team",
    featured: true,
    excerpt:
      "Fresh leather always feels a little stiff. Here is the gentle, three-day routine we recommend to every customer for a perfect fit.",
    body: [
      "Leather is skin, and like any skin it softens with use. A brand-new pair will feel firm across the vamp and the sole edges — that is normal and it is exactly how the shoe keeps its shape for years.",
      "Day one: wear them indoors for 30-45 minutes. Walk around the house, letting the leather warm up and start moulding to the shape of your foot.",
      "Day two: take a short walk outside, an hour at most. If you feel pressure on one spot, apply a small amount of leather balm and gently flex that area with your hands.",
      "Day three onwards: wear them as normal. Within a week the insole will have taken the print of your foot and the chappal will feel like it was made for you — because in a way, it now is.",
      "Avoid soaking them in water and never dry leather near a direct heater; both pull the natural oils out and cause cracking.",
    ],
  },
  {
    slug: "choosing-the-right-chappal",
    title: "Kaptaan, Norozi or Kheri? Choosing the right chappal",
    tag: "Buying Guide",
    date: "February 28, 2025",
    dateISO: "2025-02-28",
    readTime: "5 min read",
    author: "Workshop team",
    excerpt:
      "The names are not just styles — each shape is built for a different kind of day. Here is how to pick the one that suits you.",
    body: [
      "Kaptaan chappals have a broad, flat sole and an open toe — the most comfortable option for daily wear, especially in hot weather.",
      "Norozi chappals are heavier, with a double-sole build that gives more support and a formal look. They pair well with shalwar kameez for events.",
      "Kheri and Zalmi styles sit in between: light enough for the office, sturdy enough for long walks.",
      "If you are between sizes, take the larger one — leather contracts slightly after it settles, and the strap can always be tightened.",
    ],
  },
  {
    slug: "leather-care-in-rainy-season",
    title: "Leather care in the rainy season",
    tag: "Care Guide",
    date: "February 05, 2025",
    dateISO: "2025-02-05",
    readTime: "3 min read",
    author: "Workshop team",
    excerpt:
      "A little prevention keeps monsoon water from ruining handcrafted leather. Five habits that cost nothing but save everything.",
    body: [
      "Water is leather's biggest enemy — it swells the fibres, washes out the tanning oils and leaves a stiff, cracked surface once it dries.",
      "Keep a soft cloth handy and wipe the surface dry as soon as you come indoors. Never leave a wet pair in a closed shoe rack.",
      "Stuff the inside with newspaper while drying so the shape holds. Change the paper once it gets damp.",
      "Re-apply a leather balm or neutral polish once the chappal is completely dry — this puts back the oils the rain took out.",
      "For storage, use a cotton bag rather than a plastic one so the leather can breathe.",
    ],
  },
  {
    slug: "wearing-chappals-with-formals",
    title: "Wearing chappals with formals: a simple guide",
    tag: "Styling",
    date: "February 14, 2025",
    dateISO: "2025-02-14",
    readTime: "3 min read",
    author: "Workshop team",
    excerpt:
      "Chappals are not only for casual days. Three small adjustments make a handcrafted pair look at home with a shalwar kameez or a smart shirt.",
    body: [
      "Peshawari chappals have been worn with formal dress in this region for generations — the shape is simple, and simple is exactly what makes it work with almost everything.",
      "Keep the leather polished. One coat of neutral polish before you leave the house takes a pair from everyday to invited-to-the-wedding in under a minute, and it protects the hide at the same time.",
      "Match the tone of the chappal to the tone of the outfit: tan and camel read warm and sit well with beige, cream and grey, while deep brown and black are the safer pick against navy, charcoal and black trousers.",
      "A stitched double-sole pattern holds a crisper line than a light single sole, so it suits occasions where you will be standing and photographed for hours.",
      "Lastly, watch the proportions. A trouser hem that breaks once over the foot looks sharper than a hem that bunches up over the strap, and a slightly tapered shalwar keeps the silhouette clean.",
    ],
  },
  {
    slug: "spot-genuine-leather",
    title: "Five checks that prove leather is genuine",
    tag: "Buying Guide",
    date: "January 20, 2025",
    dateISO: "2025-01-20",
    readTime: "4 min read",
    author: "Workshop team",
    excerpt:
      "Not everything sold as leather is leather. Five checks you can run in the shop — no equipment needed — to spot the real thing before you pay.",
    body: [
      "Press the surface with your thumb. Genuine leather creases in fine, irregular lines and springs straight back; a coated synthetic creases in a smooth, even bow and keeps the mark.",
      "Look at the cut edges. A real hide shows a matted fibre structure where it has been trimmed, not a smooth plastic rim with a fabric or foam core.",
      "Smell it. Leather smells warm and slightly earthy. Anything that smells of glue, solvent or petrol is a synthetic finish sitting on a backing.",
      "Check the inside. The lining should be suede-like or the same hide with the grain visible, rather than a papery grey backing — that is the giveaway for bonded leather.",
      "The warmth test: leather takes on the heat of your hand within a few seconds. Synthetics stay cool on the surface, or turn clammy and hold sweat.",
    ],
  },
  {
    slug: "why-our-soles-are-stitched",
    title: "Why our soles are stitched, not glued",
    tag: "Craft Notes",
    date: "January 08, 2025",
    dateISO: "2025-01-08",
    readTime: "4 min read",
    author: "Workshop team",
    excerpt:
      "A stitched sole is the slowest way to build a chappal — and the reason a well-kept pair can be repaired instead of replaced.",
    body: [
      "A glued sole is fast: press, clamp, done. It is also the first thing to fail, because that bond has to survive every step, every wet pavement and every afternoon in a hot car.",
      "Our craftsmen stitch the sole to the upper with waxed thread while the leather is still slightly damp and pliable, working around the welt one pair at a time.",
      "Because the leather is worked wet, it tightens as it dries and grips the thread — that is what keeps a stitched sole sitting flush for years instead of peeling at the toe.",
      "A stitched build can be re-soled. Bring a tired pair back to the bench and the sole can be replaced while the upper, already moulded to your foot, carries on.",
      "You can see the work from the outside: look for one even line of hand-run stitches around the welt. A moulded rim or visible glue line means it was not built this way.",
    ],
  },
  {
    slug: "storing-chappals-for-the-season",
    title: "Storing your chappals for the off-season",
    tag: "Care Guide",
    date: "December 18, 2024",
    dateISO: "2024-12-18",
    readTime: "3 min read",
    author: "Workshop team",
    excerpt:
      "Leather that sits untouched for months dries out and cracks. A ten-minute routine before you put a pair away keeps it ready for the next season.",
    body: [
      "Clean first, store second. Dust and dried sweat salts stay on the surface and pull moisture out of the leather the whole time it is sitting in the cupboard.",
      "Wipe the pair with a soft dry cloth, then let it air in the shade for a few hours — never in direct sun, which fades the dye unevenly.",
      "Apply a thin coat of leather balm or neutral polish and let it soak in before storing. That coat of oil is what the leather will live on for the next few months.",
      "Stuff the toes with crumpled newspaper or a shoe tree so the shape holds, and store the pair in a cotton bag rather than plastic — plastic traps humidity and invites mould.",
      "Check in once a month. Flex the sole gently, wipe off any white bloom (harmless, it comes from the oils) and re-balm if the surface feels dry to the touch.",
    ],
  },
];
