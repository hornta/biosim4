import type { Coord } from "../coord.js";
import type { Indiv } from "../indiv.js";
import { visitNeighbourhood } from "../indiv.js";
import type { Simulation } from "../simulation/simulator.js";

export const SIGNAL_MAX = 255;

export type Signal = Uint8Array;

export const makeSignal = (
	signalLayers: number,
	width: number,
	height: number
) => {
	const signals = new Uint8Array(
		new SharedArrayBuffer(width * height * signalLayers)
	);

	return signals;
};

export const getMagnitude = (
	signal: Signal,
	layerNum: number,
	location: Coord,
	width: number,
	height: number
) => {
	const index = layerNum * width * height + location.x * width + location.y;
	return signal[index];
};

export const increment = (indiv: Indiv, layerNum: number) => {
	const radius = 1.5;
	const centerIncreaseAmount = 2;
	const neighborIncreaseAmount = 1;

	visitNeighbourhood({
		location: indiv.location,
		radius,
		onVisit: (loc: Coord) => {
			if (
				indiv.simulation.signals[
					layerNum *
						indiv.simulation.options.sizeX *
						indiv.simulation.options.sizeY +
						loc.x * indiv.simulation.options.sizeX +
						loc.y
				] < SIGNAL_MAX
			) {
				indiv.simulation.signals[
					layerNum *
						indiv.simulation.options.sizeX *
						indiv.simulation.options.sizeY +
						loc.x * indiv.simulation.options.sizeX +
						loc.y
				] = Math.min(
					SIGNAL_MAX,
					indiv.simulation.signals[
						layerNum *
							indiv.simulation.options.sizeX *
							indiv.simulation.options.sizeY +
							loc.x * indiv.simulation.options.sizeX +
							loc.y
					] + neighborIncreaseAmount
				);
			}
		},
		gridHeight: indiv.simulation.options.sizeY,
		gridWidth: indiv.simulation.options.sizeX,
	});

	if (
		indiv.simulation.signals[
			layerNum *
				indiv.simulation.options.sizeX *
				indiv.simulation.options.sizeY +
				indiv.location.x * indiv.simulation.options.sizeX +
				indiv.location.y
		] < SIGNAL_MAX
	) {
		indiv.simulation.signals[
			layerNum *
				indiv.simulation.options.sizeX *
				indiv.simulation.options.sizeY +
				indiv.location.x * indiv.simulation.options.sizeX +
				indiv.location.y
		] = Math.min(
			SIGNAL_MAX,
			indiv.simulation.signals[
				layerNum *
					indiv.simulation.options.sizeX *
					indiv.simulation.options.sizeY +
					indiv.location.x * indiv.simulation.options.sizeX +
					indiv.location.y
			] + centerIncreaseAmount
		);
	}
};

export const clearSignal = (signal: Signal) => {
	signal.fill(0);
};

export const fadeSignal = (simulation: Simulation, layerNum: number) => {
	const fadeAmount = 1;

	for (let x = 0; x < simulation.options.sizeX; ++x) {
		for (let y = 0; y < simulation.options.sizeY; ++y) {
			if (
				simulation.signals[
					layerNum * simulation.options.sizeX * simulation.options.sizeY +
						x * simulation.options.sizeX +
						y
				] >= fadeAmount
			) {
				simulation.signals[
					layerNum * simulation.options.sizeX * simulation.options.sizeY +
						x * simulation.options.sizeX +
						y
				] -= fadeAmount; // fade center cell
			} else {
				simulation.signals[
					layerNum * simulation.options.sizeX * simulation.options.sizeY +
						x * simulation.options.sizeX +
						y
				] = 0;
			}
		}
	}
};
