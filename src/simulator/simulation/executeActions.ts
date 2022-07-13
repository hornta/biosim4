import type { Random } from "@hornta/random";
import { addCoord, addDirectionToCoord } from "../coord.js";
import {
	directionAsNormalizedCoord,
	randomDirection8,
	rotate90DegreesClockWise,
	rotate90DegreesCounterClockWise,
} from "../dir.js";
import type { Grid } from "../grid/grid.js";
import { isEmptyAt, isInBounds, isOccupiedAt } from "../grid/grid.js";
import type { Indiv } from "../indiv.js";
import { RANDOM_UINT_MAX } from "../random.js";
import { SensorAction } from "../neuralNet/sensorActions.js";
import type { SimulatorOptions } from "./simulatorOptions.js";

const prob2bool = (random: Random, factor: number) => {
	return random.uint32() / RANDOM_UINT_MAX < factor;
};

const responseCurve = (responsivenessCurveKFactor: number, r: number) => {
	return (
		Math.pow(r - 2.0, -2.0 * responsivenessCurveKFactor) -
		Math.pow(2.0, -2.0 * responsivenessCurveKFactor) * (1.0 - r)
	);
};

export enum ActionOutputType {
	Responsiveness,
	OscilliatorPeriod,
	LongProbeDistance,
	Signal0,
	Kill,
	Move,
}

export interface ActionOutput {
	action: ActionOutputType;
	indiv: number;
	value: number;
}

export type ActionOutputs = ActionOutput[];

export const executeActions = (
	indiv: Omit<Indiv, "simulation">,
	actionLevels: number[],
	random: Random,
	options: SimulatorOptions,
	grid: Grid
) => {
	const outputs: ActionOutputs = [];

	// todo: allow disabling actions
	const isEnabled = (action: SensorAction) => {
		action;
		return true;
	};

	if (isEnabled(SensorAction.SetResponsiveness)) {
		let level = actionLevels[SensorAction.SetResponsiveness];
		level = (Math.tanh(level) + 1) / 2;
		outputs.push({
			action: ActionOutputType.Responsiveness,
			indiv: indiv.index,
			value: level,
		});
	}

	const responsivenessAdjusted = responseCurve(
		options.responsivenessCurveKFactor,
		indiv.responsiveness
	);

	// Oscillator period action - convert action level nonlinearly to
	// 2..4*p.stepsPerGeneration. If this action neuron is enabled but not driven,
	// will default to 1.5 + e^(3.5) = a period of 34 simSteps.
	if (isEnabled(SensorAction.SetOscilliatorPeriod)) {
		const periodf = actionLevels[SensorAction.SetOscilliatorPeriod];
		const newPeriodf01 = (Math.tanh(periodf) + 1.0) / 2.0; // convert to 0.0..1.0
		const newPeriod = 1 + Math.floor(1.5 + Math.exp(7.0 * newPeriodf01));
		outputs.push({
			action: ActionOutputType.OscilliatorPeriod,
			indiv: indiv.index,
			value: newPeriod,
		});
	}

	// Set longProbeDistance - convert action level to 1..maxLongProbeDistance.
	// If this action neuron is enabled but not driven, will default to
	// mid-level period of 17 simSteps.
	if (isEnabled(SensorAction.SetLongProbeDistance)) {
		const maxLongProbeDistance = 32;
		let level = actionLevels[SensorAction.SetLongProbeDistance];
		level = (Math.tanh(level) + 1.0) / 2.0; // convert to 0.0..1.0
		level = 1 + level * maxLongProbeDistance;
		outputs.push({
			action: ActionOutputType.LongProbeDistance,
			indiv: indiv.index,
			value: level,
		});
	}

	// Emit signal0 - if this action value is below a threshold, nothing emitted.
	// Otherwise convert the action value to a probability of emitting one unit of
	// signal (pheromone).
	// Pheromones may be emitted immediately (see signals.cpp). If this action neuron
	// is enabled but not driven, nothing will be emitted.
	if (isEnabled(SensorAction.EmitSignal0)) {
		const emitThreshold = 0.5; // 0.0..1.0; 0.5 is midlevel
		let level = actionLevels[SensorAction.EmitSignal0];
		level = (Math.tanh(level) + 1.0) / 2.0; // convert to 0.0..1.0
		level *= responsivenessAdjusted;
		if (level > emitThreshold && prob2bool(random, level)) {
			outputs.push({
				action: ActionOutputType.Signal0,
				indiv: indiv.index,
				value: 0,
			});
		}
	}

	// Kill forward -- if this action value is > threshold, value is converted to probability
	// of an attempted murder. Probabilities under the threshold are considered 0.0.
	// If this action neuron is enabled but not driven, the neighbors are safe.
	if (isEnabled(SensorAction.KillForward) && options.killEnable) {
		const killThreshold = 0.5; // 0.0..1.0; 0.5 is midlevel
		let level = actionLevels[SensorAction.KillForward];
		level = (Math.tanh(level) + 1.0) / 2.0; // convert to 0.0..1.0
		level *= responsivenessAdjusted;
		if (level > killThreshold && prob2bool(random, level)) {
			const otherLoc = addDirectionToCoord(
				indiv.location,
				indiv.lastMoveDirection
			);
			if (isInBounds(grid, otherLoc) && isOccupiedAt(grid, otherLoc)) {
				const targetIndex = grid.data[otherLoc.x * grid.width + otherLoc.y];
				outputs.push({
					action: ActionOutputType.Kill,
					indiv: indiv.index,
					value: targetIndex,
				});
			}
		}
	}

	// ------------- Movement action neurons ---------------

	// There are multiple action neurons for movement. Each type of movement neuron
	// urges the individual to move in some specific direction. We sum up all the
	// X and Y components of all the movement urges, then pass the X and Y sums through
	// a transfer function (tanh()) to get a range -1.0..1.0. The absolute values of the
	// X and Y values are passed through prob2bool() to convert to -1, 0, or 1, then
	// multiplied by the component's signum. This results in the x and y components of
	// a normalized movement offset. I.e., the probability of movement in either
	// dimension is the absolute value of tanh of the action level X,Y components and
	// the direction is the sign of the X, Y components. For example, for a particular
	// action neuron:
	//     X, Y == -5.9, +0.3 as raw action levels received here
	//     X, Y == -0.999, +0.29 after passing raw values through tanh()
	//     Xprob, Yprob == 99.9%, 29% probability of X and Y becoming 1 (or -1)
	//     X, Y == -1, 0 after applying the sign and probability
	//     The agent will then be moved West (an offset of -1, 0) if it's a legal move.

	let level;
	let offset;
	const lastMoveOffset = directionAsNormalizedCoord(indiv.lastMoveDirection);

	// moveX,moveY will be the accumulators that will hold the sum of all the
	// urges to move along each axis. (+- floating values of arbitrary range)
	let moveX = isEnabled(SensorAction.MoveX)
		? actionLevels[SensorAction.MoveX]
		: 0.0;
	let moveY = isEnabled(SensorAction.MoveY)
		? actionLevels[SensorAction.MoveY]
		: 0.0;

	if (isEnabled(SensorAction.MoveEast))
		moveX += actionLevels[SensorAction.MoveEast];
	if (isEnabled(SensorAction.MoveWest))
		moveX -= actionLevels[SensorAction.MoveWest];
	if (isEnabled(SensorAction.MoveNorth))
		moveY += actionLevels[SensorAction.MoveNorth];
	if (isEnabled(SensorAction.MoveSouth))
		moveY -= actionLevels[SensorAction.MoveSouth];

	if (isEnabled(SensorAction.MoveForward)) {
		level = actionLevels[SensorAction.MoveForward];
		moveX += lastMoveOffset.x * level;
		moveY += lastMoveOffset.y * level;
	}
	if (isEnabled(SensorAction.MoveReverse)) {
		level = actionLevels[SensorAction.MoveReverse];
		moveX -= lastMoveOffset.x * level;
		moveY -= lastMoveOffset.y * level;
	}
	if (isEnabled(SensorAction.MoveLeft)) {
		level = actionLevels[SensorAction.MoveLeft];
		offset = directionAsNormalizedCoord(
			rotate90DegreesCounterClockWise(indiv.lastMoveDirection)
		);
		moveX += offset.x * level;
		moveY += offset.y * level;
	}
	if (isEnabled(SensorAction.MoveRight)) {
		level = actionLevels[SensorAction.MoveRight];
		offset = directionAsNormalizedCoord(
			rotate90DegreesClockWise(indiv.lastMoveDirection)
		);
		moveX += offset.x * level;
		moveY += offset.y * level;
	}
	if (isEnabled(SensorAction.MoveRightLeft)) {
		level = actionLevels[SensorAction.MoveRightLeft];
		offset = directionAsNormalizedCoord(
			rotate90DegreesClockWise(indiv.lastMoveDirection)
		);
		moveX += offset.x * level;
		moveY += offset.y * level;
	}

	if (isEnabled(SensorAction.MoveRandom)) {
		level = actionLevels[SensorAction.MoveRandom];
		offset = directionAsNormalizedCoord(randomDirection8(random));
		moveX += offset.x * level;
		moveY += offset.y * level;
	}

	// Convert the accumulated X, Y sums to the range -1.0..1.0 and scale by the
	// individual's responsiveness (0.0..1.0) (adjusted by a curve)
	moveX = Math.tanh(moveX);
	moveY = Math.tanh(moveY);
	moveX *= responsivenessAdjusted;
	moveY *= responsivenessAdjusted;

	// The probability of movement along each axis is the absolute value
	const probX = prob2bool(random, Math.abs(moveX)); // convert abs(level) to 0 or 1
	const probY = prob2bool(random, Math.abs(moveY)); // convert abs(level) to 0 or 1

	// The direction of movement (if any) along each axis is the sign
	const signumX = moveX < 0.0 ? -1 : 1;
	const signumY = moveY < 0.0 ? -1 : 1;

	// Generate a normalized movement offset, where each component is -1, 0, or 1
	const movementOffset = {
		x: Number(probX) * signumX,
		y: Number(probY) * signumY,
	};

	// Move there if it's a valid location
	const newLoc = addCoord(indiv.location, movementOffset);
	if (isInBounds(grid, newLoc) && isEmptyAt(grid, newLoc)) {
		outputs.push({
			action: ActionOutputType.Move,
			indiv: indiv.index,
			value: newLoc.x | (newLoc.y << 16),
		});
	}

	return outputs;
};
