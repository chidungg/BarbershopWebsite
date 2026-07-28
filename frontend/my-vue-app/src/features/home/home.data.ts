export type Service = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  duration: string;
  price: string;
  image: string;
};

export const featuredServices: Service[] = [
  {
    id: 'signature-cut',
    eyebrow: 'SIGNATURE SERVICE',
    title: 'Signature Cut',
    description:
      'A considered consultation, precision cut and refined finish tailored to you.',
    duration: '45 min',
    price: 'From 250,000₫',
    image: '/images/carousel/signature-cut.png',
  },
  {
    id: 'beard-sculpting',
    eyebrow: 'DETAIL IN EVERY LINE',
    title: 'Beard Sculpting',
    description:
      'Shape, balance and a calming hot-towel finish for a sharper profile.',
    duration: '30 min',
    price: 'From 180,000₫',
    image: '/images/background.png',
  },
  {
    id: 'complete-grooming',
    eyebrow: 'THE COMPLETE RITUAL',
    title: 'Premium Grooming',
    description:
      'An unhurried haircut and beard ritual for the modern gentleman.',
    duration: '75 min',
    price: 'From 420,000₫',
    image: '/images/carousel/signature-cut.png',
  },
];

export const services = [
  {
    name: 'Classic Haircut',
    description:
      'A sharp, effortless cut shaped around your features and style.',
    duration: '45 min',
    price: '250,000₫',
    icon: '✂',
  },
  {
    name: 'Beard Trim & Shape',
    description: 'A precise trim, clean contours and considered beard care.',
    duration: '30 min',
    price: '180,000₫',
    icon: '✦',
  },
  {
    name: 'Cut & Beard',
    description: 'A complete look from your haircut to your beard line.',
    duration: '75 min',
    price: '420,000₫',
    icon: '◇',
  },
];

export const barbers = [
  { name: 'Minh Tran', specialty: 'Skin fades & modern cuts', initials: 'MT' },
  {
    name: 'Khang Le',
    specialty: 'Classic cuts & beard shaping',
    initials: 'KL',
  },
  { name: 'An Nguyen', specialty: 'Textured cuts & styling', initials: 'AN' },
];
