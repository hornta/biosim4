import { Compass } from "./compass.js";
import { Dir } from "./dir.js";
import { Polar } from "./polar.js";

const tanN = 13860;
const tanD = 33461;
const conversion = [
	new Dir(Compass.South),
	new Dir(Compass.Center),
	new Dir(Compass.SouthWest),
	new Dir(Compass.North),
	new Dir(Compass.SouthEast),
	new Dir(Compass.East),
	new Dir(Compass.North),
	new Dir(Compass.North),
	new Dir(Compass.North),
	new Dir(Compass.North),
	new Dir(Compass.West),
	new Dir(Compass.NorthWest),
	new Dir(Compass.North),
	new Dir(Compass.NorthEast),
	new Dir(Compass.North),
	new Dir(Compass.North),
] as const;

export interface Coord {
	x: number;
	y: number;
}

export const isNormalizedCoord = (coord: Coord) => {
	return coord.x >= -1 && coord.x <= 1 && coord.y >= -1 && coord.y <= 1;
};

export const getCoordLength = (coord: Coord) => {
	return Math.floor(Math.sqrt(coord.x * coord.x + coord.y * coord.y));
};

export const coordAsDirection = (coord: Coord) => {
	const xp = coord.x * tanD + coord.y * tanN;
	const yp = coord.y * tanD - coord.x * tanN;

	return conversion[
		Number(yp > 0) * 8 +
			Number(xp > 0) * 4 +
			Number(yp > xp) * 2 +
			Number(yp >= -xp)
	];
};

export const normalizeCoord = (coord: Coord) => {
	return coordAsDirection(coord).asNormalizedCoord();
};

export const coordAsPolar = (coord: Coord) => {
	return new Polar(getCoordLength(coord), coordAsDirection(coord));
};

export const multiplyCoord = (coord: Coord, scalar: number) => {
	return { x: coord.x * scalar, y: coord.y * scalar };
};

export const subtractCoord = (coord: Coord, other: Coord) => {
	return { x: coord.x - other.x, y: coord.y - other.y };
};

export const addCoord = (coord: Coord, other: Coord) => {
	return { x: coord.x + other.x, y: coord.y + other.y };
};

export const coordsAreIdentical = (coord: Coord, other: Coord) => {
	return coord.x === other.x && coord.y === other.y;
};

export const addDirectionToCoord = (coord: Coord, direction: Dir) => {
	return addCoord(coord, direction.asNormalizedCoord());
};

export const subtractDirectionFromCoord = (coord: Coord, direction: Dir) => {
	return subtractCoord(coord, direction.asNormalizedCoord());
};

export const raySameness = (coord: Coord, other: Coord) => {
	const magnitude =
		(coord.x * coord.x + coord.y * coord.y) *
		(other.x * other.x + other.y * other.y);
	if (magnitude === 0) {
		return 1.0;
	}

	return (coord.x * other.x + coord.y * other.y) / Math.sqrt(magnitude);
};

export const raySamenessDirection = (coord: Coord, direction: Dir) => {
	return raySameness(coord, direction.asNormalizedCoord());
};

export const normalizedCoords: Coord[] = [
	{ x: -1, y: -1 }, // SW
	{ x: 0, y: -1 }, // S
	{ x: 1, y: -1 }, // SE
	{ x: -1, y: 0 }, // W
	{ x: 0, y: 0 }, // CENTER
	{ x: 1, y: 0 }, // E
	{ x: -1, y: 1 }, // NW
	{ x: 0, y: 1 }, // N
	{ x: 1, y: 1 }, // NE
];
