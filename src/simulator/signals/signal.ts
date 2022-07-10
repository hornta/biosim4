import { Coord } from "../coord.js";
import { Indiv, visitNeighbourhood } from "../indiv.js";
import { Simulation } from "../simulation/simulator.js";
import { Layer, makeLayer } from "./layer.js";

export const SIGNAL_MAX = 255;

export interface Signal {
  layers: Layer[];
}

export const makeSignal = (
  signalLayers: number,
  width: number,
  height: number
) => {
  const signal: Signal = {
    layers: Array.from({ length: signalLayers }).map(() => {
      return makeLayer(width, height);
    }),
  };

  return signal;
};

export const getMagnitude = (
  signal: Signal,
  layerNum: number,
  location: Coord
) => {
  return signal.layers[layerNum].columns[location.x].data[location.y];
};

export const increment = (indiv: Indiv, layerNum: number) => {
  let radius = 1.5;
  let centerIncreaseAmount = 2;
  let neighborIncreaseAmount = 1;

  visitNeighbourhood({
    location: indiv.location,
    radius,
    onVisit: (loc: Coord) => {
      if (
        indiv.simulation.signals.layers[layerNum].columns[loc.x].data[loc.y] <
        SIGNAL_MAX
      ) {
        indiv.simulation.signals.layers[layerNum].columns[loc.x].data[loc.y] =
          Math.min(
            SIGNAL_MAX,
            indiv.simulation.signals.layers[layerNum].columns[loc.x].data[
              loc.y
            ] + neighborIncreaseAmount
          );
      }
    },
    gridHeight: indiv.simulation.options.sizeY,
    gridWidth: indiv.simulation.options.sizeX,
  });

  if (
    indiv.simulation.signals.layers[layerNum].columns[indiv.location.x].data[
      indiv.location.y
    ] < SIGNAL_MAX
  ) {
    indiv.simulation.signals.layers[layerNum].columns[indiv.location.x].data[
      indiv.location.y
    ] = Math.min(
      SIGNAL_MAX,
      indiv.simulation.signals.layers[layerNum].columns[indiv.location.x].data[
        indiv.location.y
      ] + centerIncreaseAmount
    );
  }
};

export const clearSignal = (signal: Signal) => {
  for (const layer of signal.layers) {
    for (const column of layer.columns) {
      column.data.fill(0);
    }
  }
};

export const fadeSignal = (simulation: Simulation, layerNum: number) => {
  let fadeAmount = 1;

  for (let x = 0; x < simulation.options.sizeX; ++x) {
    for (let y = 0; y < simulation.options.sizeY; ++y) {
      if (
        simulation.signals.layers[layerNum].columns[x].data[y] >= fadeAmount
      ) {
        simulation.signals.layers[layerNum].columns[x].data[y] -= fadeAmount; // fade center cell
      } else {
        simulation.signals.layers[layerNum].columns[x].data[y] = 0;
      }
    }
  }
};
