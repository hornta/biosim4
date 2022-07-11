import type { Coord } from "./coord.js";
import {
	addDirectionToCoord,
	coordsAreIdentical,
	subtractCoord,
	subtractDirectionFromCoord,
} from "./coord.js";
import type { Dir } from "./dir.js";
import { directionAsNormalizedCoord } from "./dir.js";
import { randomDirection8 } from "./dir.js";
import type { Gene, Genome } from "./neuralNet/gene.js";
import { SinkType, SourceType, weightAsFloat } from "./neuralNet/gene.js";
import {
	isBarrierAt,
	isEmptyAt,
	isInBounds,
	isOccupiedAt,
} from "./grid/grid.js";
import type { NeuralNet } from "./neuralNet/neuralNet.js";
import { numberOfSensors } from "./neuralNet/sensor.js";
import { getMagnitude, SIGNAL_MAX } from "./signals/signal.js";
import type { Simulation } from "./simulation/simulator.js";
import { SensorAction } from "./neuralNet/sensorActions.js";
import { sensors } from "./getSensor.js";

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

export const getPopulationDensityAlongAxis = (indiv: Indiv, dir: Dir) => {
	let sum = 0.0;
	const dirVec = directionAsNormalizedCoord(dir);
	const len = Math.sqrt(dirVec.x * dirVec.x + dirVec.y * dirVec.y);
	const dirVecX = dirVec.x / len;
	const dirVecY = dirVec.y / len; // Unit vector components along dir

	visitNeighbourhood({
		location: indiv.location,
		radius: indiv.simulation.options.populationSensorRadius,
		onVisit(tloc) {
			if (
				coordsAreIdentical(tloc, indiv.location) &&
				isOccupiedAt(indiv.simulation.grid, tloc)
			) {
				const offset = subtractCoord(tloc, indiv.location);
				const proj = dirVecX * offset.x + dirVecY * offset.y; // Magnitude of projection along dir
				const contrib = proj / (offset.x * offset.x + offset.y * offset.y);
				sum += contrib;
			}
		},
		gridWidth: indiv.simulation.options.sizeX,
		gridHeight: indiv.simulation.options.sizeY,
	});

	const maxSumMag = 6.0 * indiv.simulation.options.populationSensorRadius;

	let sensorVal;
	sensorVal = sum / maxSumMag; // convert to -1.0..1.0
	sensorVal = (sensorVal + 1.0) / 2.0; // convert to 0.0..1.0

	return sensorVal;
};

export const getShortProbeBarrierDistance = (indiv: Indiv, dir: Dir) => {
	let countFwd = 0;
	let countRev = 0;
	let loc = addDirectionToCoord(indiv.location, dir);
	let numLocsToTest = indiv.simulation.options.shortProbeBarrierDistance;
	// Scan positive direction
	while (
		numLocsToTest > 0 &&
		isInBounds(indiv.simulation.grid, loc) &&
		!isBarrierAt(indiv.simulation.grid, loc)
	) {
		++countFwd;
		loc = addDirectionToCoord(loc, dir);
		--numLocsToTest;
	}
	if (numLocsToTest > 0 && !isInBounds(indiv.simulation.grid, loc)) {
		countFwd = indiv.simulation.options.shortProbeBarrierDistance;
	}
	// Scan negative direction
	numLocsToTest = indiv.simulation.options.shortProbeBarrierDistance;
	loc = subtractDirectionFromCoord(indiv.location, dir);
	while (
		numLocsToTest > 0 &&
		isInBounds(indiv.simulation.grid, loc) &&
		!isBarrierAt(indiv.simulation.grid, loc)
	) {
		++countRev;
		loc = subtractDirectionFromCoord(loc, dir);
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

export const getSignalDensity = (indiv: Indiv, layerNum: number) => {
	let countLocs = 0;
	let sum = 0;
	const center = indiv.location;

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
	const maxSum = countLocs * SIGNAL_MAX;
	const sensorVal = sum / maxSum; // convert to 0.0..1.0

	return sensorVal;
};

export const getSignalDensityAlongAxis = (
	indiv: Indiv,
	layerNum: number,
	dir: Dir
) => {
	let sum = 0.0;
	const dirVec = directionAsNormalizedCoord(dir);
	const len = Math.sqrt(dirVec.x * dirVec.x + dirVec.y * dirVec.y);
	const dirVecX = dirVec.x / len;
	const dirVecY = dirVec.y / len; // Unit vector components along dir

	visitNeighbourhood({
		location: indiv.location,
		radius: indiv.simulation.options.signalSensorRadius,
		onVisit(location) {
			if (!coordsAreIdentical(location, indiv.location)) {
				const offset = subtractCoord(location, indiv.location);
				const proj = dirVecX * offset.x + dirVecY * offset.y; // Magnitude of projection along dir
				const contrib =
					(proj *
						getMagnitude(indiv.simulation.signals, layerNum, indiv.location)) /
					(offset.x * offset.x + offset.y * offset.y);
				sum += contrib;
			}
		},
		gridHeight: indiv.simulation.options.sizeY,
		gridWidth: indiv.simulation.options.sizeX,
	});

	const maxSumMag =
		6.0 * indiv.simulation.options.signalSensorRadius * SIGNAL_MAX;
	let sensorVal = sum / maxSumMag; // convert to -1.0..1.0
	sensorVal = (sensorVal + 1.0) / 2.0; // convert to 0.0..1.0

	return sensorVal;
};

export const longProbePopulationForward = (indiv: Indiv) => {
	let count = 0;
	let loc = addDirectionToCoord(indiv.location, indiv.lastMoveDirection);
	let numLocsToTest = indiv.longProbeDistance;
	while (
		numLocsToTest > 0 &&
		isInBounds(indiv.simulation.grid, loc) &&
		isEmptyAt(indiv.simulation.grid, loc)
	) {
		++count;
		loc = addDirectionToCoord(loc, indiv.lastMoveDirection);
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

export const longProbeBarrierForward = (indiv: Indiv) => {
	let count = 0;
	let loc = addDirectionToCoord(indiv.location, indiv.lastMoveDirection);
	let numLocsToTest = indiv.longProbeDistance;
	while (
		numLocsToTest > 0 &&
		isInBounds(indiv.simulation.grid, loc) &&
		!isBarrierAt(indiv.simulation.grid, loc)
	) {
		++count;
		loc = addDirectionToCoord(loc, indiv.lastMoveDirection);
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
		const x = location.x + dx;
		const extentY = Math.floor(Math.sqrt(radius * radius - dx * dx));
		for (
			let dy = -Math.min(extentY, location.y);
			dy <= Math.min(extentY, gridHeight - location.y - 1);
			++dy
		) {
			const y = location.y + dy;
			onVisit({ x, y });
		}
	}
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
		}
		if (conn.sourceType == SourceType.Neuron) {
			let it: Node = nodeMap[conn.sourceNum];
			if (it === undefined) {
				it = {
					numInputsFromSensorsOrOtherNeurons: 0,
					numOutputs: 0,
					numSelfInputs: 0,
					remappedNumber: 0,
				};

				nodeMap[conn.sourceNum] = it;
			}
			it.numOutputs++;
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

	let newNumber = 0;
	for (const node of Object.values(nodeMap)) {
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
			inputVal = sensors[connection.sourceNum](indiv, simulationStep);
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
