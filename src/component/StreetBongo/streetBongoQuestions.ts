export type StreetBongoCategory =
    | "general"
    | "sports"
    | "carLogos"
    | "brandLogos"
    | "trick"
    | "kenya"
    | "random";

export type StreetBongoDifficulty = "easy" | "medium" | "hard";

export interface StreetBongoQuestion {
    id: string;
    category: Exclude<StreetBongoCategory, "random">;
    prompt: string;
    options: string[];
    answer: string;
    difficulty?: StreetBongoDifficulty;
    visual?: string;
    visualImageUrl?: string;
}

export const STREET_BONGO_CATEGORIES: {
    id: StreetBongoCategory;
    label: string;
    icon: string;
    description: string;
}[] = [
    {id: "general", label: "General Knowledge", icon: "🧠", description: "Easy-to-medium trivia"},
    {id: "sports", label: "Sports", icon: "⚽", description: "Football and athletics"},
    {id: "carLogos", label: "Car Logos", icon: "🚗", description: "Visual logo guesses"},
    {id: "brandLogos", label: "Brand Logos", icon: "🏷️", description: "Fast brand recognition"},
    {id: "trick", label: "Trick Questions", icon: "😂", description: "Street clip moments"},
    {id: "kenya", label: "Kenya Trivia", icon: "🇰🇪", description: "Local viral questions"},
    {id: "random", label: "Random Mix", icon: "🎲", description: "Mixed challenge"},
];

export const DEFAULT_STREET_BONGO_QUESTIONS: StreetBongoQuestion[] = [
    {
        id: "general-capital-ke",
        category: "general",
        prompt: "What is the capital city of Kenya?",
        options: ["Kisumu", "Nairobi", "Nakuru", "Eldoret"],
        answer: "Nairobi",
    },
    {
        id: "general-planet",
        category: "general",
        prompt: "Which planet is known as the Red Planet?",
        options: ["Venus", "Mars", "Jupiter", "Mercury"],
        answer: "Mars",
    },
    {
        id: "general-water",
        category: "general",
        prompt: "How many days are in a leap year?",
        options: ["365", "366", "364", "360"],
        answer: "366",
    },
    {
        id: "sports-worldcup",
        category: "sports",
        prompt: "How many players does one football team have on the pitch?",
        options: ["9", "10", "11", "12"],
        answer: "11",
    },
    {
        id: "sports-eliud",
        category: "sports",
        prompt: "Which Kenyan athlete is famous for marathon running?",
        options: ["David Rudisha", "Eliud Kipchoge", "Victor Wanyama", "Collins Injera"],
        answer: "Eliud Kipchoge",
    },
    {
        id: "sports-arsenal",
        category: "sports",
        prompt: "Which sport is Arsenal FC known for?",
        options: ["Rugby", "Football", "Cricket", "Basketball"],
        answer: "Football",
    },
    {
        id: "car-toyota",
        category: "carLogos",
        prompt: "Which car brand uses three overlapping ovals in its logo?",
        options: ["Toyota", "Nissan", "Mazda", "Subaru"],
        answer: "Toyota",
        visual: "TOYOTA",
    },
    {
        id: "car-bmw",
        category: "carLogos",
        prompt: "Which car brand has a blue and white circular badge?",
        options: ["BMW", "Audi", "Volkswagen", "Mercedes-Benz"],
        answer: "BMW",
        visual: "BMW",
    },
    {
        id: "car-subaru",
        category: "carLogos",
        prompt: "Which car brand logo has stars in an oval?",
        options: ["Subaru", "Honda", "Ford", "Peugeot"],
        answer: "Subaru",
        visual: "SUBARU",
    },
    {
        id: "brand-nike",
        category: "brandLogos",
        prompt: "Which brand is known for the swoosh logo?",
        options: ["Adidas", "Nike", "Puma", "Reebok"],
        answer: "Nike",
        visual: "SWOOSH",
    },
    {
        id: "brand-safaricom",
        category: "brandLogos",
        prompt: "Which Kenyan brand is closely linked with M-Pesa?",
        options: ["Airtel", "Telkom", "Safaricom", "Equity"],
        answer: "Safaricom",
        visual: "M-PESA",
    },
    {
        id: "brand-kfc",
        category: "brandLogos",
        prompt: "Which food brand is famous for fried chicken and Colonel Sanders?",
        options: ["KFC", "Burger King", "Subway", "Pizza Hut"],
        answer: "KFC",
        visual: "KFC",
    },
    {
        id: "trick-months",
        category: "trick",
        prompt: "How many months have 28 days?",
        options: ["1", "2", "6", "12"],
        answer: "12",
    },
    {
        id: "trick-before-everest",
        category: "trick",
        prompt: "Before Mount Everest was discovered, what was the highest mountain?",
        options: ["Mount Kenya", "Kilimanjaro", "Mount Everest", "K2"],
        answer: "Mount Everest",
    },
    {
        id: "trick-race",
        category: "trick",
        prompt: "If you overtake the person in second place, what place are you in?",
        options: ["First", "Second", "Third", "Last"],
        answer: "Second",
    },
    {
        id: "kenya-tea",
        category: "kenya",
        prompt: "Which county is strongly known for tea farming?",
        options: ["Mombasa", "Kericho", "Turkana", "Garissa"],
        answer: "Kericho",
    },
    {
        id: "kenya-mobile-money",
        category: "kenya",
        prompt: "Which app/service is commonly used for mobile money in Kenya?",
        options: ["M-Pesa", "PayPal", "Venmo", "Cash App"],
        answer: "M-Pesa",
    },
    {
        id: "kenya-slang",
        category: "kenya",
        prompt: "In Sheng, what does kuomoka usually mean?",
        options: ["To get rich", "To sleep", "To run", "To cook"],
        answer: "To get rich",
    },
];
