export const globalEvents: {
  events: { [key: string]: string };
} = {
  events: {},
};

export function RegisterEvents(events: { [key: string]: string }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return function (target: unknown) {
    globalEvents.events = { ...globalEvents.events, ...events };
  };
}
