export interface Hall {
  id: string;
  name: string;
  capacity: number;
  price: number;
  imageUrl: string;
  amenities: string[];
  description: string;
}

export interface Venue {
  id: string;
  title: string;
  location: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  verified: boolean;
  featured: boolean;
  instantBook: boolean;
  type: "Wedding" | "Conference" | "Party" | "Concert";
  description: string;
  halls: Hall[];
  minPrice: number;
  maxCapacity: number;
}

export const MOCK_VENUES: Venue[] = [
  {
    id: "1",
    title: "The Monarch Event Center",
    location: "Lekki Phase 1, Lagos",
    rating: 4.9,
    reviewCount: 128,
    imageUrl: "/images/hero-venue.png",
    verified: true,
    featured: true,
    instantBook: false,
    type: "Wedding",
    description: "Experience unparalleled luxury at The Monarch. Our grand ballroom features crystal chandeliers, state-of-the-art lighting, and acoustics designed for royalty. Perfect for weddings, galas, and high-profile concerts.",
    minPrice: 800000,
    maxCapacity: 1500,
    halls: [
      {
        id: "h1",
        name: "Grand Ballroom",
        capacity: 1500,
        price: 2500000,
        imageUrl: "/images/hero-venue.png",
        amenities: ["Air Conditioning", "Stage", "Sound System", "Changing Room", "Banquet Chairs", "Projector"],
        description: "The crown jewel of The Monarch, suitable for large weddings and concerts."
      },
      {
        id: "h2",
        name: "Royal Hall",
        capacity: 500,
        price: 800000,
        imageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1000",
        amenities: ["Air Conditioning", "Sound System", "Changing Room"],
        description: "A mid-sized hall perfect for receptions and corporate dinners."
      }
    ]
  },
  {
    id: "2",
    title: "TechPark Conference Hall",
    location: "Victoria Island, Lagos",
    rating: 4.7,
    reviewCount: 45,
    imageUrl: "/images/venue-conference.png",
    verified: true,
    featured: false,
    instantBook: true,
    type: "Conference",
    description: "Modern, sleek, and fully equipped for business. TechPark offers high-speed fiber internet, video conferencing facilities, and ergonomic seating for productive corporate events.",
    minPrice: 200000,
    maxCapacity: 300,
    halls: [
      {
        id: "h3",
        name: "Main Auditorium",
        capacity: 300,
        price: 850000,
        imageUrl: "/images/venue-conference.png",
        amenities: ["WiFi", "Projector", "Microphone", "Video Conferencing", "Whiteboard"],
        description: "Ideally suited for large conferences, seminars, and product launches."
      },
      {
        id: "h4",
        name: "Meeting Room A",
        capacity: 50,
        price: 200000,
        imageUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=1000",
        amenities: ["WiFi", "Whiteboard", "TV Screen"],
        description: "Perfect for board meetings and workshops."
      }
    ]
  },
  {
    id: "3",
    title: "Eden Garden Oasis",
    location: "Maitama, Abuja",
    rating: 4.8,
    reviewCount: 92,
    imageUrl: "/images/venue-garden.png",
    verified: true,
    featured: true,
    instantBook: false,
    type: "Party",
    description: "A lush, open-air sanctuary in the heart of the capital. Eden Garden Oasis provides a serene backdrop with manicured lawns and ambient lighting for outdoor celebrations.",
    minPrice: 450000,
    maxCapacity: 500,
    halls: [
       {
        id: "h5",
        name: "The Garden",
        capacity: 500,
        price: 450000,
        imageUrl: "/images/venue-garden.png",
        amenities: ["Outdoor Space", "Lighting", "Restrooms", "Generator"],
        description: "Open air garden space."
      }
    ]
  },
  {
    id: "4",
    title: "Royal Orchid Ballroom",
    location: "GRA, Port Harcourt",
    rating: 4.6,
    reviewCount: 34,
    imageUrl: "/images/venue-ballroom.png",
    verified: false,
    featured: false,
    instantBook: true,
    type: "Wedding",
    description: "Elegance meets affordability. The Royal Orchid Ballroom is a classic choice for receptions and dinners, featuring gold accents and premium drapery.",
    minPrice: 1200000,
    maxCapacity: 800,
    halls: [
       {
        id: "h6",
        name: "Main Ballroom",
        capacity: 800,
        price: 1200000,
        imageUrl: "/images/venue-ballroom.png",
        amenities: ["Air Conditioning", "Stage", "Changing Room", "Parking", "Catering Kitchen"],
        description: "Classic ballroom for weddings."
      }
    ]
  },
  {
    id: "5",
    title: "Skyline Rooftop Lounge",
    location: "Ikoyi, Lagos",
    rating: 4.9,
    reviewCount: 210,
    imageUrl: "https://images.unsplash.com/photo-1519671482538-518b5c2c681c?auto=format&fit=crop&q=80&w=1000",
    verified: true,
    featured: true,
    instantBook: false,
    type: "Party",
    description: "Breathtaking views of the Lagos skyline. This exclusive rooftop venue is perfect for VIP cocktail parties, product launches, and intimate gatherings.",
    minPrice: 1500000,
    maxCapacity: 150,
    halls: [
       {
        id: "h7",
        name: "Rooftop Terrace",
        capacity: 150,
        price: 1500000,
        imageUrl: "https://images.unsplash.com/photo-1519671482538-518b5c2c681c?auto=format&fit=crop&q=80&w=1000",
        amenities: ["Bar", "Sound System", "Valet Parking", "WiFi", "Lounge Furniture"],
        description: "Open air rooftop with city views."
      }
    ]
  },
  {
    id: "6",
    title: "Civic Innovation Hub",
    location: "Yaba, Lagos",
    rating: 4.5,
    reviewCount: 18,
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000",
    verified: true,
    featured: false,
    instantBook: true,
    type: "Conference",
    description: "A vibrant space for workshops and seminars. Located in the tech hub of Lagos, offering a creative atmosphere and flexible seating arrangements.",
    minPrice: 250000,
    maxCapacity: 80,
    halls: [
       {
        id: "h8",
        name: "Workshop Space",
        capacity: 80,
        price: 250000,
        imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000",
        amenities: ["WiFi", "Projector", "Whiteboard", "Coffee Station"],
        description: "Flexible seating for workshops."
      }
    ]
  }
];

export const POPULAR_LOCATIONS = [
  "Lagos", "Abuja", "Port Harcourt", "Ibadan", "Enugu"
];

export const AMENITIES_LIST = [
  "Air Conditioning", "Parking", "Security", "WiFi", "Projector", 
  "Sound System", "Generator", "Changing Room", "Wheelchair Access", 
  "Catering Service", "Bar", "Outdoor Space"
];
