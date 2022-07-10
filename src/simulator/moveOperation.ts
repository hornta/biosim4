import type { Coord } from "./coord.js";

export interface MoveOperation {
	individualIndex: number;
	location: Coord;
}
