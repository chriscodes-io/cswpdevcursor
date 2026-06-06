/** Pica action IDs discovered via user-pica MCP (gmail, hubspot, slack). */
export const PICA_ACTIONS = {
  gmail: {
    listMessages: 'conn_mod_def::GJ3odOE-fdw::ijLww5s-SCSplLQtLpxkrw',
    getMessage: 'conn_mod_def::GJ3ocvMGOS8::D__3BgQSSzWtDUoOqLuX2A',
  },
  hubspot: {
    createContact: 'conn_mod_def::GJ3kRa59YdQ::k6o-IYauSoqishpRytOX-Q',
    searchContacts: 'conn_mod_def::GJ3kSC2Sp7I::L6cYnwOfTUatg0cXeWjCBA',
  },
  slack: {
    postMessage: 'conn_mod_def::GJ7H84zBlaI::BCfuA16aTaGVIax5magsLA',
  },
} as const;
