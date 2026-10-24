import { dataset } from './data.generated.ts';
import { createRosetta } from './rosetta.ts';

export type { IconName } from './data.generated.ts';
export { normalize } from './normalize.ts';
export { createRosetta } from './rosetta.ts';
export type * from './types.ts';

const rosetta = createRosetta(dataset);

export const { icons, libraries, names, resolve, translate, translateAll, icon } = rosetta;
export default rosetta;
