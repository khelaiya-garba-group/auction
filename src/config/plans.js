/**
 * Cricket Auction Platform - Tier Plans & Pricing Configuration
 * You can directly edit this file to customize plan features, pricing, limits, and options.
 */

export const PRICING_CONFIG = {
  currency: 'INR',
  currencySymbol: '₹',
  contactWhatsAppNumber: '919876543210', // Replace with your support/sales WhatsApp number
  contactEmail: 'support@cricketauction.com',
  faq: [
    {
      question: "How does Player Registration work with Public vs Private links?",
      answer: "Public registration links allow any player to register directly for open tournaments. Private / Invite links require a unique invitation access code, ensuring only approved or pre-screened players can register."
    },
    {
      question: "What is the Sponsor Display on Live Skin feature?",
      answer: "In Pro and Enterprise plans, you can upload sponsor banners and logos. They automatically appear on the live bidding dashboard overlay and TV projector screens during live player auctions."
    },
    {
      question: "Can I share team squads and PDF files directly on WhatsApp?",
      answer: "Yes! All plans include WhatsApp squad text sharing. Pro & Enterprise plans enable direct PDF document sharing with player mobile numbers for quick WhatsApp team group creation."
    },
    {
      question: "Can I customize the maximum players limit per team?",
      answer: "Yes, you can set dynamic max squad sizes (e.g. 11 players, 15 players) in auction setup, and live bidding will automatically enforce budget and squad limits."
    },
    {
      question: "Can I upgrade my plan mid-tournament?",
      answer: "Yes! You can upgrade your plan anytime without losing any player registrations, team data, or auction settings."
    }
  ]
};

export const PLANS = [
  {
    id: 'starter',
    name: 'Starter League',
    tagline: 'Ideal for local gully cricket, school & community matches',
    badge: null,
    popular: false,
    price: {
      amount: '999',
      period: 'per tournament',
      originalAmount: '1,999',
      discountNote: '50% OFF'
    },
    accentColor: 'var(--text-muted)',
    limits: {
      teams: 'Up to 4 Teams',
      players: 'Up to 60 Players'
    },
    features: [
      { text: 'Up to 4 Teams Limit', included: true, highlight: false },
      { text: 'Up to 60 Players Limit', included: true, highlight: false },
      { text: 'Public Player Registration Link', included: true, highlight: true },
      { text: 'Private / Invite-Only Registration Link', included: false, highlight: false },
      { text: 'Live Bidding Dashboard', included: true, highlight: false },
      { text: 'TV Projector Screen Display', included: true, highlight: false },
      { text: 'WhatsApp Squad Details Sharing', included: true, highlight: true },
      { text: 'WhatsApp Direct PDF Document Sharing', included: false, highlight: false },
      { text: 'Sponsor Logos Overlay on Live Skin', included: false, highlight: false },
      { text: 'Dedicated Owners Module (Multi-Owners)', included: false, highlight: false },
      { text: 'Dynamic Team Squad Limits (Max Players)', included: true, highlight: false },
      { text: 'PDF Squad Downloads Suite', included: true, highlight: false },
      { text: 'Standard Email Support', included: true, highlight: false }
    ],
    ctaText: 'Choose Starter',
    ctaVariant: 'outline'
  },
  {
    id: 'pro',
    name: 'Pro Tournament',
    tagline: 'Best for club tournaments, corporate leagues & academy cups',
    badge: 'MOST POPULAR',
    popular: true,
    price: {
      amount: '2,499',
      period: 'per tournament',
      originalAmount: '4,999',
      discountNote: 'BEST VALUE'
    },
    accentColor: 'var(--accent-gold)',
    limits: {
      teams: 'Up to 12 Teams',
      players: 'Up to 250 Players'
    },
    features: [
      { text: 'Up to 12 Teams Limit', included: true, highlight: true },
      { text: 'Up to 250 Players Limit', included: true, highlight: true },
      { text: 'Public Player Registration Link', included: true, highlight: false },
      { text: 'Private / Invite-Only Registration Link', included: true, highlight: true },
      { text: 'Live Bidding Dashboard', included: true, highlight: false },
      { text: 'TV Projector Screen Display (Full HD)', included: true, highlight: true },
      { text: 'WhatsApp Squad Details Sharing', included: true, highlight: false },
      { text: 'WhatsApp Direct PDF Document Sharing', included: true, highlight: true },
      { text: 'Sponsor Logos Overlay on Live Skin', included: true, highlight: true },
      { text: 'Dedicated Owners Module (Multi-Owners)', included: true, highlight: true },
      { text: 'Dynamic Team Squad Limits (Max Players)', included: true, highlight: false },
      { text: 'PDF Squad & Player Profile Cards', included: true, highlight: false },
      { text: 'Priority WhatsApp & Call Support', included: true, highlight: true }
    ],
    ctaText: 'Get Pro Plan',
    ctaVariant: 'primary'
  },
  {
    id: 'enterprise',
    name: 'Grand Premier League',
    tagline: 'For state associations, mega leagues & televised Premier Leagues',
    badge: 'UNLIMITED POWER',
    popular: false,
    price: {
      amount: '4,999',
      period: 'per tournament',
      originalAmount: '9,999',
      discountNote: '50% OFF'
    },
    accentColor: 'var(--accent-green)',
    limits: {
      teams: 'UNLIMITED Teams',
      players: 'UNLIMITED Players'
    },
    features: [
      { text: 'UNLIMITED Teams Limit', included: true, highlight: true },
      { text: 'UNLIMITED Players Limit', included: true, highlight: true },
      { text: 'Public Player Registration Link', included: true, highlight: false },
      { text: 'Private / Invite-Only Registration Link', included: true, highlight: true },
      { text: 'Live Bidding Dashboard + Sound FX', included: true, highlight: true },
      { text: 'TV Projector 4K Overlay Display', included: true, highlight: true },
      { text: 'WhatsApp Squad Details Sharing', included: true, highlight: false },
      { text: 'WhatsApp Direct PDF Document Sharing', included: true, highlight: true },
      { text: 'Sponsor Logos Overlay on Live Skin', included: true, highlight: true },
      { text: 'Dedicated Owners Module (Multi-Owners)', included: true, highlight: true },
      { text: 'Dynamic Team Squad Limits (Max Players)', included: true, highlight: false },
      { text: 'Custom Branding & League Themes', included: true, highlight: true },
      { text: '24/7 Dedicated Account Manager', included: true, highlight: true }
    ],
    ctaText: 'Get Enterprise Plan',
    ctaVariant: 'outline'
  }
];

export const FEATURE_MATRIX = [
  {
    category: 'Tournament & Player Capacity',
    items: [
      { name: 'Number of Teams', starter: 'Up to 4 Teams', pro: 'Up to 12 Teams', enterprise: 'UNLIMITED Teams' },
      { name: 'Number of Players', starter: 'Up to 60 Players', pro: 'Up to 250 Players', enterprise: 'UNLIMITED Players' },
      { name: 'Dynamic Max Players per Team', starter: true, pro: true, enterprise: true }
    ]
  },
  {
    category: 'Player Registration & Links',
    items: [
      { name: 'Public Player Registration Link', starter: true, pro: true, enterprise: true },
      { name: 'Private / Invite Code Registration Link', starter: false, pro: true, enterprise: true },
      { name: 'Custom Player Registration Fields', starter: true, pro: true, enterprise: true }
    ]
  },
  {
    category: 'Live Auction & Overlays',
    items: [
      { name: 'Live Bidding Dashboard', starter: true, pro: true, enterprise: true },
      { name: 'TV Projector Screen View', starter: true, pro: true, enterprise: true },
      { name: 'Sponsor Overlay on Live Skin', starter: false, pro: true, enterprise: true },
      { name: 'Custom Tournament Branding & Logos', starter: false, pro: true, enterprise: true }
    ]
  },
  {
    category: 'WhatsApp Squad & Contact Tools',
    items: [
      { name: 'WhatsApp Squad Details Text Sharing', starter: true, pro: true, enterprise: true },
      { name: 'WhatsApp Owner & Player Mobile Contacts', starter: true, pro: true, enterprise: true },
      { name: 'WhatsApp Direct PDF Document Sharing', starter: false, pro: true, enterprise: true },
      { name: 'Single Team PDF Squad Exports', starter: true, pro: true, enterprise: true }
    ]
  },
  {
    category: 'Team & Owner Management',
    items: [
      { name: 'Dedicated Owners Module (Multi-Owners)', starter: false, pro: true, enterprise: true },
      { name: 'Purse & Budget Spend Analytics', starter: true, pro: true, enterprise: true },
      { name: 'Player Category & Base Price Sets', starter: true, pro: true, enterprise: true }
    ]
  },
  {
    category: 'Support & Services',
    items: [
      { name: 'Support Channel', starter: 'Email Support', pro: 'WhatsApp & Phone', enterprise: '24/7 Account Manager' }
    ]
  }
];
