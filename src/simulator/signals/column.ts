export interface Column {
	data: number[];
}

export const makeColumn = (numberOfRows: number) => {
	const column: Column = {
		data: Array(numberOfRows).fill(0),
	};
	return column;
};
