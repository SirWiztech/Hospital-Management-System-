// Simple store
export const store = {
  state: {},
  setState(patch) {
    Object.assign(this.state, patch);
  },
};
