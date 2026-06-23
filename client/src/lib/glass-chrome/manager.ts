const MAX_WEBGL_INSTANCES = 4;

class GlassWebGLManager {
  private readonly active = new Set<string>();

  acquire(id: string): boolean {
    if (this.active.has(id)) return true;
    if (this.active.size >= MAX_WEBGL_INSTANCES) return false;
    this.active.add(id);
    return true;
  }

  release(id: string): void {
    this.active.delete(id);
  }
}

export const glassWebGLManager = new GlassWebGLManager();