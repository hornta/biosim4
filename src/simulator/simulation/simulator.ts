import { Random } from "@hornta/random";
import { defaultOptions } from "./defaultSimulationOptions.js";
import { handleEndOfSimulation } from "./endOfSimulation.js";
import { executeActions } from "./executeActions.js";
import { Grid, makeGrid } from "../grid/grid.js";
import { feedForward, Indiv } from "../indiv.js";
import { makePeeps, Peeps } from "../peeps.js";
import { makeRandoms } from "../random.js";
import { RunMode } from "./runMode.js";
import { makeSignal, Signal } from "../signals/signal.js";
import { SimulatorOptions, validateOptions } from "./simulatorOptions.js";
import {
  initializeGeneration,
  spawnNewGeneration,
} from "./spawnNewGeneration.js";
import assert from "assert";

const simulateIndiv = (indiv: Indiv, simulationStep: number) => {
  indiv.age += 1;
  const actionLevels = feedForward(indiv, simulationStep);
  executeActions(indiv, actionLevels);
};

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
    peeps: makePeeps(),
    random: mainRandom,
    signals: makeSignal(options.signalLayers, options.sizeX, options.sizeY),
  };

  return simulation;
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
}

export const startSimulation = (
  simulation: Simulation,
  startSimulationOptions?: StartSimulationOptions
) => {
  let runMode = RunMode.Run;
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

    const numberOfSurvivors = spawnNewGeneration(simulation, murdererCount);

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
