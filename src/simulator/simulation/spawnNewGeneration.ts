import { Challenge } from "../challenge.js";
import { createBarrier } from "../grid/createBarrier.js";
import { Genome, makeRandomGenome } from "../neuralNet/gene.js";
import { generateChildGenome } from "../neuralNet/generateChildGenome.js";
import { genomeSimilarity } from "../neuralNet/genomCompare.js";
import { findEmptyLocation, resetGrid } from "../grid/grid.js";
import { Indiv, makeIndiv } from "../indiv.js";
import { getRandomInt } from "../random.js";
import { clearSignal } from "../signals/signal.js";
import { Simulation } from "./simulator.js";
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
    const indiv = makeIndiv(
      index,
      findEmptyLocation(options.simulation.random, options.simulation.grid),
      options.isGeneration0
        ? makeRandomGenome(options.simulation)
        : generateChildGenome(options.simulation, options.parentGenomes),
      options.simulation
    );
    options.simulation.peeps.individuals.push(indiv);
  }
};

export const spawnNewGeneration = (
  simulation: Simulation,
  murderCount: number
) => {
  let sacrificedCount = 0; // for the altruism challenge

  // This container will hold the indexes and survival scores (0.0..1.0)
  // of all the survivors who will provide genomes for repopulation.
  let parents: { index: number; score: number }[] = [];

  // This container will hold the genomes of the survivors
  let parentGenomes: Genome[] = [];

  if (simulation.options.challenge != Challenge.Altruism) {
    // First, make a list of all the individuals who will become parents; save
    // their scores for later sorting. Indexes start at 1.
    for (let index = 1; index <= simulation.options.population; ++index) {
      let [passed, score] = passedSurvivalCriterion(
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

    let considerKinship = true;
    let sacrificesIndexes: number[] = []; // those who gave their lives for the greater good

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

    let generationToApplyKinship = 10;
    let altruismFactor = 10; // the saved:sacrificed ratio

    if (considerKinship) {
      if (simulation.generation > generationToApplyKinship) {
        // Todo: optimize!!!
        let threshold = 0.7;

        let survivingKin: typeof parents[number][] = [];
        for (let passes = 0; passes < altruismFactor; ++passes) {
          for (let sacrificedIndex of sacrificesIndexes) {
            // randomize the next loop so we don't keep using the first one repeatedly
            let startIndex = getRandomInt(
              simulation.random,
              0,
              parents.length - 1
            );
            for (let count = 0; count < parents.length; ++count) {
              let possibleParent =
                parents[(startIndex + count) % parents.length];
              let g1 = simulation.peeps.individuals[sacrificedIndex].genome;
              let g2 =
                simulation.peeps.individuals[possibleParent.index].genome;
              let similarity = genomeSimilarity(
                simulation.options.genomeComparisonMethod,
                g1,
                g2
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
      let numberSaved = sacrificedCount * altruismFactor;
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
    parentGenomes.push(simulation.peeps.individuals[parent.index].genome);
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
