import structuredClone from "@ungap/structured-clone";
import {
	defaultOptions,
	makeSimulation,
	startSimulation,
} from "../src/index.js";
import { test } from "vitest";

test.only("run", () => {
	const prevStructuredClone = global.structuredClone;
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
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
				console.log("Average simulation: " + avg);
			}
		},
	});

	global.structuredClone = prevStructuredClone;
});
