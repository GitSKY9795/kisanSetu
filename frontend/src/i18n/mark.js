// Marks an English string that lives in a constant (a module-level array, a data table,
// a hook) so it is picked up for translation, without translating it yet — hooks can't be
// called at module level. The string is translated where it is shown: `t(item.title)`.
export const T = (text) => text;
