export const STATUS_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const ROLE_TARGETS = {
  customer: ["cancelled"],
  vendor: ["confirmed", "shipped", "delivered", "cancelled"],
};

export const canTransition = (from, to) =>
  STATUS_TRANSITIONS[from]?.includes(to) ?? false;

export const canActorSet = (actor, to) =>
  ROLE_TARGETS[actor]?.includes(to) ?? false;