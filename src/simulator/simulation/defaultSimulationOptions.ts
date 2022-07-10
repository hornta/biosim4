import { BarrierType } from "../grid/barrierType.js";
import { Challenge } from "../challenge.js";
import { GenomComparisonMethod } from "../neuralNet/genomComparisonMethod.js";
import { SimulatorOptions } from "./simulatorOptions.js";

export const defaultOptions: SimulatorOptions = {
  sizeX: 128,
  sizeY: 128,
  population: 3000,
  stepsPerGeneration: 3, // 1
  maxGenerations: 200000,
  signalLayers: 1,
  genomeMaxLength: 300,
  genomeInitialLengthMin: 24,
  genomeInitialLengthMax: 24,
  maxNumberNeurons: 5,
  killEnable: false,
  sexualReproduction: true,
  chooseParentsByFitness: true,
  mutationRate: 0.001,
  geneInsertionDeletionRate: 0,
  deletionRatio: 0.5,
  populationSensorRadius: 2.5,
  longProbeDistance: 16,
  shortProbeBarrierDistance: 4,
  signalSensorRadius: 2,
  responsivenessCurveKFactor: 2,
  genomeComparisonMethod: GenomComparisonMethod.HammingDistanceBits,
  challenge: Challenge.CornerWeighted,
  barrierType: BarrierType.None,
  rngSeed: "kalleanka",
};
