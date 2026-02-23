import { db, pool } from "./db";
import { users, venues, halls, reviews } from "@shared/schema";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

const VENUE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "The Monarch Event Center": { lat: 6.435, lng: 3.475 },
  "TechPark Conference Hall": { lat: 6.437, lng: 3.42 },
  "Eden Garden Oasis": { lat: 9.082, lng: 7.493 },
  "Royal Orchid Ballroom": { lat: 4.81, lng: 7.035 },
  "Skyline Rooftop Lounge": { lat: 6.4488, lng: 3.43 },
  "Civic Innovation Hub": { lat: 6.513, lng: 3.378 },
  "Victoria Crown Plaza": { lat: 6.431, lng: 3.424 },
  "Abuja Continental": { lat: 9.0643, lng: 7.492 },
  "Port Harcourt Grand": { lat: 4.8156, lng: 7.0498 },
  "Yaba Arts Arena": { lat: 6.51, lng: 3.3775 },
};

export async function seedDatabase() {
  const result = await db.select({ count: sql<number>`count(*)` }).from(users);
  const userCount = Number(result[0].count);
  if (userCount > 0) {
    return;
  }

  console.log("Database is empty, seeding...");

  const passwordHash = await bcrypt.hash("Admin@2024!", 10);

  const [admin] = await db.insert(users).values({
    name: "Admin Eventsdey",
    email: "admin@eventsdey.com",
    phone: "+2349000000000",
    role: "admin",
    passwordHash,
  }).returning();

  const [holder] = await db.insert(users).values({
    name: "Lagos Venue Co",
    email: "holder@eventsdey.com",
    phone: "+2348111111111",
    role: "venue_holder",
    passwordHash,
    approved: true,
  }).returning();

  const [planner] = await db.insert(users).values({
    name: "Chinedu Okafor",
    email: "planner@eventsdey.com",
    phone: "+2348022222222",
    role: "planner",
    passwordHash,
  }).returning();

  const venueData = [
    {
      venue: {
        ownerUserId: holder.id,
        createdByAdmin: false,
        title: "The Monarch Event Center",
        description: "Experience unparalleled luxury at The Monarch. Our grand ballroom features crystal chandeliers, state-of-the-art lighting, and acoustics designed for royalty. Perfect for weddings, galas, and high-profile concerts.",
        address: "Plot 3, Lekki Phase 1",
        city: "Lagos",
        state: "Lagos",
        imageUrl: "/images/hero-venue.png",
        type: "Wedding",
        verified: true,
        featured: true,
        instantBook: false,
      },
      halls: [
        {
          name: "Grand Ballroom",
          description: "The crown jewel of The Monarch, suitable for large weddings and concerts with floor-to-ceiling windows and crystal chandeliers.",
          capacity: 1500,
          price: 2500000,
          imageUrl: "/images/hero-venue.png",
          amenities: ["Air Conditioning", "Stage", "Sound System", "Changing Room", "Banquet Chairs", "Projector"],
        },
        {
          name: "Royal Hall",
          description: "A mid-sized hall perfect for receptions and corporate dinners with elegant gold accents.",
          capacity: 500,
          price: 800000,
          imageUrl: "/images/venue-ballroom.png",
          amenities: ["Air Conditioning", "Sound System", "Changing Room"],
        },
      ]
    },
    {
      venue: {
        ownerUserId: holder.id,
        createdByAdmin: false,
        title: "TechPark Conference Hall",
        description: "Modern, sleek, and fully equipped for business. TechPark offers high-speed fiber internet, video conferencing facilities, and ergonomic seating for productive corporate events.",
        address: "Plot 5, Adeola Odeku St",
        city: "Lagos",
        state: "Lagos",
        imageUrl: "/images/venue-conference.png",
        type: "Conference",
        verified: true,
        featured: false,
        instantBook: true,
      },
      halls: [
        {
          name: "Main Auditorium",
          description: "Ideally suited for large conferences, seminars, and product launches.",
          capacity: 300,
          price: 850000,
          imageUrl: "/images/venue-conference.png",
          amenities: ["WiFi", "Projector", "Microphone", "Video Conferencing", "Whiteboard"],
        },
        {
          name: "Meeting Room A",
          description: "Perfect for board meetings and workshops, with a large TV screen and whiteboard.",
          capacity: 50,
          price: 200000,
          imageUrl: "/images/venue-conference.png",
          amenities: ["WiFi", "Whiteboard", "TV Screen"],
        },
      ]
    },
    {
      venue: {
        ownerUserId: holder.id,
        createdByAdmin: false,
        title: "Eden Garden Oasis",
        description: "A lush, open-air sanctuary in the heart of the capital. Eden Garden Oasis provides a serene backdrop with manicured lawns and ambient lighting for outdoor celebrations.",
        address: "Plot 2, Maitama District",
        city: "Abuja",
        state: "FCT",
        imageUrl: "/images/venue-garden.png",
        type: "Party",
        verified: true,
        featured: true,
        instantBook: false,
      },
      halls: [
        {
          name: "The Garden",
          description: "Open-air garden space with manicured lawns and ambient fairy-light lighting.",
          capacity: 500,
          price: 450000,
          imageUrl: "/images/venue-garden.png",
          amenities: ["Outdoor Space", "Lighting", "Restrooms", "Generator", "Tables & Chairs"],
        },
        {
          name: "VIP Pavilion",
          description: "Covered pavilion for smaller, intimate gatherings within the garden.",
          capacity: 100,
          price: 200000,
          imageUrl: "/images/venue-garden.png",
          amenities: ["Covered Area", "Lighting", "Restrooms"],
        },
      ]
    },
    {
      venue: {
        createdByAdmin: true,
        title: "Royal Orchid Ballroom",
        description: "Elegance meets affordability. The Royal Orchid Ballroom is a classic choice for receptions and dinners, featuring gold accents and premium drapery.",
        address: "16 GRA Road",
        city: "Port Harcourt",
        state: "Rivers",
        imageUrl: "/images/venue-ballroom.png",
        type: "Wedding",
        verified: false,
        featured: false,
        instantBook: true,
      },
      halls: [
        {
          name: "Main Ballroom",
          description: "Classic ballroom for weddings and receptions.",
          capacity: 800,
          price: 1200000,
          imageUrl: "/images/venue-ballroom.png",
          amenities: ["Air Conditioning", "Stage", "Changing Room", "Parking", "Catering Kitchen"],
        },
      ]
    },
    {
      venue: {
        ownerUserId: holder.id,
        createdByAdmin: false,
        title: "Skyline Rooftop Lounge",
        description: "Breathtaking views of the Lagos skyline. This exclusive rooftop venue is perfect for VIP cocktail parties, product launches, and intimate gatherings.",
        address: "22 Bourdillon Road",
        city: "Lagos",
        state: "Lagos",
        imageUrl: "/images/venue-garden.png",
        type: "Party",
        verified: true,
        featured: true,
        instantBook: false,
      },
      halls: [
        {
          name: "Rooftop Terrace",
          description: "Open-air rooftop with panoramic views of the city.",
          capacity: 150,
          price: 1500000,
          imageUrl: "/images/venue-garden.png",
          amenities: ["Bar", "Sound System", "Valet Parking", "WiFi", "Lounge Furniture"],
        },
      ]
    },
    {
      venue: {
        ownerUserId: holder.id,
        createdByAdmin: false,
        title: "Civic Innovation Hub",
        description: "A vibrant space for workshops and seminars. Located in the tech hub of Lagos, offering a creative atmosphere and flexible seating arrangements.",
        address: "45 Herbert Macaulay Way",
        city: "Lagos",
        state: "Lagos",
        imageUrl: "/images/venue-conference.png",
        type: "Conference",
        verified: true,
        featured: false,
        instantBook: true,
      },
      halls: [
        {
          name: "Workshop Space",
          description: "Flexible open floor plan with modular furniture.",
          capacity: 80,
          price: 250000,
          imageUrl: "/images/venue-conference.png",
          amenities: ["WiFi", "Projector", "Whiteboard", "Coffee Station"],
        },
      ]
    },
    {
      venue: {
        createdByAdmin: true,
        title: "Victoria Crown Plaza",
        description: "Premium multi-purpose event center on Victoria Island with state-of-the-art facilities and dedicated event coordinators.",
        address: "292 Ajose Adeogun St",
        city: "Lagos",
        state: "Lagos",
        imageUrl: "/images/hero-venue.png",
        type: "Wedding",
        verified: true,
        featured: true,
        instantBook: false,
      },
      halls: [
        {
          name: "Diamond Hall",
          description: "Our premier hall with 20ft ceilings and imported Italian marble floors.",
          capacity: 2000,
          price: 3500000,
          imageUrl: "/images/hero-venue.png",
          amenities: ["Air Conditioning", "Stage", "Sound System", "Generator", "Parking", "Changing Room", "Catering Kitchen"],
        },
        {
          name: "Pearl Suite",
          description: "Intimate setting with floor-to-ceiling windows overlooking the lagoon.",
          capacity: 200,
          price: 650000,
          imageUrl: "/images/venue-ballroom.png",
          amenities: ["Air Conditioning", "Sound System", "Projector", "WiFi"],
        },
        {
          name: "Emerald Boardroom",
          description: "Executive boardroom for corporate events and meetings.",
          capacity: 40,
          price: 150000,
          imageUrl: "/images/venue-conference.png",
          amenities: ["WiFi", "Projector", "Video Conferencing", "Whiteboard"],
        },
      ]
    },
    {
      venue: {
        createdByAdmin: true,
        title: "Abuja Continental",
        description: "The capital's most prestigious event space located in the heart of Wuse 2, offering world-class hospitality and event management.",
        address: "Plot 1233, Aminu Kano Crescent",
        city: "Abuja",
        state: "FCT",
        imageUrl: "/images/venue-ballroom.png",
        type: "Conference",
        verified: true,
        featured: false,
        instantBook: true,
      },
      halls: [
        {
          name: "Continental Hall",
          description: "Large conference hall with stadium seating and simultaneous translation booths.",
          capacity: 600,
          price: 1800000,
          imageUrl: "/images/venue-ballroom.png",
          amenities: ["Air Conditioning", "Projector", "Microphone", "WiFi", "Parking", "Wheelchair Access"],
        },
        {
          name: "Executive Lounge",
          description: "Stylish lounge for networking events and cocktail receptions.",
          capacity: 120,
          price: 400000,
          imageUrl: "/images/venue-garden.png",
          amenities: ["Bar", "Sound System", "WiFi", "Lounge Furniture"],
        },
      ]
    },
    {
      venue: {
        createdByAdmin: true,
        title: "Port Harcourt Grand",
        description: "The Garden City's finest event destination with lush landscaping and world-class amenities in the heart of GRA Phase 2.",
        address: "5 Aba Road, GRA Phase 2",
        city: "Port Harcourt",
        state: "Rivers",
        imageUrl: "/images/venue-garden.png",
        type: "Party",
        verified: false,
        featured: false,
        instantBook: false,
      },
      halls: [
        {
          name: "Garden Marquee",
          description: "Beautiful open-air marquee surrounded by tropical gardens.",
          capacity: 400,
          price: 700000,
          imageUrl: "/images/venue-garden.png",
          amenities: ["Outdoor Space", "Lighting", "Generator", "Parking", "Tables & Chairs"],
        },
      ]
    },
    {
      venue: {
        ownerUserId: holder.id,
        createdByAdmin: false,
        title: "Yaba Arts Arena",
        description: "Creative event space in the heart of Lagos tech scene. Perfect for product launches, art exhibitions, and unconventional gatherings.",
        address: "12 Herbert Macaulay Way",
        city: "Lagos",
        state: "Lagos",
        imageUrl: "/images/venue-conference.png",
        type: "Concert",
        verified: true,
        featured: false,
        instantBook: true,
      },
      halls: [
        {
          name: "Main Arena",
          description: "Industrial-chic open floor with exposed brick and adjustable lighting rigs.",
          capacity: 350,
          price: 500000,
          imageUrl: "/images/venue-conference.png",
          amenities: ["Sound System", "Stage", "Lighting", "Bar", "WiFi"],
          depositPercentage: 50,
          balanceDueDays: 14,
        },
        {
          name: "Gallery Room",
          description: "Intimate gallery space for art shows and small receptions.",
          capacity: 60,
          price: 150000,
          imageUrl: "/images/venue-conference.png",
          amenities: ["Lighting", "WiFi", "Display Walls"],
        },
      ]
    },
  ];

  for (const vd of venueData) {
    const coords = VENUE_COORDINATES[vd.venue.title] || {};
    const [v] = await db.insert(venues).values({
      ...vd.venue,
      lat: (coords as any).lat || null,
      lng: (coords as any).lng || null,
    }).returning();
    for (const h of vd.halls) {
      await db.insert(halls).values({ ...h, venueId: v.id });
    }
    const ratings = [4, 5, 5];
    const comments = [
      "Amazing venue! Everything was perfect for our wedding.",
      "Great service and beautiful space.",
      "Would definitely book again. The staff was incredible.",
    ];
    for (let i = 0; i < 3; i++) {
      await db.insert(reviews).values({
        venueId: v.id,
        plannerUserId: planner.id,
        rating: ratings[i],
        comment: comments[i],
      });
    }
  }

  console.log("Seed complete!");
  console.log("Admin: admin@eventsdey.com / Admin@2024!");
  console.log("Venue Holder: holder@eventsdey.com / Admin@2024!");
  console.log("Planner: planner@eventsdey.com / Admin@2024!");
}

const isDirectRun = process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js");
if (isDirectRun) {
  seedDatabase()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
