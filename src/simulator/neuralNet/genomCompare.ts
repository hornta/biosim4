import type { Gene } from "./gene.js";
import type { GenomComparisonMethod } from "./genomComparisonMethod.js";

const countBits = (n: number) => {
	n = n - ((n >> 1) & 0x55555555);
	n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
	return (((n + (n >> 4)) & 0xf0f0f0f) * 0x1010101) >> 24;
};

export const genesMatch = (g1: Gene, g2: Gene) => {
	return (
		g1.sinkNum === g2.sinkNum &&
		g1.sourceNum === g2.sourceNum &&
		g1.sinkType === g2.sinkType &&
		g1.sourceType === g2.sourceType &&
		g1.weight === g2.weight
	);
};

export const jaroWinklerDistance = (
	genomes: Uint32Array,
	genome1Offset: number,
	genome1Length: number,
	genome2Offset: number,
	genome2Length: number
) => {
	const max = (a: number, b: number) => {
		return a > b ? a : b;
	};
	const min = (a: number, b: number) => {
		return a < b ? a : b;
	};

	let i, j, l;
	let m = 0;
	let t = 0;
	let sl = genome1Length;
	let al = genome2Length;

	const maxNumGenesToCompare = 20;
	sl = min(maxNumGenesToCompare, sl); // optimization: approximate for long genomes
	al = min(maxNumGenesToCompare, al);

	const sflags = Array(sl).fill(0);
	const aflags = Array(al).fill(0);
	const range = max(0, max(sl, al) / 2 - 1);

	if (!sl || !al) {
		return 0.0;
	}

	/* calculate matching characters */
	for (i = 0; i < al; i++) {
		for (j = max(i - range, 0), l = min(i + range + 1, sl); j < l; j++) {
			if (
				genomes[genome2Offset + i] === genomes[genome1Offset + j] &&
				!sflags[j]
			) {
				sflags[j] = 1;
				aflags[i] = 1;
				m++;
				break;
			}
		}
	}

	if (!m) {
		return 0.0;
	}

	/* calculate character transpositions */
	l = 0;
	for (i = 0; i < al; i++) {
		if (aflags[i] == 1) {
			for (j = l; j < sl; j++) {
				if (sflags[j] == 1) {
					l = j + 1;
					break;
				}
			}
			if (genomes[genome2Offset + i] !== genomes[genome1Offset + j]) {
				t++;
			}
		}
	}
	t /= 2;

	/* Jaro distance */
	const dw = (m / sl + m / al + (m - t) / m) / 3.0;
	return dw;
};

export const hammingDistanceBits = (
	genomes: Uint32Array,
	genome1Offset: number,
	genome1Length: number,
	genome2Offset: number
) => {
	let p1 = 0;
	let p2 = 0;
	const bytesPerElement = 4;
	const lengthBytes = genome1Length * bytesPerElement;
	const lengthBits = lengthBytes * 8;
	let bitCount = 0;

	for (let index = 0; index < genome1Length; ++p1, ++p2, ++index) {
		bitCount += countBits(
			genomes[genome1Offset + p1] ^ genomes[genome2Offset + p2]
		);
	}

	// For two completely random bit patterns, about half the bits will differ,
	// resulting in c. 50% match. We will scale that by 2X to make the range
	// from 0 to 1.0. We clip the value to 1.0 in case the two patterns are
	// negatively correlated for some reason.
	return 1.0 - Math.min(1.0, (2.0 * bitCount) / lengthBits);
};

export const hammingDistanceBytes = (
	genomes: Uint32Array,
	genome1Offset: number,
	genome1Length: number,
	genome2Offset: number
) => {
	let p1 = 0;
	let p2 = 0;
	const bytesPerElement = 4;
	const lengthBytes = genome1Length * bytesPerElement;
	let byteCount = 0;

	for (let index = 0; index < genome1Length; ++p1, ++p2, ++index) {
		byteCount += Number(
			genomes[genome1Offset + p1] === genomes[genome2Offset + p2]
		);
	}

	return byteCount / lengthBytes;
};

export const genomeSimilarity = (
	genomeComparisonMethod: GenomComparisonMethod,
	genomes: Uint32Array,
	g1Offset: number,
	g1Length: number,
	g2Offset: number,
	g2Length: number
) => {
	switch (genomeComparisonMethod) {
		case 0:
			return jaroWinklerDistance(
				genomes,
				g1Offset,
				g1Length,
				g2Offset,
				g2Length
			);
		case 1:
			return hammingDistanceBits(genomes, g1Offset, g1Length, g2Offset);
		case 2:
			return hammingDistanceBytes(genomes, g1Offset, g1Length, g2Offset);
		default:
			throw new Error(
				"Missing implementation for genome comparison method: " +
					genomeComparisonMethod
			);
	}
};
