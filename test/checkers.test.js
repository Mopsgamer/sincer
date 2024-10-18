import * as chai from "chai";
import {
  isConfig,
  isNameGeneratorTemplate,
  isRecordItem,
  isRecordName,
  isRecordSince,
} from "../lib/index.js";

describe("Checkers", function () {
  it("isNameGeneratorTemplate", function () {
    chai.assert.isFalse(isNameGeneratorTemplate("hello"));
    chai.assert.isTrue(isNameGeneratorTemplate("hello$0"));
    chai.assert.isTrue(isNameGeneratorTemplate("$0hello"));
    chai.assert.isTrue(isNameGeneratorTemplate("hello$0$0"));
    chai.assert.isTrue(isNameGeneratorTemplate("hello$0!"));
    chai.assert.isFalse(isNameGeneratorTemplate("hello\\$0"));
  });
  it("isRecordItem", function () {
    chai.assert.isFalse(isRecordItem(0));
    chai.assert.isFalse(isRecordItem([]));
    chai.assert.isFalse(isRecordItem(null));
    chai.assert.isFalse(isRecordItem({}));
    chai.assert.isFalse(isRecordItem({ name: "s" }));
    chai.assert.isFalse(isRecordItem({ locale: "a" }));
    chai.assert.isFalse(isRecordItem({ since: "d" }));
    const normName = "normal";
    const normSince = new Date().toJSON();
    chai.assert.isTrue(isRecordName(normName));
    chai.assert.isTrue(isRecordSince(normSince));
    chai.assert.isFalse(isRecordItem({ name: "", since: normSince }));
    chai.assert.isFalse(isRecordItem({ name: normName, since: "" }));
    chai.assert.isTrue(isRecordItem({ name: normName, since: normSince }));
  });
  it("isRecordName", function () {
    chai.assert.isFalse(isRecordName(0));
    chai.assert.isFalse(isRecordName(""));
    chai.assert.isTrue(isRecordName("*"));
    chai.assert.isTrue(isRecordName("\0"));
    chai.assert.isTrue(isRecordName("normal"));
  });
});
