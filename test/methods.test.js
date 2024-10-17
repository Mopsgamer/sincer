import * as chai from "chai";
import { normalConfig } from "../lib/index.js";

describe("Methods", function () {
  it("normalConfig", function () {
    const since = new Date().toJSON();
    const input = {
      records: [{ name: "test", since: since, abcd: "0123" }],
      count: 0,
    };
    const output = normalConfig(input);
    chai.assert.deepEqual(output, {
      records: [{ name: "test", since: since }],
      count: 0,
    });
  });
});
