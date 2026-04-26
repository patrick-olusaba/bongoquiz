// useQuestions.ts — fetch questions from Firestore, one at a time for security
import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../firebase.ts";
import { type Question, type Category, shuffle,
         R1_QUESTIONS, R2_QUESTIONS, R3_QUESTIONS } from "../types/gametypes.ts";

type Round = "r1" | "r2" | "r3";

const cache: Partial<Record<Round, any[]>> = {};
export function clearQuestionsCache() { (Object.keys(cache) as Round[]).forEach(k => delete cache[k]); }

async function fetchRound(round: Round) {
    if (cache[round] !== undefined) return cache[round]!;
    const snap = await getDocs(query(collection(db, "questions"), where("round", "==", round)));
    const docs = snap.docs.map(d => d.data()).filter(d => d.active !== false);
    if (docs.length > 0) cache[round] = docs;
    return docs;
}

// Fetch single question by index (more secure - only loads what's needed)
async function fetchSingleQuestion(round: Round, index: number): Promise<Question | null> {
    try {
        const snap = await getDocs(
            query(
                collection(db, "questions"), 
                where("round", "==", round),
                where("active", "!=", false),
                limit(1)
            )
        );
        
        if (snap.empty) return null;
        
        // Get random question from available ones
        const docs = snap.docs.map(d => d.data());
        const randomDoc = docs[Math.floor(Math.random() * docs.length)];
        
        return {
            q: randomDoc.question,
            options: randomDoc.options,
            answer: randomDoc.correct
        };
    } catch {
        return null;
    }
}

export function useR1Questions() {
    const [qs,      setQs]      = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    
    const loadNextQuestion = useCallback(async () => {
        const q = await fetchSingleQuestion("r1", qs.length);
        if (q) {
            setQs(prev => [...prev, q]);
            return true;
        }
        return false;
    }, [qs.length]);
    
    useEffect(() => {
        // Load initial batch for smooth start
        fetchRound("r1").then(docs => {
            const source = docs.length > 0 ? docs.map(d => ({ q: d.question, options: d.options, answer: d.correct })) : R1_QUESTIONS;
            setQs(shuffle(source));
        }).catch(() => setQs(shuffle(R1_QUESTIONS)))
          .finally(() => setLoading(false));
    }, []);
    
    return { questions: qs, loading, loadNextQuestion };
}

export function useR2Questions() {
    const [qs,      setQs]      = useState<{ q: string; options: string[]; answer: number; category: Category }[]>([]);
    const [loading, setLoading] = useState(true);
    
    const loadNextQuestion = useCallback(async () => {
        const q = await fetchSingleQuestion("r2", qs.length);
        if (q && 'category' in q) {
            setQs(prev => [...prev, q as any]);
            return true;
        }
        return false;
    }, [qs.length]);
    
    useEffect(() => {
        fetchRound("r2").then(docs => {
            if (docs.length > 0) {
                setQs(shuffle(docs.map(d => ({ q: d.question, options: d.options, answer: d.correct, category: d.category as Category }))));
            } else {
                const all: { q: string; options: string[]; answer: number; category: Category }[] = [];
                for (const [cat, arr] of Object.entries(R2_QUESTIONS))
                    arr.forEach(q => all.push({ ...q, category: cat as Category }));
                setQs(shuffle(all));
            }
        }).catch(() => {
            const all: { q: string; options: string[]; answer: number; category: Category }[] = [];
            for (const [cat, arr] of Object.entries(R2_QUESTIONS))
                arr.forEach(q => all.push({ ...q, category: cat as Category }));
            setQs(shuffle(all));
        }).finally(() => setLoading(false));
    }, []);
    
    return { questions: qs, loading, loadNextQuestion };
}

export function useR3Questions() {
    const [qs,      setQs]      = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    
    const loadNextQuestion = useCallback(async () => {
        const q = await fetchSingleQuestion("r3", qs.length);
        if (q) {
            setQs(prev => [...prev, q]);
            return true;
        }
        return false;
    }, [qs.length]);
    
    useEffect(() => {
        fetchRound("r3").then(docs => {
            const source = docs.length > 0 ? docs.map(d => ({ q: d.question, options: d.options, answer: d.correct })) : R3_QUESTIONS;
            setQs(shuffle(source));
        }).catch(() => setQs(shuffle(R3_QUESTIONS)))
          .finally(() => setLoading(false));
    }, []);
    
    return { questions: qs, loading, loadNextQuestion };
}
