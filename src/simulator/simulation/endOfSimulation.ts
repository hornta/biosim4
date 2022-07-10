import { Challenge } from "../challenge.js";
import { drainDeathQueue, drainMoveQueue, queueForDeath } from "../peeps.js";
import { RANDOM_UINT_MAX } from "../random.js";
import { fadeSignal } from "../signals/signal.js";
import { Simulation } from "./simulator.js";

export const handleEndOfSimulation = (
  simulation: Simulation,
  simulationStep: number
) => {
  if (simulation.options.challenge == Challenge.RadioactiveWalls) {
    let radioactiveX =
      simulationStep < simulation.options.stepsPerGeneration / 2
        ? 0
        : simulation.options.sizeX - 1;

    for (let index = 1; index <= simulation.options.population; ++index) {
      let indiv = simulation.peeps.individuals[index];
      if (indiv.alive) {
        let distanceFromRadioactiveWall = Math.abs(
          indiv.location.x - radioactiveX
        );
        if (distanceFromRadioactiveWall < simulation.options.sizeX / 2) {
          let chanceOfDeath = 1.0 / distanceFromRadioactiveWall;
          if (simulation.random.uint32() / RANDOM_UINT_MAX < chanceOfDeath) {
            queueForDeath(simulation.peeps, indiv);
          }
        }
      }
    }
  }

  if (simulation.options.challenge == Challenge.TouchAnyWall) {
    for (let index = 1; index <= simulation.options.population; ++index) {
      let indiv = simulation.peeps.individuals[index];
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
    let radius = 9.0;
    for (let index = 1; index <= simulation.options.population; ++index) {
      // index 0 is reserved
      let indiv = simulation.peeps.individuals[index];
      for (let n = 0; n < simulation.grid.barrierCenters.length; ++n) {
        let bit = 1 << n;
        if ((indiv.challengeBits & bit) == 0) {
          if (
            indiv.location
              .subtract(simulation.grid.barrierCenters[n])
              .length() <= radius
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
