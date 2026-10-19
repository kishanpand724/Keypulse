export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Passage {
  id: string;
  difficulty: Difficulty;
  title: string;
  category: string;
  text: string;
}

export interface DifficultyMeta {
  id: Difficulty;
  label: string;
  tagline: string;
  targetWpm: string;
  characteristics: string;
}

export const DIFFICULTY_META: Record<Difficulty, DifficultyMeta> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    tagline: 'Everyday vocabulary & smooth rhythm',
    targetWpm: '40–65 WPM',
    characteristics: 'Common words, simple punctuation, natural sentence flow',
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    tagline: 'Editorial prose & varied punctuation',
    targetWpm: '65–90 WPM',
    characteristics: 'Mixed clause length, commas, hyphens, richer vocabulary',
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    tagline: 'Technical syntax, numbers & symbols',
    targetWpm: '85+ WPM',
    characteristics: 'Numeric figures, semicolons, parentheses, dense terminology',
  },
};

export const PASSAGES: Passage[] = [
  // EASY PASSAGES
  {
    id: 'easy-1',
    difficulty: 'easy',
    title: 'Morning Light in the Valley',
    category: 'Nature',
    text: 'The morning sun rose slowly above the quiet green hills and warmed the cool air across the valley. Small birds moved from branch to branch in the tall oak trees while a gentle breeze carried the fresh scent of pine and rain. People walked along the stone path near the river, enjoying the calm start to a bright new day before the busy town woke up.',
  },
  {
    id: 'easy-2',
    difficulty: 'easy',
    title: 'The Art of Daily Practice',
    category: 'Learning',
    text: 'Learning to type quickly and clearly takes patience and steady daily habits. When you keep your eyes on the screen instead of looking down at the keys, your fingers begin to remember where each letter lives. Start at a comfortable pace that lets you hit every word cleanly, and your speed will grow naturally over time without extra stress.',
  },
  {
    id: 'easy-3',
    difficulty: 'easy',
    title: 'A Quiet Coastal Harbor',
    category: 'Travel',
    text: 'Wooden boats rested gently on the calm blue water as the tide rolled into the small harbor. Fishermen stacked their nets on the warm dock while seagulls circled high in the clear sky above the lighthouse. Along the shore, small shops opened their doors and welcomed visitors with fresh bread, warm coffee, and friendly conversation.',
  },
  {
    id: 'easy-4',
    difficulty: 'easy',
    title: 'Building a Clear Workspace',
    category: 'Focus',
    text: 'A clean desk helps the mind stay calm and focused during long hours of creative work. Keeping only a notebook, a warm lamp, and a good keyboard within reach removes small distractions before they begin. When your space feels simple and organized, it becomes much easier to finish one task at a time and enjoy the process.',
  },
  {
    id: 'easy-5',
    difficulty: 'easy',
    title: 'Evening Train Journey',
    category: 'Travel',
    text: 'The evening train glided smoothly along the tracks as golden fields and small farmhouses passed outside the wide glass window. Inside the quiet car, passengers read books, listened to soft music, or watched the clouds turn orange and violet in the west. By the time the city lights appeared on the horizon, stars were shining brightly overhead.',
  },
  {
    id: 'easy-6',
    difficulty: 'easy',
    title: 'Fresh Bread from the Oven',
    category: 'Craft',
    text: 'Baking simple bread at home requires only flour, water, salt, yeast, and a little bit of patience. After kneading the soft dough on a wooden board, you leave it in a warm bowl until it doubles in size. Once it bakes in the hot oven, the golden crust crackles softly and fills the whole kitchen with a rich and comforting aroma.',
  },

  // MEDIUM PASSAGES
  {
    id: 'medium-1',
    difficulty: 'medium',
    title: 'Mechanical Keyboards and Tactile Feedback',
    category: 'Hardware',
    text: 'Modern mechanical keyboards are engineered to provide consistent tactile feedback across millions of individual keystrokes. Unlike standard membrane designs, each switch contains a precision-coiled spring and metal leaf contact that registers actuation before the key bottoms out completely. This physical response reduces finger fatigue and helps experienced typists maintain a steady, rhythmic cadence.',
  },
  {
    id: 'medium-2',
    difficulty: 'medium',
    title: 'Urban Architecture and Public Space',
    category: 'Design',
    text: 'Well-designed cities balance dense commercial districts with generous pedestrian plazas, shaded courtyards, and accessible transit corridors. When architects prioritize natural daylight, acoustic comfort, and durable local materials, neighborhoods become far more inviting throughout every season. Small details—such as wide sidewalks, sheltered benches, and clear wayfinding—transform how residents experience daily life.',
  },
  {
    id: 'medium-3',
    difficulty: 'medium',
    title: 'Deep Focus in a Connected World',
    category: 'Productivity',
    text: 'Sustaining uninterrupted concentration has become a rare advantage in modern knowledge work. Constant notifications fragment our attention, leaving behind mental residue that slows down complex problem-solving. By scheduling dedicated blocks of ninety minutes for deep, single-threaded work, teams produce higher-quality engineering and clearer writing in half the usual time.',
  },
  {
    id: 'medium-4',
    difficulty: 'medium',
    title: 'Ocean Currents and Global Climate',
    category: 'Science',
    text: 'Vast oceanic currents act as a planetary conveyor belt, redistributing thermal energy from equatorial waters toward the polar regions. Driven by surface winds, temperature gradients, and variations in seawater salinity, these deep circulation patterns regulate coastal weather across entire continents. Even subtle shifts in ocean temperature can alter seasonal rainfall thousands of miles away.',
  },
  {
    id: 'medium-5',
    difficulty: 'medium',
    title: 'The Evolution of Typography',
    category: 'Typography',
    text: 'From movable metal type in fifteenth-century workshops to high-resolution variable fonts on modern displays, typography has always bridged technology and human perception. Proportional letterforms guide the reader effortlessly across long paragraphs, while monospaced typefaces allocate identical horizontal width to every glyph—making character alignment immediately visible for programmers and editors.',
  },
  {
    id: 'medium-6',
    difficulty: 'medium',
    title: 'Acoustic Engineering in Concert Halls',
    category: 'Acoustics',
    text: 'Designing a world-class concert hall requires balancing direct sound with warm, enveloping reverberation. Acoustic engineers carefully sculpt timber wall panels, suspended canopy reflectors, and textured balconies so every instrument can be heard with clarity from the front row to the highest gallery. A reverberation time near two seconds gives orchestral music its signature depth.',
  },

  // HARD PASSAGES
  {
    id: 'hard-1',
    difficulty: 'hard',
    title: 'Distributed Consensus & Fault Tolerance',
    category: 'Systems Engineering',
    text: 'In distributed computing, achieving consensus across 128 asynchronous nodes requires strict quorum protocols (such as Raft or Paxos) that tolerate up to (2f + 1) network partitions; even when P99 tail latency exceeds 45.8ms, state-machine replication must guarantee linearizability without sacrificing throughput (>14,500 ops/sec).',
  },
  {
    id: 'hard-2',
    difficulty: 'hard',
    title: 'Orbital Telemetry & Propulsion Dynamics',
    category: 'Aerospace',
    text: 'At T+00:08:42, the second-stage vacuum engine throttled to 76% thrust (delivering an Isp of 348.5 seconds) to insert the 4,210 kg payload into a 540 km sun-synchronous orbit; telemetry confirmed an inclination of 97.6 degrees, eccentricity < 0.0012, and delta-v margins of +18.4 m/s across all 4 reaction wheels.',
  },
  {
    id: 'hard-3',
    difficulty: 'hard',
    title: 'Cryptographic Hashing & Zero-Knowledge Proofs',
    category: 'Cryptography',
    text: 'Modern cryptographic protocols rely on SHA-256 and elliptic-curve primitives (e.g., Curve25519) to provide 128-bit security levels; by combining Merkle trees with succinct non-interactive arguments of knowledge (zk-SNARKs), verifiers can validate 10,000+ state transitions in <12ms using a constant-size 288-byte proof.',
  },
  {
    id: 'hard-4',
    difficulty: 'hard',
    title: 'Compiler Optimization & Cache Locality',
    category: 'Computer Science',
    text: 'When compiling performance-critical kernels at -O3, loop vectorization (SIMD AVX-512) and L1/L2 cache-line alignment (64-byte boundaries) reduce memory-stall cycles by 62.4%; however, branch mispredictions (>3.5% rate) can still flush a 19-stage superscalar pipeline, costing 14 to 20 clock cycles per penalty.',
  },
  {
    id: 'hard-5',
    difficulty: 'hard',
    title: 'Quantum Decoherence & Cryogenic Control',
    category: 'Physics',
    text: 'Superconducting transmon qubits operate inside dilution refrigerators cooled to 15 millikelvin (-273.135 C); maintaining coherence times (T1 > 120 microseconds, T2 > 95 microseconds) demands microwave pulses calibrated within +/-0.05 dB and two-qubit gate fidelities exceeding 99.65% across a 64-qubit lattice.',
  },
  {
    id: 'hard-6',
    difficulty: 'hard',
    title: 'Quantitative Market Microstructure',
    category: 'Finance',
    text: 'During high-volatility auctions, limit-order book depth within +/-25 basis points (0.25%) contracted by 48.2%, while bid-ask spreads widened from $0.01 to $0.07; matching engines processed 842,910 messages/second with a median wire-to-wire latency of 6.4 microseconds (99.9th percentile: 29.1 microseconds).',
  },
];

export function getRandomPassage(difficulty: Difficulty, excludeId?: string): Passage {
  const pool = PASSAGES.filter((p) => p.difficulty === difficulty);
  if (pool.length <= 1) return pool[0];
  const candidates = excludeId ? pool.filter((p) => p.id !== excludeId) : pool;
  const list = candidates.length > 0 ? candidates : pool;
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
}
