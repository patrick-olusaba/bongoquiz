export interface LeaderboardEntry {
    id: string;
    name: string;
    phone: string;
    pts: number;
    date: string;
}

export function getLeaderboard(): LeaderboardEntry[] {
    try {
        const data = localStorage.getItem('sudokuLeaderboard');
        if (data) {
            const parsed = JSON.parse(data) as LeaderboardEntry[];
            // Filter out any previously saved mock data
            const validEntries = parsed.filter(item => !String(item.id).includes('-mock'));

            // If we filtered out mock data, update the local storage to keep it clean
            if (validEntries.length !== parsed.length) {
                localStorage.setItem('sudokuLeaderboard', JSON.stringify(validEntries));
            }

            return validEntries;
        }
    } catch (error) {
        console.error('Failed to fetch leaderboard', error);
    }

    return [];
}

export function saveScoreToLeaderboard(name: string, phone: string, pts: number) {
    if (!name) return;
    const lb = getLeaderboard();

    // check if player exists
    const existingIndex = lb.findIndex(p => p.name === name);
    if (existingIndex >= 0) {
        // Only update if the new score is higher
        if (pts > lb[existingIndex].pts) {
            lb[existingIndex].pts = pts;
            lb[existingIndex].date = new Date().toLocaleDateString();
        }
    } else {
        // Hide last 6 digits of phone for privacy on leaderboard if they want, but let's just use it
        lb.push({
            id: Date.now().toString(),
            name,
            phone,
            pts,
            date: new Date().toLocaleDateString()
        });
    }

    lb.sort((a, b) => b.pts - a.pts);
    try {
        localStorage.setItem('sudokuLeaderboard', JSON.stringify(lb));
    } catch (error) {
        console.error('Failed to save score', error);
    }
}
