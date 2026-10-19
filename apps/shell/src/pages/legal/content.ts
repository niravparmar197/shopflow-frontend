/*
 * The shop's policy pages (Phase 2 P4). Plain words, short sections.
 * ShopFlow is a DEMO: the business details are examples. A real shop must
 * have its own policies checked by a lawyer.
 */

export interface LegalSection {
  heading: string;
  /** Paragraphs; a string starting with "- " is a bullet. */
  body: string[];
}

export interface LegalDoc {
  slug: string;
  title: string;
  summary: string;
  sections: LegalSection[];
}

export const UPDATED = '19 October 2026';

export const BUSINESS = {
  name: 'ShopFlow Retail (demo)',
  address: '12, SG Highway, Ahmedabad, Gujarat 380015, India',
  gstin: '24AAACS1234F1Z5',
  email: 'support@shopflow.example',
  phone: '+91 79 0000 0000',
  hours: 'Monday to Saturday, 10 am to 6 pm IST',
  grievanceOfficer: 'Grievance Officer (demo), at the address above',
};

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: 'privacy',
    title: 'Privacy policy',
    summary: 'What we collect, why, and the choices you have.',
    sections: [
      {
        heading: 'What we collect',
        body: [
          '- Account: your name, email, password (stored only as a secure hash) and, if you add it, your mobile number.',
          '- Orders: what you buy, your delivery addresses, and the payment status. We never see or store your card or UPI details; the payment provider handles them.',
          '- Technical: your IP address and basic request logs, kept for security and to fix problems.',
        ],
      },
      {
        heading: 'Why we use it',
        body: [
          'To run your account, deliver your orders, send emails about them (order updates, password reset, email confirmation), keep the shop secure, and meet tax and legal duties such as GST invoices.',
          'We do not sell your data and we do not send marketing emails.',
        ],
      },
      {
        heading: 'Who we share it with',
        body: [
          '- The courier gets your name, address and phone to deliver your parcel.',
          '- The payment provider gets the amount and order number.',
          '- Our cloud provider (Amazon Web Services) stores the data for us.',
          '- Government bodies, only when the law requires it.',
        ],
      },
      {
        heading: 'How long we keep it',
        body: [
          'Account data stays while your account exists. Order and invoice records are kept for 8 years, as Indian tax law requires. Security logs are kept for up to 90 days.',
        ],
      },
      {
        heading: 'Your choices',
        body: [
          'You can see and edit your name and phone on the My account page, and manage your addresses at checkout. To get a copy of your data or to close your account, email us. Under the Digital Personal Data Protection Act, 2023, you can also ask us to correct or erase your data.',
        ],
      },
      {
        heading: 'Cookies',
        body: [
          'We use one cookie: a secure login cookie that keeps you signed in. No advertising or tracking cookies.',
        ],
      },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms of use',
    summary: 'The rules for using ShopFlow and buying from us.',
    sections: [
      {
        heading: 'About these terms',
        body: [
          `These terms are between you and ${BUSINESS.name}. By creating an account or placing an order, you agree to them.`,
        ],
      },
      {
        heading: 'Your account',
        body: [
          'Keep your password private. You are responsible for orders placed from your account. You must be 18 or older, or use the shop with a parent or guardian.',
        ],
      },
      {
        heading: 'Prices and orders',
        body: [
          'All prices are in Indian rupees and include GST. If a price changes while you check out, we show you the new total before you pay. An order is accepted when the payment is confirmed; you then get an email and a GST invoice.',
          'We may cancel an order if an item is out of stock or the price was clearly wrong. If you already paid, you get a full refund automatically.',
        ],
      },
      {
        heading: 'Flash sales and coupons',
        body: [
          'Flash sales have limited stock and may limit how many you can buy. A coupon works only under its stated conditions and cannot be exchanged for cash.',
        ],
      },
      {
        heading: 'Fair use',
        body: [
          'Do not misuse the shop: no automated buying, no attempts to break its security, no fake accounts.',
        ],
      },
      {
        heading: 'Disputes',
        body: [
          'Indian law applies. Courts in Ahmedabad, Gujarat have jurisdiction. Please contact us first: most problems can be solved quickly.',
        ],
      },
    ],
  },
  {
    slug: 'refund-policy',
    title: 'Cancellation and refund policy',
    summary: 'How to cancel, and when your money comes back.',
    sections: [
      {
        heading: 'Cancel before it ships',
        body: [
          'You can cancel any order until it ships: open the order under My orders and press "Cancel order". There is no fee.',
          'If you already paid, the full amount is refunded to the original payment method automatically.',
        ],
      },
      {
        heading: 'Returns after delivery',
        body: [
          'You can return most items within 7 days of delivery if they are unused and in the original packaging. Email us with your order number to start a return. We refund once the item reaches us.',
          'Items that cannot be returned: opened personal-care products and items marked "non-returnable" on the product page.',
        ],
      },
      {
        heading: 'Damaged or wrong items',
        body: [
          'Tell us within 48 hours of delivery, with a photo. We send a replacement or a full refund, and we pay for the return pickup.',
        ],
      },
      {
        heading: 'When the money arrives',
        body: [
          '- UPI and wallets: usually within 1 to 3 working days.',
          '- Cards and net banking: 5 to 7 working days, depending on your bank.',
          'We send an email as soon as we start the refund.',
        ],
      },
    ],
  },
  {
    slug: 'shipping-policy',
    title: 'Shipping policy',
    summary: 'Where we deliver, how fast, and how to track it.',
    sections: [
      {
        heading: 'Where we deliver',
        body: [
          'We deliver across India to addresses with a valid 6-digit PIN code. Some remote PIN codes may take longer.',
        ],
      },
      {
        heading: 'Delivery charges',
        body: ['Delivery is free on every order.'],
      },
      {
        heading: 'How long it takes',
        body: [
          'We pack and hand over your order within 1 to 2 working days after payment. Delivery then takes 2 to 5 working days in metro cities and 4 to 8 working days elsewhere.',
        ],
      },
      {
        heading: 'Tracking',
        body: [
          'When your order ships, we email you the courier name and tracking number. You can always see the latest status under My orders.',
        ],
      },
      {
        heading: 'If a delivery fails',
        body: [
          'The courier tries up to 3 times. If it still cannot deliver, the parcel comes back to us and we refund you in full.',
        ],
      },
    ],
  },
];
