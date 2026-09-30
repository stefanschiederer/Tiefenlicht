/** World size in world units (portrait, like Tower War). The screen view rotates it in landscape. */
export const WORLD_W = 720;
export const WORLD_H = 1280;

export const NEUTRAL = 0;
export const PLAYER = 1;

/** Team colours: neutral, player (blue), enemies (red, yellow, purple). */
export const TEAM_COLORS = ['#aab3bf', '#2f86ff', '#ff4545', '#ffbf1f', '#a55cff'] as const;
export const TEAM_DARK = ['#6f7a88', '#1a5cc2', '#c22626', '#c98a00', '#6d2fc0'] as const;
export const TEAM_LIGHT = ['#dfe4ea', '#8cc0ff', '#ff9b9b', '#ffe08a', '#d2adff'] as const;

/** Tower hit radius at level 1 (world units). */
export const TOWER_R = 40;
/** Troop count needed to reach tower level 2 and 3. */
export const LEVEL_UP = [10, 25] as const;
/** Outgoing lines a tower may hold at level 1, 2, 3. */
export const LINES_PER_LEVEL = [1, 2, 3] as const;
/** Troops per second an owned tower produces at level 1, 2, 3. Neutral towers do not grow. */
export const GROWTH = [1, 1.3, 1.6] as const;
/** Production stops at this count; reinforcements can still push a tower up to MAX_TROOPS. */
export const GROW_CAP = 50;
export const MAX_TROOPS = 99;
/** Seconds between two troops leaving a tower on one line. */
export const SEND_INTERVAL = 0.5;
/** Troop walking speed in world units per second. */
export const TROOP_SPEED = 115;
/** Wall thickness (world units); lines may not cross walls. */
export const WALL_T = 22;
