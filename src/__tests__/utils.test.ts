import { getSizeCode } from "../utils";

// write a jest test to check that the getSizeCode function works as expected
const cases = [
  [346, 990, 300, "b"]
] as [number, number, number, string][];

describe("getSizeCode", () => {
  test("should return the correct size code", () => {
    cases.forEach(([imgWidth, imgHeight, maxDisplayWidth, sizeCode]) => {
      expect(getSizeCode(imgWidth, imgHeight, maxDisplayWidth, 2)).toBe(sizeCode);
    });
  });
});
