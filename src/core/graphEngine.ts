import { ServiceNode, ServiceDependency } from '../types';

export class GraphEngine {
  private services: Map<string, ServiceNode>;
  private dependencies: ServiceDependency[];
  private forwardAdj: Map<string, string[]>; // source -> targets (callees)
  private reverseAdj: Map<string, string[]>; // target -> sources (callers)

  constructor(services: ServiceNode[], dependencies: ServiceDependency[]) {
    this.services = new Map(services.map((s) => [s.id, s]));
    this.dependencies = dependencies;
    this.forwardAdj = new Map();
    this.reverseAdj = new Map();

    services.forEach((s) => {
      this.forwardAdj.set(s.id, []);
      this.reverseAdj.set(s.id, []);
    });

    dependencies.forEach((dep) => {
      if (this.forwardAdj.has(dep.source)) {
        this.forwardAdj.get(dep.source)!.push(dep.target);
      }
      if (this.reverseAdj.has(dep.target)) {
        this.reverseAdj.get(dep.target)!.push(dep.source);
      }
    });
  }

  public getService(id: string): ServiceNode | undefined {
    return this.services.get(id);
  }

  public getAllServices(): ServiceNode[] {
    return Array.from(this.services.values());
  }

  public getAllDependencies(): ServiceDependency[] {
    return this.dependencies;
  }

  /**
   * Returns direct upstream callers that call this service.
   * e.g. If Order Service calls Payment Service, getDirectCallers('payment-service') -> ['order-service']
   */
  public getDirectCallers(serviceId: string): string[] {
    return this.reverseAdj.get(serviceId) || [];
  }

  /**
   * Returns direct downstream dependencies that this service depends on.
   * e.g. Order Service calls Payment and Database.
   */
  public getDirectDependencies(serviceId: string): string[] {
    return this.forwardAdj.get(serviceId) || [];
  }

  /**
   * BFS Traversal to compute Cascading Failure Propagation.
   * When target fails, any service calling it (and services calling those callers)
   * can experience cascading degradation.
   */
  public getCascadingImpactChain(targetServiceId: string): {
    affectedIds: string[];
    paths: string[][];
    levels: Record<number, string[]>;
  } {
    const visited = new Set<string>();
    const affectedIds: string[] = [targetServiceId];
    visited.add(targetServiceId);

    const paths: string[][] = [[targetServiceId]];
    const levels: Record<number, string[]> = { 0: [targetServiceId] };

    // Queue holds [currentServiceId, pathSoFar, depth]
    const queue: Array<[string, string[], number]> = [[targetServiceId, [targetServiceId], 0]];

    while (queue.length > 0) {
      const [curr, currentPath, depth] = queue.shift()!;
      const callers = this.getDirectCallers(curr);

      for (const caller of callers) {
        if (!visited.has(caller)) {
          visited.add(caller);
          affectedIds.push(caller);
          const nextDepth = depth + 1;
          if (!levels[nextDepth]) {
            levels[nextDepth] = [];
          }
          levels[nextDepth].push(caller);

          const newPath = [...currentPath, caller];
          paths.push(newPath);
          queue.push([caller, newPath, nextDepth]);
        }
      }
    }

    return { affectedIds, paths, levels };
  }

  /**
   * Calculates Blast Radius Percentage:
   * (Sum of criticality of affected services / Sum of criticality of all services) * 100
   */
  public calculateBlastRadius(targetServiceId: string): {
    percentage: number;
    affectedServices: ServiceNode[];
    criticalCount: number;
    totalCriticalCount: number;
  } {
    const { affectedIds } = this.getCascadingImpactChain(targetServiceId);
    const allServices = this.getAllServices();

    const totalSystemCriticality = allServices.reduce((sum, s) => sum + s.criticality, 0);
    const affectedServices = affectedIds
      .map((id) => this.services.get(id))
      .filter((s): s is ServiceNode => !!s);

    const affectedCriticality = affectedServices.reduce((sum, s) => sum + s.criticality, 0);
    const percentage = totalSystemCriticality > 0
      ? Math.round((affectedCriticality / totalSystemCriticality) * 1000) / 10
      : 0;

    const criticalCount = affectedServices.filter((s) => s.tier === 1).length;
    const totalCriticalCount = allServices.filter((s) => s.tier === 1).length;

    return {
      percentage,
      affectedServices,
      criticalCount,
      totalCriticalCount,
    };
  }

  /**
   * Computes In-Degree and Out-Degree Centrality for all services.
   * High In-Degree = Highly depended upon (single point of failure risk)
   * High Out-Degree = High fan-out dependency (prone to downstream cascading)
   */
  public calculateCentrality(): Array<{
    serviceId: string;
    name: string;
    inDegree: number;
    outDegree: number;
    totalDegree: number;
    isSinglePointOfFailure: boolean;
  }> {
    const totalNodes = this.services.size;
    if (totalNodes <= 1) return [];

    return Array.from(this.services.values()).map((svc) => {
      const inDegree = (this.reverseAdj.get(svc.id) || []).length;
      const outDegree = (this.forwardAdj.get(svc.id) || []).length;
      const totalDegree = inDegree + outDegree;

      return {
        serviceId: svc.id,
        name: svc.name,
        inDegree,
        outDegree,
        totalDegree,
        isSinglePointOfFailure: inDegree >= 3 && svc.tier === 1,
      };
    });
  }

  /**
   * BFS Shortest Path between any two microservices.
   */
  public findShortestPath(sourceId: string, destinationId: string): string[] | null {
    if (sourceId === destinationId) return [sourceId];
    const visited = new Set<string>([sourceId]);
    const queue: Array<[string, string[]]> = [[sourceId, [sourceId]]];

    while (queue.length > 0) {
      const [curr, path] = queue.shift()!;
      const neighbors = this.forwardAdj.get(curr) || [];

      for (const next of neighbors) {
        if (next === destinationId) {
          return [...path, next];
        }
        if (!visited.has(next)) {
          visited.add(next);
          queue.push([next, [...path, next]]);
        }
      }
    }
    return null;
  }

  /**
   * Cycle detection using DFS with 3-color states (White, Gray, Black).
   */
  public detectCycles(): string[][] {
    const visited = new Map<string, 'WHITE' | 'GRAY' | 'BLACK'>();
    this.services.forEach((_, id) => visited.set(id, 'WHITE'));
    const cycles: string[][] = [];

    const dfs = (nodeId: string, path: string[]) => {
      visited.set(nodeId, 'GRAY');
      const neighbors = this.forwardAdj.get(nodeId) || [];

      for (const next of neighbors) {
        if (visited.get(next) === 'GRAY') {
          // Cycle detected
          const cycleStartIdx = path.indexOf(next);
          cycles.push([...path.slice(cycleStartIdx), next]);
        } else if (visited.get(next) === 'WHITE') {
          dfs(next, [...path, next]);
        }
      }
      visited.set(nodeId, 'BLACK');
    };

    this.services.forEach((_, id) => {
      if (visited.get(id) === 'WHITE') {
        dfs(id, [id]);
      }
    });

    return cycles;
  }
}
