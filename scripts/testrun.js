import structuredClone from "@ungap/structured-clone";
import {
	makeSimulation,
	defaultOptions,
	startSimulation,
} from "../dist/index.js";

// eslint-disable-next-line no-undef
global.structuredClone = structuredClone;

let sum = 0;
let count = 0;
let avg = 0;
let start = performance.now();
const simulation = makeSimulation({
	...defaultOptions,
	maxGenerations: 5,
	stepsPerGeneration: 200,
});
startSimulation(simulation, {
	onSimulationEnd() {
		const end = performance.now();
		const diff = end - start;
		sum += diff;
		count++;
		avg = Math.floor(sum / count);
		start = performance.now();

		if (count % 100 === 0) {
			console.log("Average simulation time: " + avg + "ms");
		}
	},
});
