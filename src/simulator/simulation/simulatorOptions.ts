import type { BarrierType } from "../grid/barrierType.js";
import type { Challenge } from "../challenge.js";
import type { GenomComparisonMethod } from "../neuralNet/genomComparisonMethod.js";

export interface SimulatorOptions {
	population: number;
	stepsPerGeneration: number;
	maxGenerations: number;
	signalLayers: number;
	genomeInitialLengthMin: number;
	genomeInitialLengthMax: number;
	genomeMaxLength: number;
	maxNumberNeurons: number;
	mutationRate: number;
	geneInsertionDeletionRate: number;
	deletionRatio: number;
	killEnable: boolean;
	sexualReproduction: boolean;
	chooseParentsByFitness: boolean;
	populationSensorRadius: number;
	longProbeDistance: number;
	shortProbeBarrierDistance: number;
	signalSensorRadius: number;
	responsivenessCurveKFactor: 1 | 2 | 3 | 4;
	sizeX: number;
	sizeY: number;
	genomeComparisonMethod: GenomComparisonMethod;
	challenge: Challenge;
	barrierType: BarrierType;
	rngSeed?: string;
}

export const validateOptions = (options: SimulatorOptions) => {
	if (options.population < 1 || options.population > 0xffff - 1) {
		throw new Error("`population` must be between 1 and 65534");
	}

	if (options.stepsPerGeneration < 0) {
		throw new Error("`stepsPerGeneration` can't be negative");
	}

	if (options.maxGenerations < 0) {
		throw new Error("`maxGenerations` can't be negative");
	}

	if (options.signalLayers <= 0) {
		throw new Error("`signalLayers` must be positive");
	}

	if (options.genomeMaxLength <= 0) {
		throw new Error("`maxGenerations` must be positive");
	}

	if (options.maxNumberNeurons <= 0) {
		throw new Error("`maxNumberNeurons` must be positive");
	}

	if (options.mutationRate < 0 || options.mutationRate > 1) {
		throw new Error("`mutationRate` must be between 0 and 1");
	}

	if (
		options.geneInsertionDeletionRate < 0 ||
		options.geneInsertionDeletionRate > 1
	) {
		throw new Error("`geneInsertionDeletionRate` must be between 0 and 1");
	}

	if (options.deletionRatio < 0 || options.deletionRatio > 1) {
		throw new Error("`deletionRatio` must be between 0 and 1");
	}

	if (options.populationSensorRadius <= 0) {
		throw new Error("`populationSensorRadius` must be positive");
	}

	if (options.longProbeDistance <= 0) {
		throw new Error("`longProbeDistance` must be positive");
	}

	if (options.shortProbeBarrierDistance <= 0) {
		throw new Error("`shortProbeBarrierDistance` must be positive");
	}

	if (options.signalSensorRadius <= 0) {
		throw new Error("`signalSensorRadius` must be positive");
	}

	if (options.sizeX < 2 || options.sizeX > 0x10000) {
		throw new Error(`\`sizeX\` must be between 2 and ${0x10000}`);
	}

	if (options.sizeY < 2 || options.sizeY > 0x10000) {
		throw new Error(`\`sizeY\` must be between 2 and ${0x10000}`);
	}

	if (
		options.genomeInitialLengthMin <= 0 ||
		options.genomeInitialLengthMin > options.genomeInitialLengthMax
	) {
		throw new Error(
			"`genomeInitialLengthMin` must be between 0 and `genomeInitialLengthMax`"
		);
	}

	if (options.genomeInitialLengthMax < options.genomeInitialLengthMin) {
		throw new Error(
			"`genomeInitialLengthMax` must be no less than `genomeInitialLengthMin`"
		);
	}
};
