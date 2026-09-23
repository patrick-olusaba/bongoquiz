import type {LevelData, Point, LevelNode} from '../types';

function getNeighbors(r: number, c: number, rows: number, cols: number): Point[] {
    const list: Point[] = [];
    if (r > 0) list.push({ r: r - 1, c });
    if (r < rows - 1) list.push({ r: r + 1, c });
    if (c > 0) list.push({ r, c: c - 1 });
    if (c < cols - 1) list.push({ r, c: c + 1 });

    // random shuffle
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
}

export function generateLevel(level: number, stage: number): LevelData {
    // Start at 5x5, gradually increase size based on level and stage
    // Cap at 10x10 to prevent performance issues
    const baseSize = 5;
    const sizeCalc = baseSize + ((level - 1) * 2) + Math.floor((stage - 1) / 2);
    const size = Math.min(12, sizeCalc);

    const rows = size;
    const cols = size;

    const totalCells = rows * cols;

    let path: Point[] = [];
    const visited = new Array(rows * cols).fill(false);

    let iterations = 0;
    const MAX_ITERATIONS = 50000;

    function getDegree(r: number, c: number): number {
        let deg = 0;
        const neighbors = getNeighbors(r, c, rows, cols);
        for (const n of neighbors) {
            if (!visited[n.r * cols + n.c]) deg++;
        }
        return deg;
    }

    function dfs(r: number, c: number, step: number): boolean {
        iterations++;
        path.push({ r, c });
        visited[r * cols + c] = true;

        if (step === totalCells) return true;

        const neighbors = getNeighbors(r, c, rows, cols);
        const validNeighbors = neighbors.filter(n => !visited[n.r * cols + n.c]);

        // Warnsdorff's heuristic: prefer neighbors with fewer remaining unvisited neighbors
        // Randomize ties
        validNeighbors.sort((a, b) => {
            const degA = getDegree(a.r, a.c);
            const degB = getDegree(b.r, b.c);
            if (degA !== degB) return degA - degB;
            return Math.random() - 0.5;
        });

        for (const n of validNeighbors) {
            if (iterations > MAX_ITERATIONS) return false;
            if (dfs(n.r, n.c, step + 1)) return true;
        }

        path.pop();
        visited[r * cols + c] = false;
        return false;
    }

    // Choose start so that parity matches for odd grid sizes
    let startR = Math.floor(Math.random() * rows);
    let startC = Math.floor(Math.random() * cols);
    if ((rows * cols) % 2 === 1) {
        while ((startR + startC) % 2 !== 0) {
            startR = Math.floor(Math.random() * rows);
            startC = Math.floor(Math.random() * cols);
        }
    }

    dfs(startR, startC, 1);

    if (path.length < totalCells) {
        // fallback snake path
        path = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                path.push({ r, c: (r % 2 === 0) ? c : cols - 1 - c });
            }
        }
    }

    const nodes: LevelNode[] = [];
    const maxStagesForLevel = 10 + (level - 1) * 5;
    // Number of nodes decreases as stage goes up to increase difficulty
    const stageProgress = (stage - 1) / Math.max(1, maxStagesForLevel - 1);
    const nodeDensity = Math.max(0.15, 1 - (stageProgress * 0.9)); // 1.0 -> 0.15

    // Fewer number of nodes means harder. Start with around 1 node every 2.5 cells, down to 1 node every 15 cells
    let numNodes = Math.max(3, Math.floor((totalCells / 2.5) * nodeDensity));
    if (numNodes > totalCells / 2) numNodes = Math.floor(totalCells / 2);

    const stepSize = Math.max(1, Math.floor((totalCells - 1) / (Math.max(1, numNodes - 1))));

    let currentNum = 1;
    for (let i = 0; i < totalCells; i += stepSize) {
        if (currentNum > numNodes) break;
        nodes.push({ r: path[i].r, c: path[i].c, num: currentNum });
        currentNum++;
    }

    if (nodes[nodes.length - 1].num <= numNodes) {
        const ln = nodes[nodes.length - 1];
        if (ln.r !== path[totalCells - 1].r || ln.c !== path[totalCells - 1].c) {
            nodes.push({r: path[totalCells - 1].r, c: path[totalCells - 1].c, num: nodes.length + 1});
        }
    }

    const blockedWalls: string[] = [];
    const pathEdges = new Set<string>();
    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];
        pathEdges.add(`${p1.r},${p1.c}-${p2.r},${p2.c}`);
        pathEdges.add(`${p2.r},${p2.c}-${p1.r},${p1.c}`);
    }

    // Add random walls
    const wallProbability = Math.min(0.5, 0.2 + (level * 0.05) + (stage * 0.02)); // Increase walls as levels/stages go up

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (c < cols - 1) { // horizontal wall
                const key = `${r},${c}-${r},${c+1}`;
                if (!pathEdges.has(key) && Math.random() < wallProbability) {
                    blockedWalls.push(key);
                }
            }
            if (r < rows - 1) { // vertical wall
                const key = `${r},${c}-${r+1},${c}`;
                if (!pathEdges.has(key) && Math.random() < wallProbability) {
                    blockedWalls.push(key);
                }
            }
        }
    }

    return { rows, cols, nodes, blockedWalls, solutionPath: path };
}
