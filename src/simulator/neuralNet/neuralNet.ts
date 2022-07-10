import type { Gene } from "./gene.js";
import type { Neuron } from "./neuron.js";

export interface NeuralNet {
	connections: Gene[];
	neurons: Neuron[];
}
