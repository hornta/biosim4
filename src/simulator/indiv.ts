import { Coord } from "./coord.js";
import { Dir, randomDirection8 } from "./dir.js";
import {
  Gene,
  Genome,
  SinkType,
  SourceType,
  weightAsFloat,
} from "./neuralNet/gene.js";
import { genomeSimilarity } from "./neuralNet/genomCompare.js";
import {
  isBarrierAt,
  isEmptyAt,
  isInBounds,
  isOccupiedAt,
} from "./grid/grid.js";
import { NeuralNet } from "./neuralNet/neuralNet.js";
import { numberOfSensors, Sensor } from "./neuralNet/sensor.js";
import { getMagnitude, SIGNAL_MAX } from "./signals/signal.js";
import { Simulation } from "./simulation/simulator.js";
import assert from "assert";
import { SensorAction } from "./neuralNet/sensorActions.js";

const INITIAL_NEURON_OUTPUT = 0.5;

export interface Indiv {
  alive: boolean;
  index: number;
  location: Coord;
  birthLocation: Coord;
  age: number;
  genome: Genome;
  neuralNet: NeuralNet;
  responsiveness: number;
  oscilliatePeriod: number;
  longProbeDistance: number;
  lastMoveDirection: Dir;
  challengeBits: number;
  simulation: Simulation;
}

const getPopulationDensityAlongAxis = (indiv: Indiv, dir: Dir) => {
  let sum = 0.0;
  let dirVec = dir.asNormalizedCoord();
  let len = Math.sqrt(dirVec.x * dirVec.x + dirVec.y * dirVec.y);
  let dirVecX = dirVec.x / len;
  let dirVecY = dirVec.y / len; // Unit vector components along dir

  visitNeighbourhood({
    location: indiv.location,
    radius: indiv.simulation.options.populationSensorRadius,
    onVisit(tloc) {
      if (
        tloc.equals(indiv.location) &&
        isOccupiedAt(indiv.simulation.grid, tloc)
      ) {
        let offset = tloc.subtract(indiv.location);
        let proj = dirVecX * offset.x + dirVecY * offset.y; // Magnitude of projection along dir
        let contrib = proj / (offset.x * offset.x + offset.y * offset.y);
        sum += contrib;
      }
    },
    gridWidth: indiv.simulation.options.sizeX,
    gridHeight: indiv.simulation.options.sizeY,
  });

  let maxSumMag = 6.0 * indiv.simulation.options.populationSensorRadius;

  let sensorVal;
  sensorVal = sum / maxSumMag; // convert to -1.0..1.0
  sensorVal = (sensorVal + 1.0) / 2.0; // convert to 0.0..1.0

  return sensorVal;
};

const getShortProbeBarrierDistance = (indiv: Indiv, dir: Dir) => {
  let countFwd = 0;
  let countRev = 0;
  let loc = indiv.location.addDirection(dir);
  let numLocsToTest = indiv.simulation.options.shortProbeBarrierDistance;
  // Scan positive direction
  while (
    numLocsToTest > 0 &&
    isInBounds(indiv.simulation.grid, loc) &&
    !isBarrierAt(indiv.simulation.grid, loc)
  ) {
    ++countFwd;
    loc = loc.addDirection(dir);
    --numLocsToTest;
  }
  if (numLocsToTest > 0 && !isInBounds(indiv.simulation.grid, loc)) {
    countFwd = indiv.simulation.options.shortProbeBarrierDistance;
  }
  // Scan negative direction
  numLocsToTest = indiv.simulation.options.shortProbeBarrierDistance;
  loc = indiv.location.subtractDirection(dir);
  while (
    numLocsToTest > 0 &&
    isInBounds(indiv.simulation.grid, loc) &&
    !isBarrierAt(indiv.simulation.grid, loc)
  ) {
    ++countRev;
    loc = loc.subtractDirection(dir);
    --numLocsToTest;
  }
  if (numLocsToTest > 0 && !isInBounds(indiv.simulation.grid, loc)) {
    countRev = indiv.simulation.options.shortProbeBarrierDistance;
  }

  let sensorVal =
    countFwd - countRev + indiv.simulation.options.shortProbeBarrierDistance;
  sensorVal =
    sensorVal / 2.0 / indiv.simulation.options.shortProbeBarrierDistance;
  return sensorVal;
};

const getSignalDensity = (indiv: Indiv, layerNum: number) => {
  let countLocs = 0;
  let sum = 0;
  let center = indiv.location;

  visitNeighbourhood({
    location: center,
    radius: indiv.simulation.options.signalSensorRadius,
    onVisit: (location) => {
      ++countLocs;
      sum += getMagnitude(indiv.simulation.signals, layerNum, location);
    },
    gridHeight: indiv.simulation.options.sizeY,
    gridWidth: indiv.simulation.options.sizeX,
  });
  let maxSum = countLocs * SIGNAL_MAX;
  let sensorVal = sum / maxSum; // convert to 0.0..1.0

  return sensorVal;
};

const getSignalDensityAlongAxis = (
  indiv: Indiv,
  layerNum: number,
  dir: Dir
) => {
  let sum = 0.0;
  let dirVec = dir.asNormalizedCoord();
  let len = Math.sqrt(dirVec.x * dirVec.x + dirVec.y * dirVec.y);
  let dirVecX = dirVec.x / len;
  let dirVecY = dirVec.y / len; // Unit vector components along dir

  visitNeighbourhood({
    location: indiv.location,
    radius: indiv.simulation.options.signalSensorRadius,
    onVisit(location) {
      if (!location.equals(indiv.location)) {
        let offset = location.subtract(indiv.location);
        let proj = dirVecX * offset.x + dirVecY * offset.y; // Magnitude of projection along dir
        let contrib =
          (proj *
            getMagnitude(indiv.simulation.signals, layerNum, indiv.location)) /
          (offset.x * offset.x + offset.y * offset.y);
        sum += contrib;
      }
    },
    gridHeight: indiv.simulation.options.sizeY,
    gridWidth: indiv.simulation.options.sizeX,
  });

  let maxSumMag =
    6.0 * indiv.simulation.options.signalSensorRadius * SIGNAL_MAX;
  let sensorVal = sum / maxSumMag; // convert to -1.0..1.0
  sensorVal = (sensorVal + 1.0) / 2.0; // convert to 0.0..1.0

  return sensorVal;
};

const longProbePopulationForward = (indiv: Indiv) => {
  let count = 0;
  let loc = indiv.location.addDirection(indiv.lastMoveDirection);
  let numLocsToTest = indiv.longProbeDistance;
  while (
    numLocsToTest > 0 &&
    isInBounds(indiv.simulation.grid, loc) &&
    isEmptyAt(indiv.simulation.grid, loc)
  ) {
    ++count;
    loc = loc.addDirection(indiv.lastMoveDirection);
    --numLocsToTest;
  }
  if (
    numLocsToTest > 0 &&
    (!isInBounds(indiv.simulation.grid, loc) ||
      isBarrierAt(indiv.simulation.grid, loc))
  ) {
    return indiv.longProbeDistance;
  } else {
    return count;
  }
};

const longProbeBarrierForward = (indiv: Indiv) => {
  let count = 0;
  let loc = indiv.location.addDirection(indiv.lastMoveDirection);
  let numLocsToTest = indiv.longProbeDistance;
  while (
    numLocsToTest > 0 &&
    isInBounds(indiv.simulation.grid, loc) &&
    !isBarrierAt(indiv.simulation.grid, loc)
  ) {
    ++count;
    loc = loc.addDirection(indiv.lastMoveDirection);
    --numLocsToTest;
  }
  if (numLocsToTest > 0 && !isInBounds(indiv.simulation.grid, loc)) {
    return indiv.longProbeDistance;
  } else {
    return count;
  }
};

export interface VisitNeighbourhoodOptions {
  location: Coord;
  radius: number;
  onVisit: (location: Coord) => void;
  gridWidth: number;
  gridHeight: number;
}

export const visitNeighbourhood = ({
  location,
  radius,
  onVisit,
  gridWidth,
  gridHeight,
}: VisitNeighbourhoodOptions) => {
  for (
    let dx = -Math.floor(Math.min(radius, location.x));
    dx <= Math.min(radius, gridWidth - location.x - 1);
    ++dx
  ) {
    let x = location.x + dx;
    let extentY = Math.floor(Math.sqrt(radius * radius - dx * dx));
    for (
      let dy = -Math.min(extentY, location.y);
      dy <= Math.min(extentY, gridHeight - location.y - 1);
      ++dy
    ) {
      let y = location.y + dy;
      onVisit(new Coord(x, y));
    }
  }
};

export const getSensor = (
  indiv: Indiv,
  sensor: Sensor,
  simulationStep: number
) => {
  let sensorValue = 0;
  switch (sensor) {
    case Sensor.Age:
      sensorValue = indiv.age / indiv.simulation.options.stepsPerGeneration;
      break;

    case Sensor.BoundaryDistance: {
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
      sensorValue = closest / maxPossible;
      break;
    }

    case Sensor.BoundaryDistanceX: {
      const minDistX = Math.min(
        indiv.location.x,
        indiv.simulation.options.sizeX - indiv.location.x - 1
      );
      sensorValue = minDistX / indiv.simulation.options.sizeX / 2;
      break;
    }

    case Sensor.BoundaryDistanceY: {
      const minDistY = Math.min(
        indiv.location.y,
        indiv.simulation.options.sizeY - indiv.location.y - 1
      );
      sensorValue = minDistY / indiv.simulation.options.sizeY / 2;
      break;
    }

    case Sensor.LastMoveDirectionX: {
      const lastX = indiv.lastMoveDirection.asNormalizedCoord().x;
      sensorValue = lastX === 0 ? 0.5 : lastX === -1 ? 0 : 1;
      break;
    }

    case Sensor.LastMoveDirectionY: {
      const lastY = indiv.lastMoveDirection.asNormalizedCoord().y;
      sensorValue = lastY === 0 ? 0.5 : lastY === -1 ? 0 : 1;
      break;
    }

    case Sensor.LocationX:
      sensorValue = indiv.location.x / (indiv.simulation.options.sizeX - 1);
      break;

    case Sensor.LocationY:
      sensorValue = indiv.location.y / (indiv.simulation.options.sizeY - 1);
      break;

    case Sensor.Oscilliator: {
      const phase =
        (simulationStep % indiv.oscilliatePeriod) / indiv.oscilliatePeriod;
      let factor = -Math.cos(phase * 2 * Math.PI);
      factor += 1;
      factor /= 2;
      sensorValue = factor;
      sensorValue = Math.min(1, Math.max(0, sensorValue));
      break;
    }

    case Sensor.LongProbePopulationForward:
      sensorValue = longProbePopulationForward(indiv) / indiv.longProbeDistance;
      break;

    case Sensor.LongProbeBarriersForward:
      sensorValue = longProbeBarrierForward(indiv) / indiv.longProbeDistance;
      break;

    case Sensor.Population: {
      let countLocations = 0;
      let countOccupied = 0;
      let center = indiv.location;

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
      sensorValue = countOccupied / countLocations;
      break;
    }

    case Sensor.PopulationForward:
      sensorValue = getPopulationDensityAlongAxis(
        indiv,
        indiv.lastMoveDirection
      );
      break;

    case Sensor.PopulationLeftRight:
      sensorValue = getPopulationDensityAlongAxis(
        indiv,
        indiv.lastMoveDirection.rotate90DegreesClockWise()
      );
      break;

    case Sensor.BarrierForward:
      sensorValue = getShortProbeBarrierDistance(
        indiv,
        indiv.lastMoveDirection
      );
      break;

    case Sensor.BarrierLeftRight:
      sensorValue = getShortProbeBarrierDistance(
        indiv,
        indiv.lastMoveDirection.rotate90DegreesClockWise()
      );
      break;

    case Sensor.Random:
      sensorValue = indiv.simulation.random.next();
      break;

    case Sensor.Signal0:
      sensorValue = getSignalDensity(indiv, 0);
      break;

    case Sensor.Signal0Forward:
      sensorValue = getSignalDensityAlongAxis(
        indiv,
        0,
        indiv.lastMoveDirection
      );
      break;

    case Sensor.Signal0LeftRight:
      sensorValue = getSignalDensityAlongAxis(
        indiv,
        0,
        indiv.lastMoveDirection.rotate90DegreesClockWise()
      );
      break;

    case Sensor.GeneticSimilarityForward: {
      let loc2 = indiv.location.addDirection(indiv.lastMoveDirection);
      if (
        isInBounds(indiv.simulation.grid, loc2) &&
        isOccupiedAt(indiv.simulation.grid, loc2)
      ) {
        const indiv2 =
          indiv.simulation.peeps.individuals[
            indiv.simulation.grid.data[loc2.x].data[loc2.y]
          ];
        if (indiv2.alive) {
          sensorValue = genomeSimilarity(
            indiv.simulation.options.genomeComparisonMethod,
            indiv.genome,
            indiv2.genome
          ); // 0.0..1.0
        }
      }
      break;
    }

    default:
      throw new Error("Missing implementation of sensor: " + sensor);
  }

  return sensorValue;
};

interface Node {
  remappedNumber: number;
  numOutputs: number;
  numSelfInputs: number;
  numInputsFromSensorsOrOtherNeurons: number;
}

type NodeMap = Record<number, Node>;

type ConnectionList = Gene[];

const makeRenumberedConnectionList = (
  simulation: Simulation,
  connectionList: ConnectionList,
  genome: Genome
) => {
  connectionList.length = 0;
  for (const gene of genome) {
    connectionList.push(gene);
    const connection = connectionList.at(-1)!;

    if (connection.sourceType === SourceType.Neuron) {
      connection.sourceNum %= simulation.options.maxNumberNeurons;
    } else {
      connection.sourceNum %= numberOfSensors;
    }

    if (connection.sinkType == SinkType.Neuron) {
      connection.sinkNum %= simulation.options.maxNumberNeurons;
    } else {
      connection.sinkNum %= SensorAction.NumActions;
    }
  }
};

const makeNodeList = (
  simulation: Simulation,
  nodeMap: NodeMap,
  connectionList: ConnectionList
) => {
  Object.keys(nodeMap).forEach((key) => {
    delete nodeMap[Number(key)];
  });

  for (const conn of connectionList) {
    if (conn.sinkType === SinkType.Neuron) {
      let it = nodeMap[conn.sinkNum];
      if (it === undefined) {
        assert.ok(conn.sinkNum < simulation.options.maxNumberNeurons);
        it = {
          numOutputs: 0,
          numSelfInputs: 0,
          numInputsFromSensorsOrOtherNeurons: 0,
          remappedNumber: 0,
        };
        nodeMap[conn.sinkNum] = it;
      }

      if (
        conn.sourceType === SourceType.Neuron &&
        conn.sourceNum === conn.sinkNum
      ) {
        it.numSelfInputs++;
      } else {
        it.numInputsFromSensorsOrOtherNeurons++;
      }
      assert(nodeMap[conn.sinkNum] !== undefined);
    }
    if (conn.sourceType == SourceType.Neuron) {
      let it: Node = nodeMap[conn.sourceNum];
      if (it === undefined) {
        assert.ok(conn.sourceNum < simulation.options.maxNumberNeurons);

        it = {
          numInputsFromSensorsOrOtherNeurons: 0,
          numOutputs: 0,
          numSelfInputs: 0,
          remappedNumber: 0,
        };

        nodeMap[conn.sourceNum] = it;
      }
      it.numOutputs++;
      assert(nodeMap[conn.sourceNum] !== undefined);
    }
  }
};

const removeConnectionsToNeuron = (
  connections: ConnectionList,
  nodeMap: NodeMap,
  neuronNumber: number
) => {
  for (let i = connections.length - 1; i >= 0; --i) {
    if (
      connections[i].sinkType === SinkType.Neuron &&
      connections[i].sinkNum === neuronNumber
    ) {
      if (connections[i].sourceType == SourceType.Neuron) {
        --nodeMap[connections[i].sourceNum].numOutputs;
      }
      connections.splice(i, 1);
    }
  }
};

const cullUselessNeurons = (
  simulation: Simulation,
  connections: ConnectionList,
  nodeMap: NodeMap
) => {
  let allDone = false;
  while (!allDone) {
    allDone = true;
    const entries = Object.entries(nodeMap);
    const keysToDelete: number[] = [];
    for (const [neuronNumber, node] of entries) {
      const numericNeuronNumber = Number(neuronNumber);
      assert(numericNeuronNumber < simulation.options.maxNumberNeurons);
      if (node.numOutputs === node.numSelfInputs) {
        allDone = false;
        removeConnectionsToNeuron(connections, nodeMap, numericNeuronNumber);
        keysToDelete.push(numericNeuronNumber);
      }
    }
    for (const key of keysToDelete) {
      delete nodeMap[key];
    }
  }
};

const createWiringFromGenome = (simulation: Simulation, genome: Genome) => {
  const nodeMap: NodeMap = {};
  const connectionList: ConnectionList = [];

  makeRenumberedConnectionList(simulation, connectionList, genome);
  makeNodeList(simulation, nodeMap, connectionList);
  cullUselessNeurons(simulation, connectionList, nodeMap);

  assert(Object.keys(nodeMap).length <= simulation.options.maxNumberNeurons);

  let newNumber = 0;
  for (const node of Object.values(nodeMap)) {
    assert(node.numOutputs !== 0);
    node.remappedNumber = newNumber;
    newNumber += 1;
  }

  const neuralNet: NeuralNet = {
    connections: [],
    neurons: [],
  };

  for (const connection of connectionList) {
    if (connection.sinkType == SinkType.Neuron) {
      neuralNet.connections.push(connection);
      connection.sinkNum = nodeMap[connection.sinkNum].remappedNumber;

      if (connection.sourceType == SourceType.Neuron) {
        connection.sourceNum = nodeMap[connection.sourceNum].remappedNumber;
      }
    }
  }

  for (const connection of connectionList) {
    if (connection.sinkType == SinkType.Action) {
      neuralNet.connections.push(connection);

      if (connection.sourceType == SourceType.Neuron) {
        connection.sourceNum = nodeMap[connection.sourceNum].remappedNumber;
      }
    }
  }

  for (const node of Object.values(nodeMap)) {
    neuralNet.neurons.push({
      driven: node.numInputsFromSensorsOrOtherNeurons !== 0,
      output: INITIAL_NEURON_OUTPUT,
    });
  }

  return neuralNet;
};

export const makeIndiv = (
  index: number,
  location: Coord,
  genome: Genome,
  simulation: Simulation
) => {
  const neuralNet = createWiringFromGenome(simulation, genome);
  const indiv: Indiv = {
    age: 0,
    alive: true,
    birthLocation: location,
    challengeBits: 0,
    genome: genome,
    index,
    lastMoveDirection: randomDirection8(simulation.random),
    location,
    longProbeDistance: simulation.options.longProbeDistance,
    neuralNet,
    oscilliatePeriod: 34,
    responsiveness: 0.5,
    simulation,
  };
  return indiv;
};

export const feedForward = (indiv: Indiv, simulationStep: number) => {
  const actionLevels = Array<number>(SensorAction.NumActions).fill(0);
  const neuronAccumulators = Array(indiv.neuralNet.neurons.length).fill(0);
  let isNeuronOutputsComputed = false;
  for (const connection of indiv.neuralNet.connections) {
    if (connection.sinkType === SinkType.Action && !isNeuronOutputsComputed) {
      for (
        let neuronIndex = 0;
        neuronIndex < indiv.neuralNet.neurons.length;
        ++neuronIndex
      ) {
        if (indiv.neuralNet.neurons[neuronIndex].driven) {
          indiv.neuralNet.neurons[neuronIndex].output = Math.tanh(
            neuronAccumulators[neuronIndex]
          );
        }
      }
      isNeuronOutputsComputed = true;
    }

    let inputVal: number;
    if (connection.sourceType === SourceType.Sensor) {
      inputVal = getSensor(indiv, connection.sourceNum, simulationStep);
    } else {
      inputVal = indiv.neuralNet.neurons[connection.sourceNum].output;
    }

    if (connection.sinkType === SinkType.Action) {
      actionLevels[connection.sinkNum] += inputVal * weightAsFloat(connection);
    } else {
      neuronAccumulators[connection.sinkNum] +=
        inputVal * weightAsFloat(connection);
    }
  }
  return actionLevels;
};
