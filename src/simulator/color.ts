import type { Genome } from "./index.js";

export const makeGeneticColor = (genome: Genome) => {
	return (
		(genome.length & 1) |
		(genome[0].sourceType << 1) |
		(genome[genome.length - 1].sourceType << 2) |
		(genome[0].sinkType << 3) |
		(genome[genome.length - 1].sinkType << 4) |
		((genome[0].sourceNum & 1) << 5) |
		((genome[0].sinkNum & 1) << 6) |
		((genome[genome.length - 1].sourceNum & 1) << 7)
	);
};
