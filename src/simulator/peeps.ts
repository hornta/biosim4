import type { Coord } from "./coord.js";
import { coordAsDirection, subtractCoord } from "./coord.js";
import { isEmptyAt } from "./grid/grid.js";
import type { Indiv } from "./indiv.js";
import type { MoveOperation } from "./moveOperation.js";

export enum PeepVitalStatus {
	Dead,
	Alive,
}

export interface Peeps {
	deathQueue: number[];
	individuals: Indiv[];
	moveQueue: MoveOperation[];
	peepsAlive: Uint8Array;
	peepsGenomes: Uint32Array;
	peepsGenomeLengths: Uint16Array;
}

export const makePeeps = (population: number, maxGenomeLength: number) => {
	// 1 byte per indiv
	const peepsAlive = new Uint8Array(new SharedArrayBuffer(population + 1));

	// 32 bits per max genome length per indiv
	const peepsGenomes = new Uint32Array(
		new SharedArrayBuffer(population * maxGenomeLength * 4)
	);

	// 16 bits per indiv
	const peepsGenomeLengths = new Uint16Array(
		new SharedArrayBuffer(population * 2)
	);
	peepsAlive[0] = -1;
	const peeps: Peeps = {
		deathQueue: [],
		individuals: [],
		moveQueue: [],
		peepsAlive: peepsAlive,
		peepsGenomes: peepsGenomes,
		peepsGenomeLengths: peepsGenomeLengths,
	};

	return peeps;
};

export const queueForDeath = (peeps: Peeps, indivIndex: number) => {
	peeps.deathQueue.push(indivIndex);
};

export const drainDeathQueue = (peeps: Peeps) => {
	for (const index of peeps.deathQueue) {
		const indiv = peeps.individuals[index];
		indiv.simulation.grid.data[
			indiv.location.x * indiv.simulation.grid.width + indiv.location.y
		] = 0;
		peeps.peepsAlive[index] = PeepVitalStatus.Dead;
	}
	peeps.deathQueue = [];
};

export const queueForMove = (
	peeps: Peeps,
	indivIndex: number,
	location: Coord
) => {
	peeps.moveQueue.push({ individualIndex: indivIndex, location });
};

export const drainMoveQueue = (peeps: Peeps) => {
	for (const moveOperation of peeps.moveQueue) {
		const indiv = peeps.individuals[moveOperation.individualIndex];
		if (
			peeps.peepsAlive[moveOperation.individualIndex] === PeepVitalStatus.Alive
		) {
			const newLocation = moveOperation.location;
			const moveDirection = coordAsDirection(
				subtractCoord(newLocation, indiv.location)
			);
			if (isEmptyAt(indiv.simulation.grid, newLocation)) {
				indiv.simulation.grid.data[
					indiv.location.x * indiv.simulation.grid.width + indiv.location.y
				] = 0;
				indiv.simulation.grid.data[
					newLocation.x * indiv.simulation.grid.width + newLocation.y
				] = indiv.index;
				indiv.lastMoveDirection = moveDirection;
			}
		}
	}
	peeps.moveQueue = [];
};
