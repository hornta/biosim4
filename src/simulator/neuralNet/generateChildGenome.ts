import type { Genome } from "./gene.js";
import { makeRandomGenome } from "./gene.js";
import { getRandomInt, RANDOM_UINT_MAX } from "../random.js";
import type { Simulation } from "../simulation/simulator.js";
import assert from "assert";

const randomBitFlip = (simulation: Simulation, genome: Genome) => {
	const elementIndex = getRandomInt(simulation.random, 0, genome.length - 1);
	const chance = simulation.random.next(); // 0..1
	if (chance < 0.2) {
		// sourceType
		genome[elementIndex].sourceType ^= 1;
	} else if (chance < 0.4) {
		// sinkType
		genome[elementIndex].sinkType ^= 1;
	} else if (chance < 0.6) {
		const bitIndex8 = 1 << getRandomInt(simulation.random, 0, 7);
		// sourceNum
		genome[elementIndex].sourceNum ^= bitIndex8;
	} else if (chance < 0.8) {
		const bitIndex8 = 1 << getRandomInt(simulation.random, 0, 7);
		// sinkNum
		genome[elementIndex].sinkNum ^= bitIndex8;
	} else {
		// weight
		genome[elementIndex].weight ^= 1 << getRandomInt(simulation.random, 1, 15);
	}
};

const cropLength = (simulation: Simulation, genome: Genome, length: number) => {
	if (genome.length > length && length > 0) {
		if (simulation.random.uint32() / RANDOM_UINT_MAX < 0.5) {
			// trim front
			const numberElementsToTrim = genome.length - length;
			return genome.slice(numberElementsToTrim);
		} else {
			// trim back
			return genome.slice(0, length);
		}
	}
	return genome;
};

// Inserts or removes a single gene from the genome. This is
// used only when the simulator is configured to allow genomes of
// unequal lengths during a simulation.
const randomInsertDeletion = (simulation: Simulation, genome: Genome) => {
	const probability = simulation.options.geneInsertionDeletionRate;
	if (simulation.random.uint32() / RANDOM_UINT_MAX < probability) {
		if (
			simulation.random.uint32() / RANDOM_UINT_MAX <
			simulation.options.deletionRatio
		) {
			// deletion
			if (genome.length > 1) {
				return genome.slice(
					0,
					getRandomInt(simulation.random, 0, genome.length - 1)
				);
			}
		} else if (genome.length < simulation.options.genomeMaxLength) {
			// insertion
			return [...genome, makeRandomGenome(simulation)] as Genome;
		}
	}
	return genome;
};

// This function causes point mutations in a genome with a probability defined
// by the parameter p.pointMutationRate.
const applyPointMutations = (simulation: Simulation, genome: Genome) => {
	let numberOfGenes = genome.length;
	while (numberOfGenes-- > 0) {
		if (
			simulation.random.uint32() / RANDOM_UINT_MAX <
			simulation.options.mutationRate
		) {
			randomBitFlip(simulation, genome);
		}
	}
};

export const generateChildGenome = (
	simulation: Simulation,
	parentGenomes: Genome[]
) => {
	// random parent (or parents if sexual reproduction) with random
	// mutations
	let genome: Genome;

	let parent1Idx: number;
	let parent2Idx: number;

	// Choose two parents randomly from the candidates. If the parameter
	// p.chooseParentsByFitness is false, then we choose at random from
	// all the candidate parents with equal preference. If the parameter is
	// true, then we give preference to candidate parents according to their
	// score. Their score was computed by the survival/selection algorithm
	// in survival-criteria.cpp.
	if (simulation.options.chooseParentsByFitness && parentGenomes.length > 1) {
		parent1Idx = getRandomInt(simulation.random, 1, parentGenomes.length - 1);
		parent2Idx = getRandomInt(simulation.random, 0, parent1Idx - 1);
	} else {
		parent1Idx = getRandomInt(simulation.random, 0, parentGenomes.length - 1);
		parent2Idx = getRandomInt(simulation.random, 0, parentGenomes.length - 1);
	}

	const g1 = parentGenomes[parent1Idx];
	const g2 = parentGenomes[parent2Idx];

	if (g1.length === 0 || g2.length === 0) {
		throw new Error("Invalid genome");
	}

	const overlayWithSliceOf = (gShorter: Genome) => {
		let index0 = getRandomInt(simulation.random, 0, gShorter.length - 1);
		let index1 = getRandomInt(simulation.random, 0, gShorter.length);
		if (index0 > index1) {
			const tmp = index1;
			index1 = index0;
			index0 = tmp;
		}
		for (let i = 0; i < index1 - index0; ++i) {
			const index = index0 + i;
			genome[index] = { ...gShorter[index] };
		}
	};

	if (simulation.options.sexualReproduction) {
		if (g1.length > g2.length) {
			genome = structuredClone(g1);
			overlayWithSliceOf(g2);
		} else {
			genome = structuredClone(g2);
			overlayWithSliceOf(g1);
		}

		// Trim to length = average length of parents
		let sum = g1.length + g2.length;
		// If average length is not an integral number, add one half the time
		if (sum & 1 && simulation.random.uint32() & 1) {
			++sum;
		}
		genome = cropLength(simulation, genome, sum / 2);
	} else {
		genome = structuredClone(g2);
	}

	genome = randomInsertDeletion(simulation, genome);
	applyPointMutations(simulation, genome);
	return genome;
};
