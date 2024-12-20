import * as chai from "chai";
import path from "path";
import { Manager, maxRecords, rootPath } from "../lib/index.js";

describe("Manager", function () {
  it("Limit", function () {
    const sincer = new Manager(null);
    for (let i = 0; i < maxRecords; i++) {
      sincer.create(String(i));
    }
    chai.assert.strictEqual(sincer.cfg.records.length, maxRecords);
    chai.assert.throws(function () {
      sincer.create("newrecord");
    });
  });
  describe("Actions", function () {
    it("showAll", function () {
      const sincer = new Manager(null);
      sincer.displayByName();
      sincer.displayByName("sdbhfkjasbdhfkshb");
      sincer.create("1");
      sincer.displayByName();
      sincer.displayByName("sdbhfkjasbdhfkshb");
    });
    it("add", function () {
      const sincer = new Manager(null);
      sincer.create("wantrename");
      chai.assert.throws(function () {
        sincer.create("");
      });
      sincer.create("1");
      chai.assert.throws(function () {
        sincer.create("1");
      });
      sincer.create("2", {});
      sincer.create("3", 1);
    });
    it("redate", function () {
      const sincer = new Manager(null);
      sincer.create("2");
      chai.assert.throws(function () {
        sincer.redate("unexistedname");
      });
      sincer.redate("2");
    });
    it("rename", function () {
      const sincer = new Manager(null);
      sincer.create("wantrename");
      chai.assert.throws(function () {
        sincer.rename("unexistedname");
      });
      sincer.rename("wantrename", "0");
    });
    it("swap", function () {
      const sincer = new Manager(null);
      sincer.create("0");
      sincer.create("1");
      sincer.create("2");
      sincer.create("3");
      sincer.create("4");
      sincer.create("5");
      sincer.create("6");
      sincer.swap("3", "2");
      sincer.swap("0", "1");
      sincer.swap("1", "6");
      sincer.swap("5", "1");
      sincer.swap("3", "4");
      chai.assert.throws(function () {
        sincer.swap("2", "2");
      });
    });
    it("moveDown", function () {
      const sincer = new Manager(null);
      sincer.create("0");
      sincer.create("1");
      sincer.create("2");
      sincer.create("3");
      sincer.create("4");
      sincer.create("5");
      sincer.create("6");
      sincer.moveDown("3", 2);
      chai.assert.strictEqual("3", sincer.cfg.records[5].name);
      sincer.moveDown("3", "max");
      chai.assert.throws(function () {
        sincer.moveDown("3", "max");
      });
      chai.assert.strictEqual("3", sincer.cfg.records[6].name);
      chai.assert.throws(function () {
        sincer.moveDown("1", 1e+6);
      });
    });
    it("moveUp", function () {
      const sincer = new Manager(null);
      sincer.create("0");
      sincer.create("1");
      sincer.create("2");
      sincer.create("3");
      sincer.create("4");
      sincer.create("5");
      sincer.create("6");
      sincer.moveUp("3", 2);
      chai.assert.strictEqual("3", sincer.cfg.records[1].name);
      sincer.moveUp("3", "max");
      chai.assert.throws(function () {
        sincer.moveUp("3", "max");
      });
      chai.assert.strictEqual("3", sincer.cfg.records[0].name);
      chai.assert.throws(function () {
        sincer.moveUp("1", 1e+6);
      });
    });
  });
});
