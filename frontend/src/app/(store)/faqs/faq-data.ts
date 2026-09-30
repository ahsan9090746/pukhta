export interface FaqGroup {
  title: string;
  items: { question: string; answer: string }[];
}

/** Store FAQs shown on /faqs — grouped so the page stays presentational. */
export const FAQ_GROUPS: FaqGroup[] = [
  {
    title: "Orders & Delivery",
    items: [
      {
        question: "How long does delivery take?",
        answer:
          "Orders are packed within 24–48 hours. Delivery usually takes 2–4 working days for major cities and 3–6 days for other areas.",
      },
      {
        question: "Do you offer cash on delivery?",
        answer:
          "Yes. Cash on delivery is available in most cities — you only pay when the parcel reaches your doorstep.",
      },
      {
        question: "How do I track my order?",
        answer:
          "Open the Track Order page and enter your order code or the phone number you used at checkout to see live status updates.",
      },
      {
        question: "Can I change my delivery address after ordering?",
        answer:
          "If your order has not been dispatched yet we can update the address — contact us as soon as possible with your order code.",
      },
      {
        question: "Is delivery free?",
        answer:
          "Shipping is free on every order — there is nothing extra to pay for delivery. Cash on delivery is available in most cities.",
      },
      {
        question: "Can I order without creating an account?",
        answer:
          "Yes. Checkout is guest friendly: add your items to the bag, then give us your name, phone number and delivery address and you are done.",
      },
    ],
  },
  {
    title: "Sizes & Fit",
    items: [
      {
        question: "How do I choose the right size?",
        answer:
          "Our chappals follow standard Pakistani sizing. If you are between two sizes, choose the larger one — leather settles slightly after a few wears.",
      },
      {
        question: "Will leather chappals stretch?",
        answer:
          "Pure leather moulds to your foot and loosens slightly at the strap, but the sole keeps its shape. This is why a firm fit on day one ends up perfect.",
      },
      {
        question: "Do you make custom sizes?",
        answer:
          "For unusual sizes or bulk orders, contact us with your measurements and we will confirm what our workshop can produce.",
      },
      {
        question: "I usually wear a half size — which one should I order?",
        answer:
          "Take the next size up. Leather settles and the strap can always be tightened, but a pair that starts too small stays tight across the toes.",
      },
    ],
  },
  {
    title: "Returns & Exchange",
    items: [
      {
        question: "What is your return policy?",
        answer:
          "Unworn pairs in original condition can be returned or exchanged within our return window. Keep the box and tags intact.",
      },
      {
        question: "The size does not fit — what now?",
        answer:
          "Contact us with your order code and the size you need. We will arrange an exchange and guide you through the return of the original pair.",
      },
      {
        question: "What if the item arrives damaged?",
        answer:
          "Please share a photo within 48 hours of delivery and we will replace the pair or refund you — whichever you prefer.",
      },
      {
        question: "Can I exchange for a different style?",
        answer:
          "Yes. As long as the pair is unworn and still in its original box, you can swap it for another style — send us your order code and the style you want.",
      },
    ],
  },
  {
    title: "Payments & Support",
    items: [
      {
        question: "Which payment methods do you accept?",
        answer:
          "Cash on delivery plus the card and wallet options shown at checkout. All online payments are processed through a secure gateway.",
      },
      {
        question: "Do you offer bulk or wholesale pricing?",
        answer:
          "Yes — for larger quantities, contact us with the styles and sizes you need and we will send a quotation.",
      },
    ],
  },
  {
    title: "Products & Craft",
    items: [
      {
        question: "Is the leather genuine?",
        answer:
          "Yes. Every pair is cut from pure cow and buffalo leather — never a synthetic or bonded substitute. That is why the shoe moulds to your foot and gets softer with every wear.",
      },
      {
        question: "Where are your products made?",
        answer:
          "In our own workshop, by hand, one pair at a time. The hide is selected, cut, shaped and stitched by our craftsmen before the sole is attached.",
      },
      {
        question: "How should I look after my chappals?",
        answer:
          "Wipe them with a dry cloth after wearing, keep them away from water and direct heat, and re-apply leather balm or neutral polish every few weeks. Our blog has full care guides.",
      },
    ],
  },
];
