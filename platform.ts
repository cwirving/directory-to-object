import { CurrentRuntime, Runtime } from "@cross/runtime";
import type { Platform } from './interfaces.ts';
import { makeDenoPlatform } from './platform_deno.ts';
import { makeNodePlatform } from './platform_node.ts';

const nodeLikeRuntimes = [Runtime.Bun, Runtime.Node];

export function runtimeIsNodeLike(runtime: Runtime): boolean {
  return nodeLikeRuntimes.includes(runtime);
}

function getCurrentPlatform(): Platform {
  if (CurrentRuntime === Runtime.Deno) {
    return makeDenoPlatform();
  } else if (runtimeIsNodeLike(CurrentRuntime)) {
    return makeNodePlatform()
  } else {
    throw new Error("Unsupported platform/runtime");
  }
}

export const platform: Platform = getCurrentPlatform();
