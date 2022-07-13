import { BarrierType } from "./barrierType.js";
import type { Coord } from "../coord.js";
import { getCoordLength, subtractCoord } from "../coord.js";
import { BARRIER } from "./grid.js";
import { visitNeighbourhood } from "../indiv.js";
import { getRandomInt } from "../random.js";
import type { Simulation } from "../simulation/simulator.js";

export const createBarrier = (simulation: Simulation) => {
	simulation.grid.numBarrierCenters = 0;
	simulation.grid.barrierCenters.fill(0);
	simulation.grid.barrierLocations = [];

	const drawBox = (minX: number, minY: number, maxX: number, maxY: number) => {
		for (let x = minX; x <= maxX; ++x) {
			for (let y = minY; y <= maxY; ++y) {
				simulation.grid.data[x * simulation.grid.width + y] = BARRIER;
				simulation.grid.barrierLocations.push({ x, y });
			}
		}
	};

	switch (simulation.options.barrierType) {
		case BarrierType.None:
			break;

		case BarrierType.HorizontalBar: {
			const minX = simulation.options.sizeX / 4;
			const maxX = minX + simulation.options.sizeX / 2;
			const minY = simulation.options.sizeY / 2 + simulation.options.sizeY / 4;
			const maxY = minY + 2;

			for (let x = minX; x <= maxX; ++x) {
				for (let y = minY; y <= maxY; ++y) {
					simulation.grid.data[x * simulation.grid.width + y] = BARRIER;
					simulation.grid.barrierLocations.push({ x, y });
				}
			}
			break;
		}

		case BarrierType.Spots: {
			const numberOfLocations = 5;
			const radius = 5.0;

			const verticalSliceSize =
				simulation.options.sizeY / (numberOfLocations + 1);

			for (let n = 1; n <= numberOfLocations; ++n) {
				const loc = {
					x: simulation.options.sizeX / 2,
					y: n * verticalSliceSize,
				};
				visitNeighbourhood({
					location: loc,
					radius,
					onVisit(loc) {
						simulation.grid.data[loc.x * simulation.grid.width + loc.y] =
							BARRIER;
						simulation.grid.barrierLocations.push(loc);
					},
					gridHeight: simulation.options.sizeY,
					gridWidth: simulation.options.sizeX,
				});
				const index = simulation.grid.numBarrierCenters * 2;
				simulation.grid.barrierCenters[index] = loc.x;
				simulation.grid.barrierCenters[index + 1] = loc.y;
				simulation.grid.numBarrierCenters++;
			}
			break;
		}

		case BarrierType.ThreeFloatingIslands: {
			const radius = 3.0;
			const margin = 2 * radius;

			const randomLoc = () => {
				return {
					x: getRandomInt(
						simulation.random,
						margin,
						simulation.options.sizeX - margin
					),
					y: getRandomInt(
						simulation.random,
						margin,
						simulation.options.sizeY - margin
					),
				};
			};

			const center0 = randomLoc();
			let center1: Coord;
			let center2: Coord;

			do {
				center1 = randomLoc();
			} while (getCoordLength(subtractCoord(center0, center1)) < margin);

			do {
				center2 = randomLoc();
			} while (
				getCoordLength(subtractCoord(center0, center2)) < margin ||
				getCoordLength(subtractCoord(center1, center2)) < margin
			);

			const index = simulation.grid.numBarrierCenters * 2;
			simulation.grid.barrierCenters[index] = center0.x;
			simulation.grid.barrierCenters[index + 1] = center0.y;
			simulation.grid.numBarrierCenters++;

			visitNeighbourhood({
				location: center0,
				radius,
				onVisit: (loc) => {
					simulation.grid.data[loc.x * simulation.grid.width + loc.y] = BARRIER;
					simulation.grid.barrierLocations.push(loc);
				},
				gridHeight: simulation.options.sizeY,
				gridWidth: simulation.options.sizeX,
			});
			break;
		}

		case BarrierType.VerticalBar: {
			const minX = simulation.options.sizeX / 2;
			const maxX = minX + 1;
			const minY = simulation.options.sizeY / 4;
			const maxY = minY + simulation.options.sizeY / 2;
			for (let x = minX; x <= maxX; ++x) {
				for (let y = minY; y <= maxY; ++y) {
					simulation.grid.data[x * simulation.grid.width + y] = BARRIER;
					simulation.grid.barrierLocations.push({ x, y });
				}
			}
			break;
		}

		case BarrierType.VerticalBarRandom: {
			const minX =
				getRandomInt(simulation.random, 20, simulation.options.sizeX - 20) / 2;
			const maxX = minX + 1;
			const minY = getRandomInt(
				simulation.random,
				20,
				simulation.options.sizeY / 2 - 20
			);
			const maxY = minY + simulation.options.sizeY / 2;
			for (let x = minX; x <= maxX; ++x) {
				for (let y = minY; y <= maxY; ++y) {
					simulation.grid.data[x * simulation.grid.width + y] = BARRIER;
					simulation.grid.barrierLocations.push({ x, y });
				}
			}
			break;
		}

		case BarrierType.FiveBlocksStaggered: {
			const blockSizeX = 2;
			const blockSizeY = simulation.options.sizeX / 3;

			let x0 = simulation.options.sizeX / 4 - blockSizeX / 2;
			let y0 = simulation.options.sizeY / 4 - blockSizeY / 2;
			let x1 = x0 + blockSizeX;
			let y1 = y0 + blockSizeY;

			drawBox(x0, y0, x1, y1);
			x0 += simulation.options.sizeX / 2;
			x1 = x0 + blockSizeX;
			drawBox(x0, y0, x1, y1);
			y0 += simulation.options.sizeY / 2;
			y1 = y0 + blockSizeY;
			drawBox(x0, y0, x1, y1);
			x0 -= simulation.options.sizeX / 2;
			x1 = x0 + blockSizeX;
			drawBox(x0, y0, x1, y1);
			x0 = simulation.options.sizeX / 2 - blockSizeX / 2;
			x1 = x0 + blockSizeX;
			y0 = simulation.options.sizeY / 2 - blockSizeY / 2;
			y1 = y0 + blockSizeY;
			drawBox(x0, y0, x1, y1);
			break;
		}

		default:
			throw new Error("Missing barrier implementation");
	}
};
