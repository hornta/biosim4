import type { Random } from "@hornta/random";
import { Compass } from "./compass.js";
import { normalizedCoords } from "./coord.js";
import { getRandomInt } from "./random.js";

export type Dir = Compass;

export const directionAsNormalizedCoord = (direction: Dir) => {
	return normalizedCoords[direction];
};

const rotate = (direction: Dir, n: number) => {
	return rotations[direction * 8 + (n & 7)];
};

export const rotate90DegreesClockWise = (direction: Dir) => {
	return rotate(direction, 2);
};

export const rotate90DegreesCounterClockWise = (direction: Dir) => {
	return rotate(direction, -2);
};

export const randomDirection8 = (random: Random) => {
	return rotate(Compass.North, getRandomInt(random, 0, 7));
};

const rotations = [
	Compass.SouthWest,
	Compass.West,
	Compass.NorthWest,
	Compass.North,
	Compass.NorthEast,
	Compass.East,
	Compass.SouthEast,
	Compass.South,
	Compass.South,
	Compass.SouthWest,
	Compass.West,
	Compass.NorthWest,
	Compass.North,
	Compass.NorthEast,
	Compass.East,
	Compass.SouthEast,
	Compass.SouthEast,
	Compass.South,
	Compass.SouthWest,
	Compass.West,
	Compass.NorthWest,
	Compass.North,
	Compass.NorthEast,
	Compass.East,
	Compass.West,
	Compass.NorthWest,
	Compass.North,
	Compass.NorthEast,
	Compass.East,
	Compass.SouthEast,
	Compass.South,
	Compass.SouthWest,
	Compass.Center,
	Compass.Center,
	Compass.Center,
	Compass.Center,
	Compass.Center,
	Compass.Center,
	Compass.Center,
	Compass.Center,
	Compass.East,
	Compass.SouthEast,
	Compass.South,
	Compass.SouthWest,
	Compass.West,
	Compass.NorthWest,
	Compass.North,
	Compass.NorthEast,
	Compass.NorthWest,
	Compass.North,
	Compass.NorthEast,
	Compass.East,
	Compass.SouthEast,
	Compass.South,
	Compass.SouthWest,
	Compass.West,
	Compass.North,
	Compass.NorthEast,
	Compass.East,
	Compass.SouthEast,
	Compass.South,
	Compass.SouthWest,
	Compass.West,
	Compass.NorthWest,
	Compass.NorthEast,
	Compass.East,
	Compass.SouthEast,
	Compass.South,
	Compass.SouthWest,
	Compass.West,
	Compass.NorthWest,
	Compass.North,
] as const;
