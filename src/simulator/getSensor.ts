import { addDirectionToCoord } from "./coord.js";
import type { Grid, Peeps, Signal, SimulatorOptions } from "./index.js";
import { PeepVitalStatus } from "./index.js";
import {
	directionAsNormalizedCoord,
	genomeSimilarity,
	isInBounds,
	isOccupiedAt,
	rotate90DegreesClockWise,
} from "./index.js";
import { Sensor } from "./neuralNet/index.js";
import type { Indiv } from "./indiv.js";
import {
	getPopulationDensityAlongAxis,
	getShortProbeBarrierDistance,
	getSignalDensity,
	getSignalDensityAlongAxis,
	longProbeBarrierForward,
	longProbePopulationForward,
} from "./indiv.js";
import { visitNeighbourhood } from "./indiv.js";
import type { Random } from "@hornta/random";

export const sensors: Record<
	Sensor,
	(options: {
		indiv: Omit<Indiv, "simulation">;
		simulationStep: number;
		random: Random;
		options: SimulatorOptions;
		signals: Signal;
		grid: Grid;
		peeps: Peeps;
	}) => number
> = {
	[Sensor.Age]: function ageSensor({ indiv, options }) {
		return indiv.age / options.stepsPerGeneration;
	},
	[Sensor.BoundaryDistance]: function boundaryDistanceSensor({
		indiv,
		options,
	}) {
		const distX = Math.min(
			indiv.location.x,
			options.sizeX - indiv.location.x - 1
		);
		const distY = Math.min(
			indiv.location.y,
			options.sizeY - indiv.location.y - 1
		);
		const closest = Math.min(distX, distY);
		const maxPossible = Math.min(options.sizeX / 2 - 1, options.sizeY / 2 - 1);
		return closest / maxPossible;
	},
	[Sensor.BoundaryDistanceX]: function boundaryDistanceXSensor({
		indiv,
		options,
	}) {
		const minDistX = Math.min(
			indiv.location.x,
			options.sizeX - indiv.location.x - 1
		);
		return minDistX / options.sizeX / 2;
	},
	[Sensor.BoundaryDistanceY]: function boundaryDistanceYSensor({
		indiv,
		options,
	}) {
		const minDistY = Math.min(
			indiv.location.y,
			options.sizeY - indiv.location.y - 1
		);
		return minDistY / options.sizeY / 2;
	},
	[Sensor.LastMoveDirectionX]: function lastMoveDirectionXSensor({ indiv }) {
		const lastX = directionAsNormalizedCoord(indiv.lastMoveDirection).x;
		return lastX === 0 ? 0.5 : lastX === -1 ? 0 : 1;
	},
	[Sensor.LastMoveDirectionY]: function lastMoveDirectionYSensor({ indiv }) {
		const lastY = directionAsNormalizedCoord(indiv.lastMoveDirection).y;
		return lastY === 0 ? 0.5 : lastY === -1 ? 0 : 1;
	},
	[Sensor.LocationX]: function locationXSensor({ indiv, options }) {
		return indiv.location.x / (options.sizeX - 1);
	},
	[Sensor.LocationY]: function locationYSensor({ indiv, options }) {
		return indiv.location.y / (options.sizeY - 1);
	},
	[Sensor.Oscilliator]: ({ indiv, simulationStep }) => {
		const phase =
			(simulationStep % indiv.oscilliatePeriod) / indiv.oscilliatePeriod;
		let factor = -Math.cos(phase * 2 * Math.PI);
		factor += 1;
		factor /= 2;
		return Math.min(1, Math.max(0, factor));
	},
	[Sensor.LongProbePopulationForward]: ({ indiv, grid }) => {
		return longProbePopulationForward(indiv, grid) / indiv.longProbeDistance;
	},
	[Sensor.LongProbeBarriersForward]: ({ indiv, grid }) => {
		return longProbeBarrierForward(indiv, grid) / indiv.longProbeDistance;
	},
	[Sensor.Population]: ({ indiv, options, grid }) => {
		let countLocations = 0;
		let countOccupied = 0;
		const center = indiv.location;

		visitNeighbourhood({
			location: center,
			radius: options.populationSensorRadius,
			gridWidth: options.sizeX,
			gridHeight: options.sizeY,
			onVisit: (location) => {
				++countLocations;
				if (isOccupiedAt(grid, location)) {
					++countOccupied;
				}
			},
		});
		return countOccupied / countLocations;
	},
	[Sensor.PopulationForward]: function populationForwardSensor({
		indiv,
		options,
		grid,
	}) {
		return getPopulationDensityAlongAxis(
			indiv,
			indiv.lastMoveDirection,
			options,
			grid
		);
	},
	[Sensor.PopulationLeftRight]: ({ indiv, options, grid }) => {
		return getPopulationDensityAlongAxis(
			indiv,
			rotate90DegreesClockWise(indiv.lastMoveDirection),
			options,
			grid
		);
	},
	[Sensor.BarrierForward]: ({ indiv, options, grid }) => {
		return getShortProbeBarrierDistance(
			indiv,
			indiv.lastMoveDirection,
			options,
			grid
		);
	},
	[Sensor.BarrierLeftRight]: ({ indiv, options, grid }) => {
		return getShortProbeBarrierDistance(
			indiv,
			rotate90DegreesClockWise(indiv.lastMoveDirection),
			options,
			grid
		);
	},
	[Sensor.Random]: ({ random }) => {
		return random.next();
	},
	[Sensor.Signal0]: ({ indiv, options, signals }) => {
		return getSignalDensity(indiv, 0, options, signals);
	},
	[Sensor.Signal0Forward]: ({ indiv, options, signals }) => {
		return getSignalDensityAlongAxis(
			indiv,
			0,
			indiv.lastMoveDirection,
			options,
			signals
		);
	},
	[Sensor.Signal0LeftRight]: ({ indiv, options, signals }) => {
		return getSignalDensityAlongAxis(
			indiv,
			0,
			rotate90DegreesClockWise(indiv.lastMoveDirection),
			options,
			signals
		);
	},
	[Sensor.GeneticSimilarityForward]: ({ indiv, options, grid, peeps }) => {
		const loc2 = addDirectionToCoord(indiv.location, indiv.lastMoveDirection);
		if (isInBounds(grid, loc2) && isOccupiedAt(grid, loc2)) {
			const otherIndivIndex = grid.data[loc2.x * grid.width + loc2.y];
			if (peeps.peepsAlive[otherIndivIndex] === PeepVitalStatus.Alive) {
				const indivGenomeLength = peeps.peepsGenomeLengths[indiv.index - 1];

				const otherIndivGenomeLength =
					peeps.peepsGenomeLengths[otherIndivIndex - 1];

				return genomeSimilarity(
					options.genomeComparisonMethod,
					peeps.peepsGenomes,
					indiv.index - 1,
					indivGenomeLength,
					otherIndivIndex - 1,
					otherIndivGenomeLength
				); // 0.0..1.0
			}
		}
		return 0;
	},
};
