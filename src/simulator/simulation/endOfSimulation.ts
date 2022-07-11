import { Challenge } from "../challenge.js";
import { getCoordLength, subtractCoord } from "../coord.js";
import { drainDeathQueue, drainMoveQueue, queueForDeath } from "../peeps.js";
import { RANDOM_UINT_MAX } from "../random.js";
import { fadeSignal } from "../signals/signal.js";
import type { Simulation } from "./simulator.js";

export const handleEndOfSimulation = (
	simulation: Simulation,
	simulationStep: number
) => {
	if (simulation.options.challenge == Challenge.RadioactiveWalls) {
		const radioactiveX =
			simulationStep < simulation.options.stepsPerGeneration / 2
				? 0
				: simulation.options.sizeX - 1;

		for (let index = 1; index <= simulation.options.population; ++index) {
			const indiv = simulation.peeps.individuals[index];
			if (indiv.alive) {
				const distanceFromRadioactiveWall = Math.abs(
					indiv.location.x - radioactiveX
				);
				if (distanceFromRadioactiveWall < simulation.options.sizeX / 2) {
					const chanceOfDeath = 1.0 / distanceFromRadioactiveWall;
					if (simulation.random.uint32() / RANDOM_UINT_MAX < chanceOfDeath) {
						queueForDeath(simulation.peeps, indiv);
					}
				}
			}
		}
	}

	if (simulation.options.challenge == Challenge.TouchAnyWall) {
		for (let index = 1; index <= simulation.options.population; ++index) {
			const indiv = simulation.peeps.individuals[index];
			if (
				indiv.location.x == 0 ||
				indiv.location.x == simulation.options.sizeX - 1 ||
				indiv.location.y == 0 ||
				indiv.location.y == simulation.options.sizeY - 1
			) {
				indiv.challengeBits = 1;
			}
		}
	}

	// If this challenge is enabled, the individual gets a bit set in their challengeBits
	// member if they are within a specified radius of a barrier center. They have to
	// visit the barriers in sequential order.
	if (simulation.options.challenge == Challenge.LocationSequence) {
		const radius = 9.0;
		for (let index = 1; index <= simulation.options.population; ++index) {
			// index 0 is reserved
			const indiv = simulation.peeps.individuals[index];
			for (let n = 0; n < simulation.grid.barrierCenters.length; ++n) {
				const bit = 1 << n;
				if ((indiv.challengeBits & bit) == 0) {
					if (
						getCoordLength(
							subtractCoord(indiv.location, simulation.grid.barrierCenters[n])
						) <= radius
					) {
						indiv.challengeBits |= bit;
					}
					break;
				}
			}
		}
	}

	drainDeathQueue(simulation.peeps);
	drainMoveQueue(simulation.peeps);
	fadeSignal(simulation, 0);
};
