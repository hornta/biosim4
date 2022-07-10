import { Compass } from "./compass.js";
import { Dir } from "./dir.js";
import { Polar } from "./polar.js";

const tanN = 13860;
const tanD = 33461;
const conversion = [
  new Dir(Compass.South),
  new Dir(Compass.Center),
  new Dir(Compass.SouthWest),
  new Dir(Compass.North),
  new Dir(Compass.SouthEast),
  new Dir(Compass.East),
  new Dir(Compass.North),
  new Dir(Compass.North),
  new Dir(Compass.North),
  new Dir(Compass.North),
  new Dir(Compass.West),
  new Dir(Compass.NorthWest),
  new Dir(Compass.North),
  new Dir(Compass.NorthEast),
  new Dir(Compass.North),
  new Dir(Compass.North),
] as const;

export class Coord {
  x: number;
  y: number;

  constructor();
  constructor(x: number, y: number);
  constructor(x?: number, y?: number) {
    this.x = x ?? 0;
    this.y = y ?? 0;
  }

  isNormalized() {
    return this.x >= -1 && this.x <= 1 && this.y >= -1 && this.y <= 1;
  }

  length() {
    return Math.floor(Math.sqrt(this.x * this.x + this.y * this.y));
  }

  asDir() {
    const xp = this.x * tanD + this.y * tanN;
    const yp = this.y * tanD - this.x * tanN;

    return conversion[
      Number(yp > 0) * 8 +
        Number(xp > 0) * 4 +
        Number(yp > xp) * 2 +
        Number(yp >= -xp)
    ];
  }

  normalize() {
    return this.asDir().asNormalizedCoord();
  }

  asPolar() {
    return new Polar(this.length(), this.asDir());
  }

  multiply(scalar: number) {
    return new Coord(this.x * scalar, this.y * scalar);
  }

  subtract(other: Coord) {
    return new Coord(this.x - other.x, this.y - other.y);
  }

  add(other: Coord) {
    return new Coord(this.x + other.x, this.y + other.y);
  }

  equals(other: Coord) {
    return this.x === other.x && this.y === other.y;
  }

  addDirection(direction: Dir) {
    return this.add(direction.asNormalizedCoord());
  }

  subtractDirection(direction: Dir) {
    return this.subtract(direction.asNormalizedCoord());
  }

  raySameness(other: Coord) {
    const magnitude =
      (this.x * this.x + this.y * this.y) *
      (other.x * other.x + other.y * other.y);
    if (magnitude === 0) {
      return 1.0;
    }

    return (this.x * other.x + this.y * other.y) / Math.sqrt(magnitude);
  }

  raySamenessDirection(direction: Dir) {
    return this.raySameness(direction.asNormalizedCoord());
  }
}

export const normalizedCoords = [
  new Coord(-1, -1), // SW
  new Coord(0, -1), // S
  new Coord(1, -1), // SE
  new Coord(-1, 0), // W
  new Coord(0, 0), // CENTER
  new Coord(1, 0), // E
  new Coord(-1, 1), // NW
  new Coord(0, 1), // N
  new Coord(1, 1), // NE
];
