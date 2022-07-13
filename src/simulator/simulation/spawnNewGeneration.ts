import { Challenge } from "../challenge.js";
import { createBarrier } from "../grid/createBarrier.js";
import type { Genome } from "../neuralNet/gene.js";
import { geneToNumber } from "../neuralNet/gene.js";
import { numberToGene } from "../neuralNet/gene.js";
import { makeRandomGenome } from "../neuralNet/gene.js";
import { generateChildGenome } from "../neuralNet/generateChildGenome.js";
import { genomeSimilarity } from "../neuralNet/genomCompare.js";
import { findEmptyLocation, resetGrid } from "../grid/grid.js";
import type { Indiv } from "../indiv.js";
import { makeIndiv } from "../indiv.js";
import { getRandomInt } from "../random.js";
import { clearSignal } from "../signals/signal.js";
import type { Simulation } from "./simulator.js";
import { passedSurvivalCriterion } from "./survivalCriteria.js";

type InitializeGenerationOptions = {
	simulation: Simulation;
} & (
	| { isGeneration0: true }
	| { isGeneration0: false; parentGenomes: Genome[] }
);

export const initializeGeneration = (options: InitializeGenerationOptions) => {
	resetGrid(options.simulation.grid);
	createBarrier(options.simulation);
	clearSignal(options.simulation.signals);

	options.simulation.peeps.individuals = [{} as Indiv];
	for (let index = 1; index <= options.simulation.options.population; ++index) {
		const genome = options.isGeneration0
			? makeRandomGenome(options.simulation)
			: generateChildGenome(options.simulation, options.parentGenomes);
		const indiv = makeIndiv(
			index,
			findEmptyLocation(options.simulation.random, options.simulation.grid),
			genome,
			options.simulation
		);
		options.simulation.peeps.individuals.push(indiv);
		options.simulation.peeps.peepsAlive[index] = 1;

		let genomeIndex = index - 1;
		for (const gene of genome) {
			options.simulation.peeps.peepsGenomes[genomeIndex] = geneToNumber(gene);
			genomeIndex += 1;
		}

		options.simulation.peeps.peepsGenomeLengths[index - 1] = genome.length;
	}
};

export const spawnNewGeneration = (simulation: Simulation) => {
	let sacrificedCount = 0; // for the altruism challenge

	// This container will hold the indexes and survival scores (0.0..1.0)
	// of all the survivors who will provide genomes for repopulation.
	let parents: { index: number; score: number }[] = [];

	// This container will hold the genomes of the survivors
	const parentGenomes: Genome[] = [];

	if (simulation.options.challenge != Challenge.Altruism) {
		// First, make a list of all the individuals who will become parents; save
		// their scores for later sorting. Indexes start at 1.
		for (let index = 1; index <= simulation.options.population; ++index) {
			const [passed, score] = passedSurvivalCriterion(
				simulation.peeps.individuals[index],
				simulation.options.challenge
			);
			// Save the parent genome if it results in valid neural connections
			// ToDo: if the parents no longer need their genome record, we could
			// possibly do a move here instead of copy, although it's doubtful that
			// the optimization would be noticeable.
			if (
				passed &&
				simulation.peeps.individuals[index].neuralNet.connections.length !== 0
			) {
				parents.push({ index, score });
			}
		}
	} else {
		// For the altruism challenge, test if the agent is inside either the sacrificial
		// or the spawning area. We'll count the number in the sacrificial area and
		// save the genomes of the ones in the spawning area, saving their scores
		// for later sorting. Indexes start at 1.

		const considerKinship = true;
		const sacrificesIndexes: number[] = []; // those who gave their lives for the greater good

		for (let index = 1; index <= simulation.options.population; ++index) {
			// This the test for the spawning area:
			const [passed, score] = passedSurvivalCriterion(
				simulation.peeps.individuals[index],
				Challenge.Altruism
			);
			if (
				passed &&
				simulation.peeps.individuals[index].neuralNet.connections.length !== 0
			) {
				parents.push({ index, score });
			} else {
				// This is the test for the sacrificial area:
				const [passed] = passedSurvivalCriterion(
					simulation.peeps.individuals[index],
					Challenge.AltruismSacrifice
				);
				if (
					passed &&
					simulation.peeps.individuals[index].neuralNet.connections.length !== 0
				) {
					if (considerKinship) {
						sacrificesIndexes.push(index);
					} else {
						++sacrificedCount;
					}
				}
			}
		}

		const generationToApplyKinship = 10;
		const altruismFactor = 10; // the saved:sacrificed ratio

		if (considerKinship) {
			if (simulation.generation > generationToApplyKinship) {
				// Todo: optimize!!!
				const threshold = 0.7;

				const survivingKin: typeof parents[number][] = [];
				for (let passes = 0; passes < altruismFactor; ++passes) {
					for (const sacrificedIndex of sacrificesIndexes) {
						// randomize the next loop so we don't keep using the first one repeatedly
						const startIndex = getRandomInt(
							simulation.random,
							0,
							parents.length - 1
						);
						for (let count = 0; count < parents.length; ++count) {
							const possibleParent =
								parents[(startIndex + count) % parents.length];
							const g1GenomeLength =
								simulation.peeps.peepsGenomeLengths[sacrificedIndex - 1];
							const g2GenomeLength =
								simulation.peeps.peepsGenomeLengths[possibleParent.index - 1];
							const similarity = genomeSimilarity(
								simulation.options.genomeComparisonMethod,
								simulation.peeps.peepsGenomes,
								sacrificedIndex - 1,
								g1GenomeLength,
								possibleParent.index - 1,
								g2GenomeLength
							);
							if (similarity >= threshold) {
								survivingKin.push(possibleParent);
								// mark this one so we don't use it again?
								break;
							}
						}
					}
				}
				parents = survivingKin;
			}
		} else {
			// Limit the parent list
			const numberSaved = sacrificedCount * altruismFactor;
			if (parents.length !== 0 && numberSaved < parents.length) {
				parents = parents.slice(0, numberSaved);
			}
		}
	}

	// Sort the indexes of the parents by their fitness scores
	parents.sort((a, b) => {
		return a.score - b.score;
	});

	// Assemble a list of all the parent genomes. These will be ordered by their
	// scores if the parents[] container was sorted by score
	for (const parent of parents) {
		const parentGenomeLength =
			simulation.peeps.peepsGenomeLengths[parent.index - 1];
		const parentNumericGenome = Array.from(
			simulation.peeps.peepsGenomes.slice(
				parent.index - 1,
				parent.index - 1 + parentGenomeLength
			)
		);
		parentGenomes.push(
			parentNumericGenome.map((number) => numberToGene(number))
		);
	}

	// appendEpochLog(generation, parentGenomes.size(), murderCount);
	//displaySignalUse(); // for debugging only

	// Now we have a container of zero or more parents' genomes

	if (parentGenomes.length !== 0) {
		// Spawn a new generation
		initializeGeneration({ simulation, isGeneration0: false, parentGenomes });
	} else {
		// Special case: there are no surviving parents: start the simulation over
		// from scratch with randomly-generated genomes
		initializeGeneration({ simulation, isGeneration0: true });
	}

	return parentGenomes.length;
};
