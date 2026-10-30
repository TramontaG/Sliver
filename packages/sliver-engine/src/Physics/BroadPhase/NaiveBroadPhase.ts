import {
	aabbsOverlap,
	cloneBroadPhaseProxy,
	createBroadPhasePair,
	shouldEmitCandidatePair,
} from "./Proxy";
import type { BroadPhasePair, BroadPhaseProxy } from "./Proxy";

type BroadPhase = {
	updateProxies(proxies: readonly BroadPhaseProxy[]): void;
	getCandidatePairs(): BroadPhasePair[];
};

class NaiveBroadPhase implements BroadPhase {
	private proxies: BroadPhaseProxy[] = [];

	updateProxies(proxies: readonly BroadPhaseProxy[]): void {
		this.proxies = proxies.map((proxy) => cloneBroadPhaseProxy(proxy));
	}

	getCandidatePairs(): BroadPhasePair[] {
		const pairs: BroadPhasePair[] = [];

		for (let indexA = 0; indexA < this.proxies.length; indexA++) {
			const proxyA = this.proxies[indexA]!;

			for (let indexB = indexA + 1; indexB < this.proxies.length; indexB++) {
				const proxyB = this.proxies[indexB]!;

				if (!shouldEmitCandidatePair(proxyA, proxyB)) {
					continue;
				}

				if (!aabbsOverlap(proxyA.aabb, proxyB.aabb)) {
					continue;
				}

				pairs.push(createBroadPhasePair(proxyA, proxyB));
			}
		}

		return pairs;
	}
}

export { NaiveBroadPhase };

export type { BroadPhase };
