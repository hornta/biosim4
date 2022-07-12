import type { Coord } from "../src/index.js";
import { makeSimulation, visitNeighbourhood } from "../src/index.js";
import { test } from "vitest";

test("visitNeighbourhood()", () => {
	const printLocation = (location: Coord) => {
		console.log(location.x + ", " + location.y);
	};

	const simulation = makeSimulation();

	console.log("Test location 10, 10 radius 1");
	visitNeighbourhood({
		location: { x: 10, y: 10 },
		radius: 1.0,
		onVisit: printLocation,
		gridHeight: simulation.options.sizeY,
		gridWidth: simulation.options.sizeX,
	});

	console.log("Test location 0, 0 radius 1");
	visitNeighbourhood({
		location: { x: 0, y: 0 },
		radius: 1.0,
		onVisit: printLocation,
		gridHeight: simulation.options.sizeY,
		gridWidth: simulation.options.sizeX,
	});

	console.log("Test location 10, 10 radius 1.4");
	visitNeighbourhood({
		location: { x: 10, y: 10 },
		radius: 1.4,
		onVisit: printLocation,
		gridHeight: simulation.options.sizeY,
		gridWidth: simulation.options.sizeX,
	});

	console.log("Test location 10, 10 radius 1.5");
	visitNeighbourhood({
		location: { x: 10, y: 10 },
		radius: 1.5,
		onVisit: printLocation,
		gridHeight: simulation.options.sizeY,
		gridWidth: simulation.options.sizeX,
	});

	console.log("Test location 1, 1 radius 1.4");
	visitNeighbourhood({
		location: { x: 1, y: 1 },
		radius: 1.4,
		onVisit: printLocation,
		gridHeight: simulation.options.sizeY,
		gridWidth: simulation.options.sizeX,
	});

	console.log("Test location 10, 10 radius 2");
	visitNeighbourhood({
		location: { x: 10, y: 10 },
		radius: 2,
		onVisit: printLocation,
		gridHeight: simulation.options.sizeY,
		gridWidth: simulation.options.sizeX,
	});

	console.log("Test location sizeX - 1, sizeY - 1 radius 2");
	visitNeighbourhood({
		location: {
			x: simulation.options.sizeX - 1,
			y: simulation.options.sizeY - 1,
		},
		radius: 2,
		onVisit: printLocation,
		gridHeight: simulation.options.sizeY,
		gridWidth: simulation.options.sizeX,
	});
});
