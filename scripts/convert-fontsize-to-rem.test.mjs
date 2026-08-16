import { describe, it, expect } from "vitest";
import { convertFontSizes } from "./convert-fontsize-to-rem.mjs";

describe("convertFontSizes", () => {
  it("converts a plain integer px value to its rem equivalent", () => {
    const { result, count } = convertFontSizes('const x = {fontSize:16,color:"red"};');
    expect(result).toBe('const x = {fontSize:"1rem",color:"red"};');
    expect(count).toBe(1);
  });

  it("converts a decimal px value to its rem equivalent", () => {
    const { result, count } = convertFontSizes("const x = {fontSize:11.5};");
    expect(result).toBe('const x = {fontSize:"0.71875rem"};');
    expect(count).toBe(1);
  });

  it("converts a value with a space after the colon", () => {
    const { result, count } = convertFontSizes("const x = {fontSize: 13};");
    expect(result).toBe('const x = {fontSize:"0.8125rem"};');
    expect(count).toBe(1);
  });

  it("converts every occurrence in a multi-line file", () => {
    const src = [
      'export let a={fontSize:16};',
      'export let b={fontSize:11};',
      'export const c=(x)=>({fontSize:24});',
    ].join("\n");
    const { result, count } = convertFontSizes(src);
    expect(count).toBe(3);
    expect(result).toContain('fontSize:"1rem"');
    expect(result).toContain('fontSize:"0.6875rem"');
    expect(result).toContain('fontSize:"1.5rem"');
  });

  it("leaves an already-converted rem value untouched", () => {
    const { result, count } = convertFontSizes('const x = {fontSize:"1rem"};');
    expect(result).toBe('const x = {fontSize:"1rem"};');
    expect(count).toBe(0);
  });

  it("throws on a px value with no table entry, naming the bad value", () => {
    expect(() => convertFontSizes("const x = {fontSize:99};")).toThrow('fontSize value "99px"');
  });
});
