// useQuestions.ts — fetch questions from Firestore
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
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

const mapQ = (d: any) => d.question ?? d.q ?? "";

export function useR1Questions() {
    const [qs,      setQs]      = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRound("r1")
            .then(docs => {
                const source = docs.length > 0
                    ? docs.map(d => ({ q: mapQ(d), options: d.options, answer: d.correct }))
                    : R1_QUESTIONS;
                setQs(shuffle(source));
            })
            .catch(() => setQs(shuffle(R1_QUESTIONS)))
            .finally(() => setLoading(false));
    }, []);

    return { questions: qs, loading };
}

export function useR2Questions() {
    const [qs,      setQs]      = useState<{ q: string; options: string[]; answer: number; category: Category }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fallback = () => {
            const all: { q: string; options: string[]; answer: number; category: Category }[] = [];
            for (const [cat, arr] of Object.entries(R2_QUESTIONS))
                arr.forEach(q => all.push({ ...q, category: cat as Category }));
            return shuffle(all);
        };

        fetchRound("r2")
            .then(docs => setQs(docs.length > 0
                ? shuffle(docs.map(d => ({ q: mapQ(d), options: d.options, answer: d.correct, category: d.category as Category })))
                : fallback()))
            .catch(() => setQs(fallback()))
            .finally(() => setLoading(false));
    }, []);

    return { questions: qs, loading };
}

export function useR3Questions() {
    const [qs,      setQs]      = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRound("r3")
            .then(docs => {
                const source = docs.length > 0
                    ? docs.map(d => ({ q: mapQ(d), options: d.options, answer: d.correct }))
                    : R3_QUESTIONS;
                setQs(shuffle(source));
            })
            .catch(() => setQs(shuffle(R3_QUESTIONS)))
            .finally(() => setLoading(false));
    }, []);

    return { questions: qs, loading };
}
