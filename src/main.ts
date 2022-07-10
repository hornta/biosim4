import {
  makeSimulation,
  startSimulation,
} from "./simulator/simulation/simulator.js";

const simulation = makeSimulation();
startSimulation(simulation, {
  onSimulationEnd({ simulationStep }) {
    console.log("end simulation " + simulationStep);
  },
  onGenerationEnd({ generationStep }) {
    console.log("end generation " + generationStep);
  },
});
