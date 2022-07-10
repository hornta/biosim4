import { Random } from "@hornta/random";
import { Compass } from "./compass.js";
import { normalizedCoords } from "./coord.js";
import { getRandomInt } from "./random.js";

export class Dir {
  dir9: Compass;

  constructor(dir: Compass) {
    this.dir9 = dir;
  }

  asNormalizedCoord() {
    return normalizedCoords[this.dir9];
  }

  rotate90DegreesClockWise() {
    return this.rotate(2);
  }

  rotate90DegreesCounterClockWise() {
    return this.rotate(-2);
  }

  rotate180Degrees() {
    return this.rotate(4);
  }

  rotate(n: number) {
    return rotations[this.dir9 * 8 + (n & 7)];
  }
}

export const randomDirection8 = (random: Random) => {
  return new Dir(Compass.North).rotate(getRandomInt(random, 0, 7));
};

const rotations = [
  new Dir(Compass.SouthWest),
  new Dir(Compass.West),
  new Dir(Compass.NorthWest),
  new Dir(Compass.North),
  new Dir(Compass.NorthEast),
  new Dir(Compass.East),
  new Dir(Compass.SouthEast),
  new Dir(Compass.South),
  new Dir(Compass.South),
  new Dir(Compass.SouthWest),
  new Dir(Compass.West),
  new Dir(Compass.NorthWest),
  new Dir(Compass.North),
  new Dir(Compass.NorthEast),
  new Dir(Compass.East),
  new Dir(Compass.SouthEast),
  new Dir(Compass.SouthEast),
  new Dir(Compass.South),
  new Dir(Compass.SouthWest),
  new Dir(Compass.West),
  new Dir(Compass.NorthWest),
  new Dir(Compass.North),
  new Dir(Compass.NorthEast),
  new Dir(Compass.East),
  new Dir(Compass.West),
  new Dir(Compass.NorthWest),
  new Dir(Compass.North),
  new Dir(Compass.NorthEast),
  new Dir(Compass.East),
  new Dir(Compass.SouthEast),
  new Dir(Compass.South),
  new Dir(Compass.SouthWest),
  new Dir(Compass.Center),
  new Dir(Compass.Center),
  new Dir(Compass.Center),
  new Dir(Compass.Center),
  new Dir(Compass.Center),
  new Dir(Compass.Center),
  new Dir(Compass.Center),
  new Dir(Compass.Center),
  new Dir(Compass.East),
  new Dir(Compass.SouthEast),
  new Dir(Compass.South),
  new Dir(Compass.SouthWest),
  new Dir(Compass.West),
  new Dir(Compass.NorthWest),
  new Dir(Compass.North),
  new Dir(Compass.NorthEast),
  new Dir(Compass.NorthWest),
  new Dir(Compass.North),
  new Dir(Compass.NorthEast),
  new Dir(Compass.East),
  new Dir(Compass.SouthEast),
  new Dir(Compass.South),
  new Dir(Compass.SouthWest),
  new Dir(Compass.West),
  new Dir(Compass.North),
  new Dir(Compass.NorthEast),
  new Dir(Compass.East),
  new Dir(Compass.SouthEast),
  new Dir(Compass.South),
  new Dir(Compass.SouthWest),
  new Dir(Compass.West),
  new Dir(Compass.NorthWest),
  new Dir(Compass.NorthEast),
  new Dir(Compass.East),
  new Dir(Compass.SouthEast),
  new Dir(Compass.South),
  new Dir(Compass.SouthWest),
  new Dir(Compass.West),
  new Dir(Compass.NorthWest),
  new Dir(Compass.North),
] as const;
