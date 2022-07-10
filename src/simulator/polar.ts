import { Compass } from "./compass.js";
import { normalizedCoords } from "./coord.js";
import { Dir } from "./dir.js";

const coordMags = [
  3037000500, // SW
  1n << 32n, // S
  3037000500, // SE
  1n << 32n, // W
  0, // CENTER
  1n << 32n, // E
  3037000500, // NW
  1n << 32n, // N
  3037000500, // NE
] as const;

export class Polar {
  magnitude: number;
  direction: Dir;

  constructor();
  constructor(magnitude: number, directionOrCompass: Compass);
  constructor(magnitude: number, directionOrCompass: Dir);
  constructor(magnitude?: number, directionOrCompass?: Compass | Dir) {
    this.magnitude = magnitude ?? 0;
    if (typeof directionOrCompass === "number") {
      this.direction = new Dir(directionOrCompass);
    } else if (directionOrCompass instanceof Dir) {
      this.direction = directionOrCompass;
    } else {
      this.direction = new Dir(Compass.Center);
    }
  }

  asCoord() {
    let length =
      BigInt(coordMags[this.direction.dir9]) * BigInt(this.magnitude);

    const temp = (BigInt(this.magnitude) >> 32n) ^ ((1n << 31n) - 1n);
    length = (length + temp) / (1n << 32n);

    return normalizedCoords[this.direction.dir9].multiply(Number(length));
  }
}
