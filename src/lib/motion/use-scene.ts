"use client";

import { useEffect } from "react";
import { gsap, ScrollTrigger, registerMotionPlugins } from "./setup";

export interface UseSceneOptions {
  scope?: React.RefObject<Element | null>;
  dependencies?: React.DependencyList;
  revertOnUpdate?: boolean;
}

export type SceneCallback = (context: gsap.Context) => void | (() => void);

/**
 * useScene hook:
 * Wraps gsap.context to isolate animations per scene component.
 * Automatically reverts animations and kills associated ScrollTriggers on unmount.
 */
export function useScene(
  callback: SceneCallback,
  options: UseSceneOptions = {}
): void {
  const { scope, dependencies = [], revertOnUpdate = true } = options;

  useEffect(() => {
    registerMotionPlugins();

    const element = scope?.current ?? undefined;
    const localTriggers: ScrollTrigger[] = [];

    // Record pre-existing triggers before running scene callback
    const existingTriggers = new Set(ScrollTrigger.getAll());

    const ctx = gsap.context((self) => {
      return callback(self);
    }, element);

    // Track newly created triggers
    const currentTriggers = ScrollTrigger.getAll();
    currentTriggers.forEach((st) => {
      if (!existingTriggers.has(st)) {
        localTriggers.push(st);
      }
    });

    return () => {
      // Kill triggers tracked for this scene
      localTriggers.forEach((trigger) => {
        if (trigger && typeof trigger.kill === "function") {
          trigger.kill(true);
        }
      });

      // If scope element exists, kill any triggers attached to or inside scope
      if (element) {
        ScrollTrigger.getAll().forEach((trigger) => {
          if (
            trigger.trigger === element ||
            (element as Element).contains?.(trigger.trigger as Node)
          ) {
            trigger.kill(true);
          }
        });
      }

      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revertOnUpdate, ...dependencies]);
}

export default useScene;
