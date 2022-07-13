import type { Random } from "@hornta/random";
import type { Grid, Signal, SimulatorOptions } from "../index.js";
import { increment } from "../index.js";
import type { Indiv } from "../indiv.js";
import { feedForward } from "../indiv.js";
import type { Peeps } from "../peeps.js";
import { PeepVitalStatus } from "../peeps.js";
import { queueForDeath, queueForMove } from "../peeps.js";
import { handleEndOfSimulation } from "./endOfSimulation.js";
import type { ActionOutput, ActionOutputs } from "./executeActions.js";
import { ActionOutputType, executeActions } from "./executeActions.js";
import { RunMode } from "./runMode.js";
import type { Simulation } from "./simulator.js";
import {
	initializeGeneration,
	spawnNewGeneration,
} from "./spawnNewGeneration.js";

export const simulateIndiv = (
	indiv: Omit<Indiv, "simulation">,
	simulationStep: number,
	random: Random,
	options: SimulatorOptions,
	signals: Signal,
	grid: Grid,
	peeps: Peeps
) => {
	indiv.age += 1;
	const actionLevels = feedForward(
		indiv,
		simulationStep,
		random,
		options,
		signals,
		grid,
		peeps
	);
	const outputs = executeActions(indiv, actionLevels, random, options, grid);
	return outputs;
};

const actionOutputHandlers: Record<
	ActionOutputType,
	(actionOutput: ActionOutput, simulation: Simulation) => void
> = {
	[ActionOutputType.Kill]: (actionOutput, simulation) => {
		queueForDeath(simulation.peeps, actionOutput.value);
	},
	[ActionOutputType.LongProbeDistance]: (actionOutput, simulation) => {
		simulation.peeps.individuals[actionOutput.indiv].longProbeDistance =
			actionOutput.value;
	},
	[ActionOutputType.Move]: (actionOutput, simulation) => {
		queueForMove(simulation.peeps, actionOutput.indiv, {
			x: actionOutput.value & 0xffff,
			y: actionOutput.value >> 16,
		});
	},
	[ActionOutputType.OscilliatorPeriod]: (actionOutput, simulation) => {
		simulation.peeps.individuals[actionOutput.indiv].oscilliatePeriod =
			actionOutput.value;
	},
	[ActionOutputType.Signal0]: (actionOutput, simulation) => {
		increment(
			simulation.peeps.individuals[actionOutput.indiv],
			actionOutput.value
		);
	},
	[ActionOutputType.Responsiveness]: (actionOutput, simulation) => {
		simulation.peeps.individuals[actionOutput.indiv].responsiveness =
			actionOutput.value;
	},
};

export const processOutputs = (
	outputs: ActionOutputs,
	simulation: Simulation
) => {
	for (const output of outputs) {
		actionOutputHandlers[output.action](output, simulation);
	}
};

export interface StartSimulationOptions {
	onSimulationEnd?: (options: {
		simulationStep: number;
		numberOfMurders: number;
	}) => void;
	onGenerationEnd?: (options: {
		generationStep: number;
		survivors: number;
		numberOfMurders: number;
	}) => void;
	onProcessSimulation?: (options: {
		simulationStep: number;
		indivs: number[];
	}) => Promise<ActionOutputs>;
}

export const startSimulation = async (
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
			if (startSimulationOptions?.onProcessSimulation) {
				const indivsToProcess: number[] = [];
				for (
					let indivIndex = 1;
					indivIndex <= simulation.options.population;
					++indivIndex
				) {
					if (
						simulation.peeps.peepsAlive[indivIndex] === PeepVitalStatus.Alive
					) {
						indivsToProcess.push(indivIndex);
					}
				}
				const outputs = await startSimulationOptions.onProcessSimulation({
					simulationStep,
					indivs: indivsToProcess,
				});
				processOutputs(outputs, simulation);
			} else {
				for (
					let indivIndex = 1;
					indivIndex <= simulation.options.population;
					++indivIndex
				) {
					if (
						simulation.peeps.peepsAlive[indivIndex] === PeepVitalStatus.Alive
					) {
						const outputs = simulateIndiv(
							simulation.peeps.individuals[indivIndex],
							simulationStep,
							simulation.random,
							simulation.options,
							simulation.signals,
							simulation.grid,
							simulation.peeps
						);
						processOutputs(outputs, simulation);
					}
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
