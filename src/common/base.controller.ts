import { ForbiddenException } from '@nestjs/common';

export abstract class BaseController {
  async authorize(can: (() => Promise<boolean> | boolean) | boolean) {
    const isAuthorized = await Promise.resolve(typeof can === 'function' ? can() : can);
    if (!isAuthorized) {
      throw new ForbiddenException();
    }
  }

  or(...funcs: (boolean | (() => boolean))[]): boolean {
    return funcs.some((func) => (typeof func === 'function' ? func() : func));
  }

  and(...funcs: (boolean | (() => boolean))[]): boolean {
    return funcs.every((func) => (typeof func === 'function' ? func() : func));
  }

  when(func: boolean | (() => boolean)) {
    return new AuthorizationPolicyBuilder(func);
  }
}

class AuthorizationPolicyBuilder {
  constructor(readonly func: boolean | (() => boolean)) {
    this.policy = typeof func === 'function' ? func() : func;
  }
  private policy: boolean;
  or(func: boolean | (() => boolean)): AuthorizationPolicyBuilder {
    this.policy = this.policy || (typeof func === 'function' ? func() : func);
    return this;
  }

  and(func: boolean | (() => boolean)): AuthorizationPolicyBuilder {
    this.policy = this.policy && (typeof func === 'function' ? func() : func);
    return this;
  }

  authorize(): boolean {
    return this.policy;
  }
}
