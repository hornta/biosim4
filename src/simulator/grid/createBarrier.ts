import { BarrierType } from "./barrierType.js";
import { Coord } from "../coord.js";
import { BARRIER, Grid } from "./grid.js";
import { visitNeighbourhood } from "../indiv.js";
import { getRandomInt } from "../random.js";
import { Simulation } from "../simulation/simulator.js";

export const createBarrier = (simulation: Simulation) => {
  simulation.grid.barrierCenters = [];
  simulation.grid.barrierLocations = [];

  const drawBox = (minX: number, minY: number, maxX: number, maxY: number) => {
    for (let x = minX; x <= maxX; ++x) {
      for (let y = minY; y <= maxY; ++y) {
        simulation.grid.data[x].data[y] = BARRIER;
        simulation.grid.barrierLocations.push(new Coord(x, y));
      }
    }
  };

  switch (simulation.options.barrierType) {
    case BarrierType.None:
      break;

    case BarrierType.HorizontalBar: {
      let minX = simulation.options.sizeX / 4;
      let maxX = minX + simulation.options.sizeX / 2;
      let minY = simulation.options.sizeY / 2 + simulation.options.sizeY / 4;
      let maxY = minY + 2;

      for (let x = minX; x <= maxX; ++x) {
        for (let y = minY; y <= maxY; ++y) {
          simulation.grid.data[x].data[y] = BARRIER;
          simulation.grid.barrierLocations.push(new Coord(x, y));
        }
      }
      break;
    }

    case BarrierType.Spots: {
      let numberOfLocations = 5;
      let radius = 5.0;

      let verticalSliceSize =
        simulation.options.sizeY / (numberOfLocations + 1);

      for (let n = 1; n <= numberOfLocations; ++n) {
        let loc = new Coord(
          simulation.options.sizeX / 2,
          n * verticalSliceSize
        );
        visitNeighbourhood({
          location: loc,
          radius,
          onVisit(loc) {
            simulation.grid.data[loc.x].data[loc.y] = BARRIER;
            simulation.grid.barrierLocations.push(loc);
          },
          gridHeight: simulation.options.sizeY,
          gridWidth: simulation.options.sizeX,
        });
        simulation.grid.barrierCenters.push(loc);
      }
      break;
    }

    case BarrierType.ThreeFloatingIslands: {
      let radius = 3.0;
      let margin = 2 * radius;

      let randomLoc = () => {
        return new Coord(
          getRandomInt(
            simulation.random,
            margin,
            simulation.options.sizeX - margin
          ),
          getRandomInt(
            simulation.random,
            margin,
            simulation.options.sizeY - margin
          )
        );
      };

      let center0 = randomLoc();
      let center1: Coord;
      let center2: Coord;

      do {
        center1 = randomLoc();
      } while (center0.subtract(center1).length() < margin);

      do {
        center2 = randomLoc();
      } while (
        center0.subtract(center2).length() < margin ||
        center1.subtract(center2).length() < margin
      );

      simulation.grid.barrierCenters.push(center0);

      visitNeighbourhood({
        location: center0,
        radius,
        onVisit: (loc) => {
          simulation.grid.data[loc.x].data[loc.y] = BARRIER;
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
          simulation.grid.data[x].data[y] = BARRIER;
          simulation.grid.barrierLocations.push(new Coord(x, y));
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
          simulation.grid.data[x].data[y] = BARRIER;
          simulation.grid.barrierLocations.push(new Coord(x, y));
        }
      }
      break;
    }

    case BarrierType.FiveBlocksStaggered: {
      let blockSizeX = 2;
      let blockSizeY = simulation.options.sizeX / 3;

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
      throw new Error("Missim");
  }
};
