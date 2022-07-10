import { Random } from "@hornta/random";
import { Coord } from "../coord.js";
import { getRandomInt } from "../random.js";

const EMPTY = 0;
export const BARRIER = 0xffff;

export interface Column {
  data: number[];
}

export interface Grid {
  data: Column[];
  barrierLocations: Coord[];
  barrierCenters: Coord[];
}

const initGrid = (grid: Grid, width: number, height: number) => {
  grid.data = Array.from({ length: width }).map(() => {
    return { data: Array(height).fill(0) };
  });
};

export const resetGrid = (grid: Grid) => {
  for (const column of grid.data) {
    column.data.fill(0);
  }
};

export const isInBounds = (grid: Grid, location: Coord) => {
  return (
    location.x >= 0 &&
    location.y >= 0 &&
    location.x < grid.data.length &&
    location.y < grid.data[0].data.length
  );
};

export const isEmptyAt = (grid: Grid, location: Coord) => {
  return grid.data[location.x].data[location.y] === EMPTY;
};

export const isBarrierAt = (grid: Grid, location: Coord) => {
  return grid.data[location.x].data[location.y] === BARRIER;
};

export const isOccupiedAt = (grid: Grid, location: Coord) => {
  return (
    grid.data[location.x].data[location.y] !== EMPTY &&
    grid.data[location.x].data[location.y] !== BARRIER
  );
};

export const isBorder = (grid: Grid, location: Coord) => {
  return (
    location.x === 0 ||
    location.y === 0 ||
    location.x === grid.data.length - 1 ||
    location.y === grid.data[0].data.length - 1
  );
};

export const findEmptyLocation = (random: Random, grid: Grid) => {
  let location = new Coord();

  while (true) {
    location.x = getRandomInt(random, 0, grid.data.length - 1);
    location.y = getRandomInt(random, 0, grid.data[0].data.length - 1);
    if (isEmptyAt(grid, location)) {
      break;
    }
  }

  return location;
};

export const makeGrid = (width: number, height: number) => {
  const grid: Grid = { barrierCenters: [], barrierLocations: [], data: [] };
  initGrid(grid, width, height);
  return grid;
};
