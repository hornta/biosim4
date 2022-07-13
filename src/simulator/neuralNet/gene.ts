import type { Random } from "@hornta/random";
import { getRandomInt } from "../random.js";
import type { Sensor } from "./sensor.js";
import type { Simulation } from "../simulation/simulator.js";

export enum SourceType {
	Neuron,
	Sensor,
}

export enum SinkType {
	Neuron,
	Action,
}

export interface Gene {
	sourceType: SourceType;
	sourceNum: Sensor;
	sinkType: SinkType;
	sinkNum: number;
	weight: number;
}

export const geneToNumber = (gene: Gene) => {
	return (
		gene.sourceType |
		((gene.sourceNum << 1) | (gene.sinkType << 8) | (gene.sinkNum << 9)) |
		(gene.weight << 16)
	);
};

export const numberToGene = (num: number): Gene => {
	return {
		sourceType: num & 0x1,
		sourceNum: (num >> 1) & 0x7f,
		sinkType: (num >> 8) & 0x1,
		sinkNum: (num >> 9) & 0x7f,
		weight: (num >> 16) & 0xffff,
	};
};

export const weightAsFloat = (gene: Gene) => {
	return gene.weight / 8192;
};

const makeRandomWeight = (random: Random) => {
	return getRandomInt(random, 0, 0xffff) - 0x8000;
};

export type Genome = Gene[];

export const makeRandomGenome = (simulation: Simulation) => {
	const genome: Genome = [];

	const length = getRandomInt(
		simulation.random,
		simulation.options.genomeInitialLengthMin,
		simulation.options.genomeInitialLengthMax
	);
	for (let n = 0; n < length; ++n) {
		genome.push(makeRandomGene(simulation.random));
	}

	return genome;
};

const makeRandomGene = (random: Random) => {
	const gene: Gene = {
		sourceType: random.uint32() & 1,
		sourceNum: getRandomInt(random, 0, 0x7fff),
		sinkType: random.uint32() & 1,
		sinkNum: getRandomInt(random, 0, 0x7fff),
		weight: makeRandomWeight(random),
	};
	return gene;
};
