import { createSelector } from "reselect";

// convert slice objects to array of slice values
// only care about inbound to deposit account, not change
const getDepositSlices = (state) => Object.values(state.wallet.deposits.nodes);
const getWalletSlices = (state) => [
  ...Object.values(state.wallet.deposits.nodes),
  ...Object.values(state.wallet.change.nodes),
];

export const getPendingBalance = createSelector(
  getDepositSlices,
  // iterate through all slices to add up the pending balance
  (slices) => {
    // reduce slices to calculate unconfirmed utxos from each slice
    return slices.reduce((balance, currentSlice) => {
      // if the current slice has no UTXOs, then continue
      if (!currentSlice.utxos.length) return balance;
      // otherwise, loop through available utxos and add balance of those
      // that are unconfirmed
      const sliceBalance = currentSlice.utxos.reduce((total, utxo) => {
        if (!utxo.confirmed) return total + parseInt(utxo.amountSats, 10);
        return total;
      }, 0);

      // add slice's pending balance to aggregated balance
      return sliceBalance + balance;
    }, 0);
  }
);

/**
 * @description Returns a selector with all slices from both deposit and change braids
 * also adds a "lastUsed" property for each slice
 */
export const getSlicesWithLastUsed = createSelector(
  getWalletSlices,
  (slices) => {
    return slices.map((slice) => {
      if (!slice.utxos.length && slice.addressUsed)
        return { ...slice, lastUsed: "Spent" };
      if (!slice.utxos.length) return slice;
      const maxtime = Math.max(...slice.utxos.map((utxo) => utxo.time));
      if (Number.isNaN(maxtime)) return { ...slice, lastUsed: "Pending" };
      return {
        ...slice,
        lastUsed: new Date(1000 * maxtime).toLocaleDateString(),
      };
    });
  }
);

/**
 * @description Returns a selector that provides all spent slices, i.e.
 * All slices that have been used but have no balance left.
 */
export const getSpentSlices = createSelector(getSlicesWithLastUsed, (slices) =>
  slices.filter((slice) => slice.addressUsed && slice.balanceSats.isEqualTo(0))
);

/**
 * @description Returns a selector that provides all slices with an active balance
 */
export const getSlicesWithBalance = createSelector(
  getSlicesWithLastUsed,
  (slices) => slices.filter((slice) => slice.balanceSats.isGreaterThan(0))
);

/**
 * @description Returns a selector that provides all unused slices,
 * i.e. where the balance is zero and the address has not been used
 */
export const getZeroBalanceSlices = createSelector(
  getSlicesWithLastUsed,
  (slices) =>
    slices.filter(
      (slice) => slice.balanceSats.isEqualTo(0) && !slice.addressUsed
    )
);

/**
 * @description Returns a selector of all wallet slices
 * where the status of that slice is not known.
 */
export const getUnknownAddressSlices = createSelector(
  getWalletSlices,
  (slices) => slices.filter((slice) => !slice.addressKnown)
);

/**
 * @description returns an array of all addresses of slices
 * where the state of that slice is not known
 */
export const getUnknownAddresses = createSelector(
  [getWalletSlices, getUnknownAddressSlices],
  (slices) => slices.map((slice) => slice.multisig.address)
);

/**
 * @description Returns a selector of all slices from the _deposit_ braid
 * where the address hasn't been used yet.
 */
export const getDepositableSlices = createSelector(getDepositSlices, (slices) =>
  slices.filter((slice) => slice.balanceSats.isEqualTo(0) && !slice.addressUsed)
);