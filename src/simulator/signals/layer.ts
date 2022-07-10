import { Column, makeColumn } from "./column.js";

export interface Layer {
  columns: Column[];
}

export const makeLayer = (numberOfColumns: number, numberOfRows: number) => {
  const layer: Layer = {
    columns: Array.from({ length: numberOfColumns }).map(() => {
      return makeColumn(numberOfRows);
    }),
  };
  return layer;
};
