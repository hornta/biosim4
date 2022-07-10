import { Random } from "@hornta/random";

export const makeRandoms = (count: number, seed?: string) => {
  const mainRandom = new Random(seed);

  let randoms = [mainRandom];
  for (let i = 0; i < count - 1; ++i) {
    randoms.push(new Random(mainRandom.next()));
  }

  return randoms;
};

export const getRandomInt = (random: Random, min: number, max: number) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(random.next() * (max - min + 1)) + min;
};

export const RANDOM_UINT_MAX = 0xffffffff;
