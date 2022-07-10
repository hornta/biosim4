import { Random } from "@hornta/random";
import { getRandomInt } from "../random.js";
import { Sensor } from "./sensor.js";
import { Simulation } from "../simulation/simulator.js";

export enum SourceType {
  Neuron,
  Sensor,
}

export enum SinkType {
  Neuron,
  Action,
}

export interface Gene {
  sourceType: SourceType;
  sourceNum: Sensor;
  sinkType: SinkType;
  sinkNum: number;
  weight: number;
}

export const geneToNumber = (gene: Gene) => {
  return (
    gene.sourceType |
    ((gene.sourceNum << 1) | (gene.sinkType << 8) | (gene.sinkNum << 9)) |
    (gene.weight << 16)
  );
  // const bitsSourceType = gene.sourceType.toString(2);
  // const bitsSourceNum = gene.sourceNum.toString(2);
  // const bitsSinkType = gene.sinkType.toString(2);
  // const bitsSinkNum = gene.sinkNum.toString(2);
  // const bitsWeight = gene.weight.toString(2);
  // return parseInt(
  //   bitsSourceType +
  //     "" +
  //     bitsSourceNum +
  //     "" +
  //     bitsSinkType +
  //     "" +
  //     bitsSinkNum +
  //     "" +
  //     bitsWeight,
  //   2
  // );
};

const numberToGene = (number: number) => {
  const bits = number.toString(2);
  const gene: Gene = {
    sourceType: parseInt(bits[0], 2),
    sourceNum: parseInt(bits.slice(1, 7), 2),
    sinkType: parseInt(bits[7], 2),
    sinkNum: parseInt(bits.slice(8, 15), 2),
    weight: parseInt(bits.slice(15), 2),
  };
  return gene;
};

export const weightAsFloat = (gene: Gene) => {
  return gene.weight / 8192;
};

const makeRandomWeight = (random: Random) => {
  return getRandomInt(random, 0, 0xffff) - 0x8000;
};

export type Genome = Gene[];

export const makeRandomGenome = (simulation: Simulation) => {
  let genome: Genome = [];

  let length = getRandomInt(
    simulation.random,
    simulation.options.genomeInitialLengthMin,
    simulation.options.genomeInitialLengthMax
  );
  for (let n = 0; n < length; ++n) {
    genome.push(makeRandomGene(simulation.random));
  }

  return genome;
};

const makeRandomGene = (random: Random) => {
  const gene: Gene = {
    sourceType: random.uint32() & 1,
    sourceNum: getRandomInt(random, 0, 0x7fff),
    sinkType: random.uint32() & 1,
    sinkNum: getRandomInt(random, 0, 0x7fff),
    weight: makeRandomWeight(random),
  };
  return gene;
};
