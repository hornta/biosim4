import type { Coord } from "./coord.js";
import { isEmptyAt } from "./grid/grid.js";
import type { Indiv } from "./indiv.js";
import type { MoveOperation } from "./moveOperation.js";

export interface Peeps {
	deathQueue: number[];
	individuals: Indiv[];
	moveQueue: MoveOperation[];
}

export const makePeeps = () => {
	const peeps: Peeps = {
		deathQueue: [],
		individuals: [],
		moveQueue: [],
	};

	return peeps;
};

export const queueForDeath = (peeps: Peeps, indiv: Indiv) => {
	peeps.deathQueue.push(indiv.index);
};

export const drainDeathQueue = (peeps: Peeps) => {
	for (const index of peeps.deathQueue) {
		const indiv = peeps.individuals[index];
		indiv.simulation.grid.data[indiv.location.x].data[indiv.location.y] = 0;
		indiv.alive = false;
	}
	peeps.deathQueue = [];
};

export const queueForMove = (peeps: Peeps, indiv: Indiv, location: Coord) => {
	peeps.moveQueue.push({ individualIndex: indiv.index, location });
};

export const drainMoveQueue = (peeps: Peeps) => {
	for (const moveOperation of peeps.moveQueue) {
		const indiv = peeps.individuals[moveOperation.individualIndex];
		if (indiv.alive) {
			const newLocation = moveOperation.location;
			const moveDirection = newLocation.subtract(indiv.location).asDir();
			if (isEmptyAt(indiv.simulation.grid, newLocation)) {
				indiv.simulation.grid.data[indiv.location.x].data[indiv.location.y] = 0;
				indiv.simulation.grid.data[newLocation.x].data[newLocation.y] =
					indiv.index;
				indiv.lastMoveDirection = moveDirection;
			}
		}
	}
	peeps.moveQueue = [];
};
