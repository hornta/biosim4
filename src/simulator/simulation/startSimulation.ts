import type { Indiv } from "../indiv.js";
import { feedForward } from "../indiv.js";
import { handleEndOfSimulation } from "./endOfSimulation.js";
import { executeActions } from "./executeActions.js";
import { RunMode } from "./runMode.js";
import type { Simulation } from "./simulator.js";
import {
	initializeGeneration,
	spawnNewGeneration,
} from "./spawnNewGeneration.js";

const simulateIndiv = (indiv: Indiv, simulationStep: number) => {
	indiv.age += 1;
	const actionLevels = feedForward(indiv, simulationStep);
	executeActions(indiv, actionLevels);
};

export interface StartSimulationOptions {
	onStart?: () => void;
	onSimulationEnd?: (options: {
		simulationStep: number;
		numberOfMurders: number;
	}) => void;
	onGenerationEnd?: (options: {
		generationStep: number;
		survivors: number;
		numberOfMurders: number;
	}) => void;
}

export const startSimulation = (
	simulation: Simulation,
	startSimulationOptions?: StartSimulationOptions
) => {
	const runMode = RunMode.Run;
	initializeGeneration({ simulation, isGeneration0: true });

	while (
		runMode === RunMode.Run &&
		simulation.generation < simulation.options.maxGenerations
	) {
		let murdererCount = 0;
		for (
			let simulationStep = 0;
			simulationStep < simulation.options.stepsPerGeneration;
			++simulationStep
		) {
			for (
				let indivIndex = 1;
				indivIndex <= simulation.options.population;
				++indivIndex
			) {
				if (simulation.peeps.individuals[indivIndex].alive) {
					simulateIndiv(
						simulation.peeps.individuals[indivIndex],
						simulationStep
					);
				}
			}

			const numberOfMurders = simulation.peeps.deathQueue.length;
			murdererCount += numberOfMurders;
			handleEndOfSimulation(simulation, simulationStep);
			startSimulationOptions?.onSimulationEnd?.({
				simulationStep,
				numberOfMurders,
			});
		}

		const numberOfSurvivors = spawnNewGeneration(simulation);

		startSimulationOptions?.onGenerationEnd?.({
			generationStep: simulation.generation,
			numberOfMurders: murdererCount,
			survivors: numberOfSurvivors,
		});
		if (numberOfSurvivors === 0) {
			simulation.generation = 0;
		} else {
			++simulation.generation;
		}
	}
};
