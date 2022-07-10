import { Challenge } from "../challenge.js";
import { Coord } from "../coord.js";
import { isBorder, isInBounds, isOccupiedAt } from "../grid/grid.js";
import type { Indiv } from "../indiv.js";
import { visitNeighbourhood } from "../indiv.js";

function bitCount32(n: number) {
	n = n - ((n >> 1) & 0x55555555);
	n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
	return (((n + (n >> 4)) & 0xf0f0f0f) * 0x1010101) >> 24;
}

function bitCount(n: number) {
	let bits = 0;
	while (n !== 0) {
		bits += bitCount32(n | 0);
		n /= 0x100000000;
	}
	return bits;
}

export const passedSurvivalCriterion = (indiv: Indiv, challenge: Challenge) => {
	if (!indiv.alive) {
		return [false, 0] as const;
	}

	const p = indiv.simulation.options;
	const grid = indiv.simulation.grid;

	switch (challenge) {
		// Survivors are those inside the circular area defined by
		// safeCenter and radius
		case Challenge.Circle: {
			const safeCenter = new Coord(p.sizeX / 4.0, p.sizeY / 4.0);
			const radius = p.sizeX / 4.0;

			const offset = safeCenter.subtract(indiv.location);
			const distance = offset.length();
			return distance <= radius
				? ([true, (radius - distance) / radius] as const)
				: ([false, 0.0] as const);
		}

		// Survivors are all those on the right side of the arena
		case Challenge.RightHalf:
			return indiv.location.x > p.sizeX / 2
				? ([true, 1.0] as const)
				: ([false, 0.0] as const);

		// Survivors are all those on the right quarter of the arena
		case Challenge.RightQuarter:
			return indiv.location.x > p.sizeX / 2 + p.sizeX / 4
				? ([true, 1.0] as const)
				: ([false, 0.0] as const);

		// Survivors are all those on the left eighth of the arena
		case Challenge.LeftEight:
			return indiv.location.x < p.sizeX / 8
				? ([true, 1.0] as const)
				: ([false, 0.0] as const);

		// Survivors are those not touching the border and with exactly the number
		// of neighbors defined by neighbors and radius, where neighbors includes self
		case Challenge.String: {
			const minNeighbors = 22;
			const maxNeighbors = 2;
			const radius = 1.5;

			if (isBorder(grid, indiv.location)) {
				return [false, 0.0] as const;
			}

			let count = 0;

			visitNeighbourhood({
				location: indiv.location,
				radius,
				onVisit(loc2) {
					if (isOccupiedAt(grid, loc2)) {
						++count;
					}
				},
				gridHeight: p.sizeY,
				gridWidth: p.sizeX,
			});
			if (count >= minNeighbors && count <= maxNeighbors) {
				return [true, 1.0] as const;
			} else {
				return [false, 0.0] as const;
			}
		}

		// Survivors are those within the specified radius of the center. The score
		// is linearly weighted by distance from the center.
		case Challenge.CenterWeighted: {
			const safeCenter = new Coord(p.sizeX / 2.0, p.sizeY / 2.0);
			const radius = p.sizeX / 3.0;

			const offset = safeCenter.subtract(indiv.location);
			const distance = offset.length();
			return distance <= radius
				? ([true, (radius - distance) / radius] as const)
				: ([false, 0.0] as const);
		}

		// Survivors are those within the specified radius of the center
		case Challenge.CenterUnweighted: {
			const safeCenter = new Coord(p.sizeX / 2.0, p.sizeY / 2.0);
			const radius = p.sizeX / 3.0;

			const offset = safeCenter.subtract(indiv.location);
			const distance = offset.length();
			return distance <= radius
				? ([true, 1.0] as const)
				: ([false, 0.0] as const);
		}

		// Survivors are those within the specified outer radius of the center and with
		// the specified number of neighbors in the specified inner radius.
		// The score is not weighted by distance from the center.
		case Challenge.CenterSparse: {
			const safeCenter = new Coord(p.sizeX / 2.0, p.sizeY / 2.0);
			const outerRadius = p.sizeX / 4.0;
			const innerRadius = 1.5;
			const minNeighbors = 5; // includes self
			const maxNeighbors = 8;

			const offset = safeCenter.subtract(indiv.location);
			const distance = offset.length();
			if (distance <= outerRadius) {
				let count = 0;

				visitNeighbourhood({
					location: indiv.location,
					radius: innerRadius,
					onVisit(loc2) {
						if (isOccupiedAt(grid, loc2)) ++count;
					},
					gridHeight: p.sizeY,
					gridWidth: p.sizeX,
				});
				if (count >= minNeighbors && count <= maxNeighbors) {
					return [true, 1.0] as const;
				}
			}
			return [false, 0.0] as const;
		}

		// Survivors are those within the specified radius of any corner.
		// Assumes square arena.
		case Challenge.Corner: {
			const radius = p.sizeX / 8.0;

			let distance = new Coord(0, 0).subtract(indiv.location).length();
			if (distance <= radius) {
				return [true, 1.0] as const;
			}
			distance = new Coord(0, p.sizeY - 1).subtract(indiv.location).length();
			if (distance <= radius) {
				return [true, 1.0] as const;
			}
			distance = new Coord(p.sizeX - 1, 0).subtract(indiv.location).length();
			if (distance <= radius) {
				return [true, 1.0] as const;
			}
			distance = new Coord(p.sizeX - 1, p.sizeY - 1)
				.subtract(indiv.location)
				.length();
			if (distance <= radius) {
				return [true, 1.0] as const;
			}
			return [false, 0.0] as const;
		}

		// Survivors are those within the specified radius of any corner. The score
		// is linearly weighted by distance from the corner point.
		case Challenge.CornerWeighted: {
			const radius = p.sizeX / 4.0;

			let distance = new Coord(0, 0).subtract(indiv.location).length();
			if (distance <= radius) {
				return [true, (radius - distance) / radius] as const;
			}
			distance = new Coord(0, p.sizeY - 1).subtract(indiv.location).length();
			if (distance <= radius) {
				return [true, (radius - distance) / radius] as const;
			}
			distance = new Coord(p.sizeX - 1, 0).subtract(indiv.location).length();
			if (distance <= radius) {
				return [true, (radius - distance) / radius] as const;
			}
			distance = new Coord(p.sizeX - 1, p.sizeY - 1)
				.subtract(indiv.location)
				.length();
			if (distance <= radius) {
				return [true, (radius - distance) / radius] as const;
			}
			return [false, 0.0] as const;
		}

		// This challenge is handled in endOfSimStep(), where individuals may die
		// at the end of any sim step. There is nothing else to do here at the
		// end of a generation. All remaining alive become parents.
		case Challenge.RadioactiveWalls:
			return [true, 1.0] as const;

		// Survivors are those touching any wall at the end of the generation
		case Challenge.AginstAnyWall: {
			const onEdge =
				indiv.location.x == 0 ||
				indiv.location.x == p.sizeX - 1 ||
				indiv.location.y == 0 ||
				indiv.location.y == p.sizeY - 1;

			if (onEdge) {
				return [true, 1.0] as const;
			} else {
				return [false, 0.0] as const;
			}
		}

		// This challenge is partially handled in endOfSimStep(), where individuals
		// that are touching a wall are flagged in their Indiv record. They are
		// allowed to continue living. Here at the end of the generation, any that
		// never touch a wall will die. All that touched a wall at any time during
		// their life will become parents.
		case Challenge.TouchAnyWall:
			if (indiv.challengeBits != 0) {
				return [true, 1.0] as const;
			} else {
				return [false, 0.0] as const;
			}

		// Everybody survives and are candidate parents, but scored by how far
		// they migrated from their birth location.
		case Challenge.MigrateDistance: {
			//unsigned requiredDistance = p.sizeX / 2.0;
			let distance = indiv.location.subtract(indiv.birthLocation).length();
			distance = distance / Math.max(p.sizeX, p.sizeY);
			return [true, distance] as const;
		}

		// Survivors are all those on the left or right eighths of the arena
		case Challenge.EastWestEights:
			return indiv.location.x < p.sizeX / 8 ||
				indiv.location.x >= p.sizeX - p.sizeX / 8
				? ([true, 1.0] as const)
				: ([false, 0.0] as const);

		// Survivors are those within radius of any barrier center. Weighted by distance.
		case Challenge.NearBarrier: {
			const radius = p.sizeX / 2;

			let minDistance = 1e8;
			for (const center of grid.barrierCenters) {
				const distance = indiv.location.subtract(center).length();
				if (distance < minDistance) {
					minDistance = distance;
				}
			}
			if (minDistance <= radius) {
				return [true, 1.0 - minDistance / radius] as const;
			} else {
				return [false, 0.0] as const;
			}
		}

		// Survivors are those not touching a border and with exactly one neighbor which has no other neighbor
		case Challenge.Pairs: {
			const onEdge =
				indiv.location.x == 0 ||
				indiv.location.x == p.sizeX - 1 ||
				indiv.location.y == 0 ||
				indiv.location.y == p.sizeY - 1;

			if (onEdge) {
				return [false, 0.0] as const;
			}

			let count = 0;
			for (let x = indiv.location.x - 1; x <= indiv.location.x + 1; ++x) {
				for (let y = indiv.location.y - 1; y <= indiv.location.y + 1; ++y) {
					const tloc = new Coord(x, y);
					if (
						!tloc.equals(indiv.location) &&
						isInBounds(grid, tloc) &&
						isOccupiedAt(grid, tloc)
					) {
						++count;
						if (count == 1) {
							for (let x1 = tloc.x - 1; x1 <= tloc.x + 1; ++x1) {
								for (let y1 = tloc.y - 1; y1 <= tloc.y + 1; ++y1) {
									const tloc1 = new Coord(x1, y1);
									if (
										!tloc1.equals(tloc) &&
										!tloc1.equals(indiv.location) &&
										isInBounds(grid, tloc1) &&
										isOccupiedAt(grid, tloc1)
									) {
										return [false, 0.0] as const;
									}
								}
							}
						} else {
							return [false, 0.0] as const;
						}
					}
				}
			}
			if (count == 1) {
				return [true, 1.0] as const;
			} else {
				return [false, 0.0] as const;
			}
		}

		// Survivors are those that contacted one or more specified locations in a sequence,
		// ranked by the number of locations contacted. There will be a bit set in their
		// challengeBits member for each location contacted.
		case Challenge.LocationSequence: {
			let count = 0;
			const bits = indiv.challengeBits;
			const maxNumberOfBits = bitCount(bits);

			for (let n = 0; n < maxNumberOfBits; ++n) {
				if ((bits & (1 << n)) != 0) {
					++count;
				}
			}
			if (count > 0) {
				return [true, count / maxNumberOfBits] as const;
			} else {
				return [false, 0.0] as const;
			}
		}

		// Survivors are all those within the specified radius of the NE corner
		case Challenge.AltruismSacrifice: {
			//float radius = p.sizeX / 3.0; // in 128^2 world, holds 1429 agents
			const radius = p.sizeX / 4.0; // in 128^2 world, holds 804 agents
			//float radius = p.sizeX / 5.0; // in 128^2 world, holds 514 agents

			const distance = new Coord(p.sizeX - p.sizeX / 4, p.sizeY - p.sizeY / 4)
				.subtract(indiv.location)
				.length();
			if (distance <= radius) {
				return [true, (radius - distance) / radius] as const;
			} else {
				return [false, 0.0] as const;
			}
		}

		// Survivors are those inside the circular area defined by
		// safeCenter and radius
		case Challenge.Altruism: {
			const safeCenter = new Coord(p.sizeX / 4.0, p.sizeY / 4.0);
			const radius = p.sizeX / 4.0; // in a 128^2 world, holds 3216

			const offset = safeCenter.subtract(indiv.location);
			const distance = offset.length();
			return distance <= radius
				? ([true, (radius - distance) / radius] as const)
				: ([false, 0.0] as const);
		}

		default:
			throw new Error("Challenge not implemented");
	}
};
