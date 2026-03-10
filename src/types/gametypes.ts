// gametypes.ts — types, questions, and constants for the Bongo Quiz game

export type GameScreen =
    | "home"
    | "box_select"
    | "power_reveal"
    | "round1"
    | "round1_result"
    | "round2_category"
    | "round2_question"
    | "round2_result"
    | "round3_spin"
    | "round3_question"
    | "final_result"
    | "leaderboard"
    | "transition_r1"
    | "transition_r2"
    | "transition_r3";

export interface Question {
    q: string;
    options: string[];
    answer: number;
}

export const POWER_DESC: Record<string, string> = {
    "Bonus Time":                "⏱ +30 seconds added to your Round 1 timer.",
    "Borrowed Brain":            "🧠 Reveals the correct answer hint once during Round 2.",
    "Disqualified":              "💀 You lose 200 points at the end of Round 2.",
    "Double Or Nothing":         "🎲 Get ALL Round 2 questions right → score doubles. Any wrong → score resets to 0.",
    "Double Points":             "✨ Your entire Round 1 score is doubled!",
    "Freeze Frame":              "❄️ Pause the Round 1 timer once for 15 seconds.",
    "Insurance":                 "🛡️ Protects you from the worst negative power effects.",
    "Mirror Effect":             "🪞 Your Round 1 score is added as a bonus on top of Round 2.",
    "No Penalty":                "🟢 Wrong answers are completely safe — no penalties at all.",
    "Point Chance Brain":        "🎰 50% chance to triple your Round 2 score at the end.",
    "Point Gamble":              "🃏 50/50: your Round 2 score either doubles or is halved.",
    "Question Swap":             "🔀 Skip one Round 2 question with no penalty.",
    "Second Chance":             "🔄 Get one retry on a wrong answer in Round 2.",
    "Steal A Point":             "🥷 +50 bonus points added at the end of Round 2.",
    "Sudden Death Disqualified": "💣 First wrong answer in Round 2 ends the round immediately!",
    "Swap Fate":                 "🌀 Your final Round 2 score is randomised ±30%.",
    "Time Tax":                  "💸 Round 1 timer −20 s, but you receive +200 bonus points.",
};

export const R1_QUESTIONS: Question[] = [
    { q: "What is the capital of Kenya?", options: ["Mombasa", "Nairobi", "Kisumu", "Nakuru"], answer: 1 },
    { q: "How many sides does a hexagon have?", options: ["5", "6", "7", "8"], answer: 1 },
    { q: "What is 12 × 12?", options: ["124", "144", "132", "148"], answer: 1 },
    { q: "Which planet is known as the Red Planet?", options: ["Venus", "Saturn", "Mars", "Jupiter"], answer: 2 },
    { q: "What language is spoken in Brazil?", options: ["Spanish", "Portuguese", "French", "English"], answer: 1 },
    { q: "In which year did World War II end?", options: ["1943", "1944", "1945", "1946"], answer: 2 },
    { q: "Who wrote Romeo and Juliet?", options: ["Dickens", "Shakespeare", "Hemingway", "Orwell"], answer: 1 },
    { q: "What is the fastest land animal?", options: ["Lion", "Leopard", "Cheetah", "Horse"], answer: 2 },
    { q: "How many bones are in the adult human body?", options: ["196", "206", "216", "226"], answer: 1 },
    { q: "What is the chemical symbol for water?", options: ["WO", "HO", "H2O", "W2O"], answer: 2 },
    { q: "What colour is a flamingo?", options: ["White", "Pink", "Orange", "Yellow"], answer: 1 },
    { q: "Which ocean is the largest?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], answer: 3 },
    { q: "How many continents are there on Earth?", options: ["5", "6", "7", "8"], answer: 2 },
    { q: "What is the currency of Japan?", options: ["Yuan", "Won", "Yen", "Ringgit"], answer: 2 },
    { q: "Which gas do plants absorb from the air?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], answer: 1 },
    { q: "How many hours are in a day?", options: ["12", "20", "24", "48"], answer: 2 },
    { q: "What is the smallest continent?", options: ["Europe", "Antarctica", "Australia", "South America"], answer: 2 },
    { q: "Which country is the largest by area?", options: ["USA", "China", "Canada", "Russia"], answer: 3 },
    { q: "What is the boiling point of water in Celsius?", options: ["90°", "95°", "100°", "110°"], answer: 2 },
    { q: "How many players are on a football (soccer) team?", options: ["9", "10", "11", "12"], answer: 2 },
    { q: "What is the largest organ in the human body?", options: ["Heart", "Liver", "Lungs", "Skin"], answer: 3 },
    { q: "Which animal is known as the Ship of the Desert?", options: ["Horse", "Camel", "Donkey", "Elephant"], answer: 1 },
    { q: "How many days are in a leap year?", options: ["364", "365", "366", "367"], answer: 2 },
    { q: "What colour is the centre of a rainbow?", options: ["Red", "Blue", "Green", "Yellow"], answer: 3 },
    { q: "Which instrument has 88 keys?", options: ["Guitar", "Violin", "Piano", "Harp"], answer: 2 },
    { q: "What is the capital of France?", options: ["Lyon", "Marseille", "Paris", "Bordeaux"], answer: 2 },
    { q: "How many legs does a spider have?", options: ["6", "8", "10", "12"], answer: 1 },
    { q: "Which is the tallest mountain in the world?", options: ["K2", "Kangchenjunga", "Mount Everest", "Lhotse"], answer: 2 },
    { q: "What does HTTP stand for?", options: ["HyperText Transfer Protocol", "High Tech Transfer Program", "HyperText Transmission Process", "High Transfer Text Protocol"], answer: 0 },
    { q: "In which direction does the sun rise?", options: ["West", "North", "South", "East"], answer: 3 },
    { q: "How many seconds are in one minute?", options: ["30", "45", "60", "100"], answer: 2 },
];

export const CATEGORIES = ["Sport", "Religion", "Food", "Kenyan History", "Entertainment", "Science", "Geography", "General Knowledge"] as const;
export type Category = typeof CATEGORIES[number];

export const CATEGORY_META: Record<Category, { icon: string; color: string }> = {
    Sport:            { icon: "⚽", color: "#4d96ff" },
    Religion:         { icon: "🙏", color: "#a29bfe" },
    Food:             { icon: "🍽️", color: "#fd79a8" },
    "Kenyan History": { icon: "🇰🇪", color: "#00b894" },
    Entertainment:      { icon: "🎬", color: "#fdcb6e" },
    Science:            { icon: "🔬", color: "#00cec9" },
    Geography:          { icon: "🌍", color: "#55efc4" },
    "General Knowledge": { icon: "🧠", color: "#e17055" },
};

export const R2_QUESTIONS: Record<Category, Question[]> = {
    Sport: [
        { q: "How many players are on a standard football team?", options: ["9", "10", "11", "12"], answer: 2 },
        { q: "In which sport do you perform a slam dunk?", options: ["Volleyball", "Basketball", "Handball", "Tennis"], answer: 1 },
        { q: "Which country won the 2018 FIFA World Cup?", options: ["Brazil", "Germany", "France", "Argentina"], answer: 2 },
        { q: "What sport is played at Wimbledon?", options: ["Cricket", "Badminton", "Tennis", "Golf"], answer: 2 },
        { q: "How many players are on a basketball team on court?", options: ["4", "5", "6", "7"], answer: 1 },
    ],
    Religion: [
        { q: "How many pillars of Islam are there?", options: ["3", "4", "5", "6"], answer: 2 },
        { q: "What is the holy book of Christianity?", options: ["Quran", "Torah", "Gita", "Bible"], answer: 3 },
        { q: "Who is considered the founder of Buddhism?", options: ["Confucius", "Siddhartha Gautama", "Lao Tzu", "Mahavira"], answer: 1 },
        { q: "What is the holiest city in Islam?", options: ["Jerusalem", "Medina", "Mecca", "Cairo"], answer: 2 },
        { q: "How many books are in the Protestant Old Testament?", options: ["29", "33", "39", "45"], answer: 2 },
    ],
    Food: [
        { q: "What is the main ingredient in guacamole?", options: ["Tomato", "Avocado", "Lime", "Pepper"], answer: 1 },
        { q: "Ugali in Kenya is made from which flour?", options: ["Wheat", "Rice", "Maize", "Cassava"], answer: 2 },
        { q: "Which fruit is known as the king of fruits?", options: ["Mango", "Durian", "Jackfruit", "Papaya"], answer: 1 },
        { q: "What gas makes fizzy drinks bubbly?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Helium"], answer: 2 },
        { q: "Nyama Choma refers to what type of food?", options: ["Grilled meat", "Stewed vegetables", "Fried fish", "Roasted maize"], answer: 0 },
    ],
    "Kenyan History": [
        { q: "In what year did Kenya gain independence?", options: ["1960", "1962", "1963", "1965"], answer: 2 },
        { q: "Who was Kenya's first president?", options: ["Daniel arap Moi", "Jomo Kenyatta", "Raila Odinga", "Kibaki"], answer: 1 },
        { q: "What was the name of the freedom movement against colonial rule?", options: ["Mau Mau", "ANC", "KANU", "ZANU"], answer: 0 },
        { q: "Which city is the capital of Kenya?", options: ["Mombasa", "Kisumu", "Nairobi", "Nakuru"], answer: 2 },
        { q: "What is the national language of Kenya alongside English?", options: ["Kikuyu", "Luo", "Swahili", "Kamba"], answer: 2 },
    ],
    Entertainment: [
        { q: "Who sang 'Wamlambez'?", options: ["Sauti Sol", "Sailors Gang", "Burna Boy", "Diamond"], answer: 1 },
        { q: "Which streaming platform produces 'Squid Game'?", options: ["HBO", "Disney+", "Netflix", "Amazon Prime"], answer: 2 },
        { q: "Which Kenyan musician is known as 'the King of Benga'?", options: ["Ayub Ogada", "D.O. Misiani", "Daudi Kabaka", "John De'Mathew"], answer: 1 },
        { q: "How many seasons does 'Money Heist' have?", options: ["3", "4", "5", "6"], answer: 2 },
        { q: "What genre is Afrobeats?", options: ["Classical", "African pop music", "Jazz", "Blues"], answer: 1 },
    ],
Science: [
    { q: "What planet is closest to the Sun?", options: ["Venus", "Earth", "Mercury", "Mars"], answer: 2 },
    { q: "What is the chemical symbol for gold?", options: ["Go", "Gd", "Au", "Ag"], answer: 2 },
    { q: "How many chromosomes do humans have?", options: ["23", "44", "46", "48"], answer: 2 },
    { q: "What force keeps planets in orbit around the Sun?", options: ["Magnetism", "Gravity", "Friction", "Inertia"], answer: 1 },
    { q: "What is the speed of light (approx)?", options: ["100,000 km/s", "200,000 km/s", "300,000 km/s", "400,000 km/s"], answer: 2 },
],
    Geography: [
    { q: "Which is the longest river in Africa?", options: ["Congo", "Niger", "Zambezi", "Nile"], answer: 3 },
    { q: "Which country has the most natural lakes?", options: ["USA", "Russia", "Canada", "Brazil"], answer: 2 },
    { q: "What is the capital of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Brisbane"], answer: 2 },
    { q: "Which desert is the largest in the world?", options: ["Gobi", "Sahara", "Arabian", "Antarctic"], answer: 3 },
    { q: "On which continent is the Amazon rainforest?", options: ["Africa", "Asia", "South America", "North America"], answer: 2 },
],
    "General Knowledge": [
    { q: "How many sides does a pentagon have?", options: ["4", "5", "6", "7"], answer: 1 },
    { q: "What is the most spoken language in the world?", options: ["English", "Spanish", "Mandarin Chinese", "Hindi"], answer: 2 },
    { q: "Who painted the Mona Lisa?", options: ["Michelangelo", "Raphael", "Leonardo da Vinci", "Donatello"], answer: 2 },
    { q: "How many strings does a standard guitar have?", options: ["4", "5", "6", "7"], answer: 2 },
    { q: "What is the hardest natural substance on Earth?", options: ["Gold", "Iron", "Diamond", "Quartz"], answer: 2 },
],
};

export const R3_QUESTIONS: Question[] = [
    { q: "What is 15% of 200?", options: ["25", "30", "35", "40"], answer: 1 },
    { q: "Which continent is Egypt in?", options: ["Asia", "Europe", "Africa", "Middle East"], answer: 2 },
    { q: "What is the square root of 144?", options: ["10", "11", "12", "13"], answer: 2 },
    { q: "Who invented the telephone?", options: ["Edison", "Tesla", "Bell", "Morse"], answer: 2 },
    { q: "How many minutes are in a day?", options: ["1200", "1440", "1500", "1380"], answer: 1 },
    { q: "What is the longest river in the world?", options: ["Amazon", "Congo", "Nile", "Yangtze"], answer: 2 },
    { q: "How many colors are in a rainbow?", options: ["5", "6", "7", "8"], answer: 2 },
    { q: "What sport does Eliud Kipchoge play?", options: ["Football", "Basketball", "Long-distance running", "Boxing"], answer: 2 },
];

export interface WheelSegment {
    label: string;
    points: number;
    color: string;
}

export const WHEEL_SEGMENTS: WheelSegment[] = [
    { label: "+100",  points: 100,  color: "#e74c3c" },
    { label: "+250",  points: 250,  color: "#e67e22" },
    { label: "+500",  points: 500,  color: "#f1c40f" },
    { label: "+50",   points: 50,   color: "#2ecc71" },
    { label: "+750",  points: 750,  color: "#3498db" },
    { label: "+150",  points: 150,  color: "#9b59b6" },
    { label: "+1000", points: 1000, color: "#1abc9c" },
    { label: "+200",  points: 200,  color: "#e91e63" },
];

export function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}