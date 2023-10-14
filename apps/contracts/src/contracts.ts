import { CctpAdapter__factory } from "../typechain-types"

export const cctpAdapterFactories = {
  router: new CctpAdapter__factory(),
}

export type CctpAdapterFactories = typeof cctpAdapterFactories;