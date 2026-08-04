export enum Urgency {
  EMERGENCY = 'EMERGENCY',
  NORMAL = 'NORMAL',
}

export type Token = {
  tokenId: string;
  patientName: string;
  department: string;
  urgency: Urgency;
  timestamp: number;
};

export class TokenGenerator {
  private counters = new Map<string, number>();

  generateToken(patientName: string, deptCode: string, urgency: Urgency): Token {
    const prefix = urgency === Urgency.EMERGENCY ? 'EMG' : deptCode;
    const nextCount = (this.counters.get(prefix) ?? 0) + 1;
    this.counters.set(prefix, nextCount);

    return {
      tokenId: `${prefix}-${String(nextCount).padStart(3, '0')}`,
      patientName,
      department: deptCode,
      urgency,
      timestamp: Date.now(),
    };
  }

  resetCounter(deptCode: string) {
    this.counters.set(deptCode, 0);
  }

  resetAllCounters() {
    this.counters.clear();
  }
}

export class QueueManager {
  protected departmentQueues = new Map<string, Token[]>();
  protected pendingList: Token[] = [];

  addToken(token: Token) {
    const queue = this.departmentQueues.get(token.department) ?? [];
    queue.push(token);
    this.departmentQueues.set(token.department, queue);
  }

  callNext(department: string): Token | null {
    const queue = this.departmentQueues.get(department);
    if (!queue || queue.length === 0) {
      return null;
    }

    const [next] = queue;
    queue.shift();
    return next;
  }

  skipToken(department: string): Token | null {
    const queue = this.departmentQueues.get(department);
    if (!queue || queue.length === 0) {
      return null;
    }

    const [skipped] = queue;
    queue.shift();
    this.pendingList.push(skipped);
    return skipped;
  }

  reinsertPending(tokenId: string): boolean {
    const index = this.pendingList.findIndex((token) => token.tokenId === tokenId);
    if (index === -1) {
      return false;
    }

    const [token] = this.pendingList.splice(index, 1);
    const queue = this.departmentQueues.get(token.department) ?? [];
    queue.unshift(token);
    this.departmentQueues.set(token.department, queue);
    return true;
  }

  queueLength(department: string) {
    return this.departmentQueues.get(department)?.length ?? 0;
  }

  isEmpty(department: string) {
    return this.queueLength(department) === 0;
  }

  getQueueSnapshot() {
    return new Map(
      Array.from(this.departmentQueues.entries()).map(([department, queue]) => [department, [...queue]]),
    );
  }

  getPendingSnapshot() {
    return [...this.pendingList];
  }
}

export class PriorityHandler extends QueueManager {
  override addToken(token: Token) {
    const queue = this.departmentQueues.get(token.department) ?? [];

    if (token.urgency === Urgency.NORMAL) {
      queue.push(token);
      this.departmentQueues.set(token.department, queue);
      return;
    }

    const insertIndex = queue.findIndex(
      (queuedToken) => queuedToken.urgency === Urgency.NORMAL || queuedToken.timestamp > token.timestamp,
    );

    if (insertIndex === -1) {
      queue.push(token);
    } else {
      queue.splice(insertIndex, 0, token);
    }

    this.departmentQueues.set(token.department, queue);
  }
}
