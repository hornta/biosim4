import { addDirectionToCoord } from "./coord.js";
import { genomeSimilarity, isInBounds, isOccupiedAt, Sensor } from "./index.js";
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

export const sensors: Record<
	Sensor,
	(indiv: Indiv, simulationStep: number) => number
> = {
	[Sensor.Age]: function ageSensor(indiv) {
		return indiv.age / indiv.simulation.options.stepsPerGeneration;
	},
	[Sensor.BoundaryDistance]: function boundaryDistanceSensor(indiv) {
		const distX = Math.min(
			indiv.location.x,
			indiv.simulation.options.sizeX - indiv.location.x - 1
		);
		const distY = Math.min(
			indiv.location.y,
			indiv.simulation.options.sizeY - indiv.location.y - 1
		);
		const closest = Math.min(distX, distY);
		const maxPossible = Math.min(
			indiv.simulation.options.sizeX / 2 - 1,
			indiv.simulation.options.sizeY / 2 - 1
		);
		return closest / maxPossible;
	},
	[Sensor.BoundaryDistanceX]: function boundaryDistanceXSensor(indiv) {
		const minDistX = Math.min(
			indiv.location.x,
			indiv.simulation.options.sizeX - indiv.location.x - 1
		);
		return minDistX / indiv.simulation.options.sizeX / 2;
	},
	[Sensor.BoundaryDistanceY]: function boundaryDistanceYSensor(indiv) {
		const minDistY = Math.min(
			indiv.location.y,
			indiv.simulation.options.sizeY - indiv.location.y - 1
		);
		return minDistY / indiv.simulation.options.sizeY / 2;
	},
	[Sensor.LastMoveDirectionX]: function lastMoveDirectionXSensor(indiv) {
		const lastX = indiv.lastMoveDirection.asNormalizedCoord().x;
		return lastX === 0 ? 0.5 : lastX === -1 ? 0 : 1;
	},
	[Sensor.LastMoveDirectionY]: function lastMoveDirectionYSensor(indiv) {
		const lastY = indiv.lastMoveDirection.asNormalizedCoord().y;
		return lastY === 0 ? 0.5 : lastY === -1 ? 0 : 1;
	},
	[Sensor.LocationX]: function locationXSensor(indiv) {
		return indiv.location.x / (indiv.simulation.options.sizeX - 1);
	},
	[Sensor.LocationY]: function locationYSensor(indiv) {
		return indiv.location.y / (indiv.simulation.options.sizeY - 1);
	},
	[Sensor.Oscilliator]: (indiv, simulationStep) => {
		const phase =
			(simulationStep % indiv.oscilliatePeriod) / indiv.oscilliatePeriod;
		let factor = -Math.cos(phase * 2 * Math.PI);
		factor += 1;
		factor /= 2;
		return Math.min(1, Math.max(0, factor));
	},
	[Sensor.LongProbePopulationForward]: (indiv) => {
		return longProbePopulationForward(indiv) / indiv.longProbeDistance;
	},
	[Sensor.LongProbeBarriersForward]: (indiv) => {
		return longProbeBarrierForward(indiv) / indiv.longProbeDistance;
	},
	[Sensor.Population]: (indiv) => {
		let countLocations = 0;
		let countOccupied = 0;
		const center = indiv.location;

		visitNeighbourhood({
			location: center,
			radius: indiv.simulation.options.populationSensorRadius,
			gridWidth: indiv.simulation.options.sizeX,
			gridHeight: indiv.simulation.options.sizeY,
			onVisit: (location) => {
				++countLocations;
				if (isOccupiedAt(indiv.simulation.grid, location)) {
					++countOccupied;
				}
			},
		});
		return countOccupied / countLocations;
	},
	[Sensor.PopulationForward]: function populationForwardSensor(indiv) {
		return getPopulationDensityAlongAxis(indiv, indiv.lastMoveDirection);
	},
	[Sensor.PopulationLeftRight]: (indiv) => {
		return getPopulationDensityAlongAxis(
			indiv,
			indiv.lastMoveDirection.rotate90DegreesClockWise()
		);
	},
	[Sensor.BarrierForward]: (indiv) => {
		return getShortProbeBarrierDistance(indiv, indiv.lastMoveDirection);
	},
	[Sensor.BarrierLeftRight]: (indiv) => {
		return getShortProbeBarrierDistance(
			indiv,
			indiv.lastMoveDirection.rotate90DegreesClockWise()
		);
	},
	[Sensor.Random]: (indiv) => {
		return indiv.simulation.random.next();
	},
	[Sensor.Signal0]: (indiv) => {
		return getSignalDensity(indiv, 0);
	},
	[Sensor.Signal0Forward]: (indiv) => {
		return getSignalDensityAlongAxis(indiv, 0, indiv.lastMoveDirection);
	},
	[Sensor.Signal0LeftRight]: (indiv) => {
		return getSignalDensityAlongAxis(
			indiv,
			0,
			indiv.lastMoveDirection.rotate90DegreesClockWise()
		);
	},
	[Sensor.GeneticSimilarityForward]: (indiv) => {
		const loc2 = addDirectionToCoord(indiv.location, indiv.lastMoveDirection);
		if (
			isInBounds(indiv.simulation.grid, loc2) &&
			isOccupiedAt(indiv.simulation.grid, loc2)
		) {
			const indiv2 =
				indiv.simulation.peeps.individuals[
					indiv.simulation.grid.data[loc2.x].data[loc2.y]
				];
			if (indiv2.alive) {
				return genomeSimilarity(
					indiv.simulation.options.genomeComparisonMethod,
					indiv.genome,
					indiv2.genome
				); // 0.0..1.0
			}
		}
		return 0;
	},
};

export const getSensor = (
	indiv: Indiv,
	sensor: Sensor,
	simulationStep: number
) => {
	return sensors[sensor](indiv, simulationStep);
};
