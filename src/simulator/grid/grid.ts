import type { Random } from "@hornta/random";
import type { Coord } from "../coord.js";
import { getRandomInt } from "../random.js";

const EMPTY = 0;
export const BARRIER = 0xffff;

export interface GridColumn {
	data: number[];
}

export interface Grid {
	data: Uint16Array;
	barrierLocations: Coord[];
	numBarrierCenters: number;
	barrierCenters: Uint16Array;
	width: number;
	height: number;
}

export const resetGrid = (grid: Grid) => {
	grid.data.fill(0);
};

export const isInBounds = (grid: Grid, location: Coord) => {
	return (
		location.x >= 0 &&
		location.y >= 0 &&
		location.x < grid.width &&
		location.y < grid.height
	);
};

export const isEmptyAt = (grid: Grid, location: Coord) => {
	return grid.data[location.x * grid.width + location.y] === EMPTY;
};

export const isBarrierAt = (grid: Grid, location: Coord) => {
	return grid.data[location.x * grid.width + location.y] === BARRIER;
};

export const isOccupiedAt = (grid: Grid, location: Coord) => {
	return (
		grid.data[location.x * grid.width + location.y] !== EMPTY &&
		grid.data[location.x * grid.width + location.y] !== BARRIER
	);
};

export const isBorder = (grid: Grid, location: Coord) => {
	return (
		location.x === 0 ||
		location.y === 0 ||
		location.x === grid.width - 1 ||
		location.y === grid.height - 1
	);
};

export const findEmptyLocation = (random: Random, grid: Grid) => {
	const location = { x: 0, y: 0 };

	while (true) {
		location.x = getRandomInt(random, 0, grid.width - 1);
		location.y = getRandomInt(random, 0, grid.height - 1);
		if (isEmptyAt(grid, location)) {
			break;
		}
	}

	return location;
};

export const makeGrid = (width: number, height: number) => {
	const grid: Grid = {
		numBarrierCenters: 0,

		// space for 10 barrier centers, 1 barrier center = 32 bit so total = 10 * 32
		barrierCenters: new Uint16Array(new SharedArrayBuffer(10 * 32)),
		barrierLocations: [],

		// each index holds a 16 bit number refering to an index in the peeps.individuals array
		// index 0 means no indiv is present in the location
		// index 0xffff means a barrier is present in the location
		data: new Uint16Array(new SharedArrayBuffer(width * height * 2)),
		width,
		height,
	};
	return grid;
};
