import assert from "assert";
import { Indiv } from "../indiv.js";
import { Gene, SinkType, SourceType } from "./gene.js";
import { Neuron } from "./neuron.js";

export interface NeuralNet {
  connections: Gene[];
  neurons: Neuron[];
}

// export const assertNeuralNetIsOk = (indiv: Indiv) => {
//   const neuronIndicies = indiv.neuralNet.neurons.map((_, index) => index);
//   for (const connection of indiv.neuralNet.connections) {
//     if (connection.sinkType === SinkType.Neuron) {
//       if (!neuronIndicies.includes(connection.sinkNum)) {
//         debugger;
//         assert(false);
//       }
//     } else if (connection.sourceType === SourceType.Neuron) {
//       if (!neuronIndicies.includes(connection.sourceNum)) {
//         console.log(connection);
//         debugger;
//         assert(false);
//       }
//     }
//   }
// };
