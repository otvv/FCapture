/*

FCapture

- github@otvv
- 09/25/2024

*/

// config object interface
export interface IConfigObjectStructure {
  videoMode: string;
  imageRenderingPriority: "auto" | "crisp-edges" | "pixelated" | "optimizeQuality" | "optimizeSpeed" | "smooth";
  imageBrightness: number;
  imageContrast: number;
  imageSaturation: number;
  debugOverlay: boolean;
  audioMode: string;
  surroundAudio: boolean;
  bassBoost: boolean;
}

// default config object template
export const configObjectTemplate: IConfigObjectStructure = {
  videoMode: "",
  imageRenderingPriority: "auto",
  imageBrightness: 100, // percentage (ranges from 0 to 200)
  imageContrast: 100, // percentage (ranges from 0 to 200)
  imageSaturation: 100, // percentage (ranges from 0 to 200)
  debugOverlay: false,
  audioMode: "",
  surroundAudio: false,
  bassBoost: false,
};