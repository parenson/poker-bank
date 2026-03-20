/**
 * blindStructure.js
 * Generates a poker tournament blind schedule given:
 *   - totalMinutes: total tournament duration
 *   - startingChips: starting stack per player
 *   - numPlayers: expected player count (used for endgame blind sizing)
 *   - roundMinutes: optional override; if omitted, app calculates it
 *
 * Rules:
 *   - Starting big blind ≈ 1/50 of starting stack (gives players ~50 BBs)
 *   - Blinds roughly double every 2-3 levels
 *   - Antes introduced at level 70% of the way through (last 30%)
 *   - Ante = 1 BB (standard big blind ante format)
 *   - Round count = totalMinutes / roundMinutes
 */

// Canonical blind level table (SB / BB pairs)
const BLIND_TABLE = [
  [10, 20], [15, 30], [20, 40], [25, 50],
  [30, 60], [40, 80], [50, 100], [75, 150],
  [100, 200], [125, 250], [150, 300], [200, 400],
  [250, 500], [300, 600], [400, 800], [500, 1000],
  [600, 1200], [800, 1600], [1000, 2000], [1200, 2400],
  [1500, 3000], [2000, 4000], [2500, 5000], [3000, 6000],
  [4000, 8000], [5000, 10000], [6000, 12000], [8000, 16000],
  [10000, 20000], [15000, 30000], [20000, 40000], [25000, 50000],
]

/**
 * @param {object} params
 * @param {number} params.totalMinutes
 * @param {number} params.startingChips
 * @param {number} [params.numPlayers]
 * @param {number} [params.roundMinutes] - if provided, overrides auto-calculation
 * @returns {{ levels: BlindLevel[], roundMinutes: number }}
 */
export function generateBlindStructure({ totalMinutes, startingChips, numPlayers = 9, roundMinutes }) {
  // Auto-calculate round length if not specified
  // Target: 10–18 levels total, round length 15–30 min
  let calcRoundMinutes = roundMinutes
  if (!calcRoundMinutes) {
    // Aim for rounds between 15 and 30 min
    const targetLevels = clamp(Math.round(totalMinutes / 20), 8, 20)
    calcRoundMinutes = Math.round(totalMinutes / targetLevels)
    calcRoundMinutes = clamp(calcRoundMinutes, 10, 40)
  }

  const numLevels = Math.max(6, Math.floor(totalMinutes / calcRoundMinutes))

  // Find starting blind: BB should be ~1/50 of starting stack
  const idealStartBB = startingChips / 50
  let startIdx = BLIND_TABLE.findIndex(([, bb]) => bb >= idealStartBB)
  if (startIdx < 0) startIdx = 0

  // Select levels — if we need more than the table provides, repeat last few doubled
  const selected = []
  for (let i = 0; i < numLevels; i++) {
    const tableIdx = startIdx + i
    if (tableIdx < BLIND_TABLE.length) {
      selected.push([...BLIND_TABLE[tableIdx]])
    } else {
      // Extrapolate by doubling the last level
      const [prevSB, prevBB] = selected[selected.length - 1]
      selected.push([prevSB * 2, prevBB * 2])
    }
  }

  // Introduce antes at 70% through the levels (last 30%)
  const anteStartIdx = Math.floor(selected.length * 0.70)

  const levels = selected.map(([sb, bb], i) => ({
    level: i + 1,
    smallBlind: sb,
    bigBlind: bb,
    // Big blind ante format — one ante equal to the big blind paid by the BB player
    ante: i >= anteStartIdx ? bb : 0,
    durationMinutes: calcRoundMinutes,
    // Cumulative start time in minutes from tournament start
    startMinute: i * calcRoundMinutes,
  }))

  return { levels, roundMinutes: calcRoundMinutes }
}

/**
 * Given elapsed minutes, return the current level index (0-based).
 */
export function getCurrentLevelIndex(levels, elapsedMinutes) {
  for (let i = levels.length - 1; i >= 0; i--) {
    if (elapsedMinutes >= levels[i].startMinute) return i
  }
  return 0
}

/**
 * Minutes remaining in the current level.
 */
export function minutesRemainingInLevel(levels, elapsedMinutes) {
  const idx = getCurrentLevelIndex(levels, elapsedMinutes)
  const level = levels[idx]
  const levelElapsed = elapsedMinutes - level.startMinute
  return Math.max(0, level.durationMinutes - levelElapsed)
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}
