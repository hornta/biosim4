import structuredClone from "@ungap/structured-clone";
import { makeSimulation, startSimulation } from "../dist/index.js";

global.structuredClone = structuredClone;

let sum = 0;
let count = 0;
let avg = 0;
let start = performance.now();
const simulation = makeSimulation();
startSimulation(simulation, {
	onGenerationEnd({ generationStep }) {},
	onSimulationEnd({ simulationStep }) {
		const end = performance.now();
		const diff = end - start;
		sum += diff;
		count++;
		avg = Math.floor(sum / count);
		start = performance.now();

		if (count % 100 === 0) {
			console.log("Average simulation: " + avg);
		}
	},
});
