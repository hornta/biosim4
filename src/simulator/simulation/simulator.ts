import type { Random } from "@hornta/random";
import { defaultOptions } from "./defaultSimulationOptions.js";
import type { Grid } from "../grid/grid.js";
import { makeGrid } from "../grid/grid.js";
import type { Peeps } from "../peeps.js";
import { makePeeps } from "../peeps.js";
import { makeRandoms } from "../random.js";
import type { Signal } from "../signals/signal.js";
import { makeSignal } from "../signals/signal.js";
import type { SimulatorOptions } from "./simulatorOptions.js";
import { validateOptions } from "./simulatorOptions.js";

export interface Simulation {
	peeps: Peeps;
	grid: Grid;
	options: SimulatorOptions;
	generation: number;
	random: Random;
	signals: Signal;
}

export const makeSimulation = (options = defaultOptions) => {
	validateOptions(options);

	const [mainRandom] = makeRandoms(0, options.rngSeed);

	const simulation: Simulation = {
		generation: 0,
		grid: makeGrid(options.sizeX, options.sizeY),
		options,
		peeps: makePeeps(options.population, options.genomeMaxLength),
		random: mainRandom,
		signals: makeSignal(options.signalLayers, options.sizeX, options.sizeY),
	};

	return simulation;
};
