
export interface CellState {
    id: number;
    x: number;
    y: number;
    value: number;
    isRevealed: boolean;
    revealedBy?: string;
    revealedAt?: Date;
    prizeItem?: PrizeItem;
}

export interface PrizeItem {
    id: number;
    name: string;
    img: string;
    description?: string; // Optional description
    effect?: string; // Optional game effect
}

// Import all the prize images
import BonusTime from "../assets/Items/BonusTime.png";
import Disqualified from "../assets/Items/Disqualified.png";
import DoubleOrNothing from "../assets/Items/DoubleorNothing.png";
import DoublePoints from "../assets/Items/DoublePoints2.png";
import FreezeFrame from "../assets/Items/FreezeFrame.png";
import Insurance from "../assets/Items/insurance.png";
import NoPenalty from "../assets/Items/nopenalty.png";
import PointGamble from "../assets/Items/PointGamble.png";
import QuestionSwap from "../assets/Items/questionswap.png";
import SecondChance from "../assets/Items/secondchance.png";
import TimeTax from '../assets/Items/TimeTax.png';

// Master list of all available prize items
export const PRIZE_ITEMS: PrizeItem[] = [
    { id: 1, name: "Bonus Time", img: BonusTime, description: "Extra time added to your turn" },
    { id: 2, name: "Disqualified", img: Disqualified, description: "You are disqualified from this round" },
    { id: 3, name: "Double Or Nothing", img: DoubleOrNothing, description: "Risk your points for double or nothing" },
    { id: 4, name: "Double Points", img: DoublePoints, description: "Earn double points for your next answer" },
    { id: 5, name: "Freeze Frame", img: FreezeFrame, description: "Freeze another player's turn" },
    { id: 6, name: "Insurance", img: Insurance, description: "Protect your points from being stolen" },
    { id: 7, name: "No Penalty", img: NoPenalty, description: "Avoid penalty for wrong answer" },
    { id: 8, name: "Point Gamble", img: PointGamble, description: "Gamble your points on the next question" },
    { id: 9, name: "Question Swap", img: QuestionSwap, description: "Swap the current question" },
    { id: 10, name: "Second Chance", img: SecondChance, description: "Get a second chance on wrong answer" },
    { id: 11, name: "Time Tax", img: TimeTax, description: "Pay time penalty for advantage" }
];

// Custom list 1: Classic Mix
export const CUSTOM_PRIZE_LIST_1: PrizeItem[] = [
    PRIZE_ITEMS.find(item => item.name === "Double Points")!,
    PRIZE_ITEMS.find(item => item.name === "Second Chance")!,
    PRIZE_ITEMS.find(item => item.name === "Insurance")!,
    PRIZE_ITEMS.find(item => item.name === "Freeze Frame")!,
    PRIZE_ITEMS.find(item => item.name === "No Penalty")!,
    PRIZE_ITEMS.find(item => item.name === "Bonus Time")!,
    PRIZE_ITEMS.find(item => item.name === "Question Swap")!,
    PRIZE_ITEMS.find(item => item.name === "Point Gamble")!,
    PRIZE_ITEMS.find(item => item.name === "Time Tax")!,
];

// Custom list 2: High Risk
export const CUSTOM_PRIZE_LIST_2: PrizeItem[] = [
    PRIZE_ITEMS.find(item => item.name === "Double Or Nothing")!,
    PRIZE_ITEMS.find(item => item.name === "Point Gamble")!,
    PRIZE_ITEMS.find(item => item.name === "Double Points")!,
    PRIZE_ITEMS.find(item => item.name === "Steal A Point")!,
    PRIZE_ITEMS.find(item => item.name === "Time Tax")!,
    PRIZE_ITEMS.find(item => item.name === "Freeze Frame")!,
];

// Custom list 3: Friendly Game
export const CUSTOM_PRIZE_LIST_3: PrizeItem[] = [
    PRIZE_ITEMS.find(item => item.name === "Bonus Time")!,
    PRIZE_ITEMS.find(item => item.name === "Second Chance")!,
    PRIZE_ITEMS.find(item => item.name === "No Penalty")!,
    PRIZE_ITEMS.find(item => item.name === "Insurance")!,
    PRIZE_ITEMS.find(item => item.name === "Double Points")!,
    PRIZE_ITEMS.find(item => item.name === "Question Swap")!,
    PRIZE_ITEMS.find(item => item.name === "Time Tax")!,
    PRIZE_ITEMS.find(item => item.name === "Freeze Frame")!,
];

export const getRandomPrizeItems = (count: number = 8): PrizeItem[] => {
    const allItems = [...CUSTOM_PRIZE_LIST_1];

    for (let i = allItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
    }

    return allItems.slice(0, count);
};


export const CELL_GRADIENT_COLORS = [
    ['#0A82E8', '#02469f'],
    ['#9556CE', '#5f027c'],
    ['#5f6372', '#1c202a'],
    ['#F9A825', '#ffdd00'],
    ['#0e9b15', '#00ff13'],
    ['#FBC02D', '#F57F17'],
    ['#0754a1', '#0050ff'],
    ['#7B1FA2', '#bf00ff'],
];