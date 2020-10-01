const flags = [
  { key: 'like', type: 'boolean', defaultValue: false },
  { key: 'wink', type: 'boolean', defaultValue: false },
  { key: 'no_winking', type: 'boolean', defaultValue: false },
  { key: 'view_protected', type: 'boolean', defaultValue: false },
  { key: 'view_private', type: 'boolean', defaultValue: false },
  { key: 'may_chat', type: 'boolean', defaultValue: false },
  { key: 'is_abusive', type: 'boolean', defaultValue: false },
  { key: 'reported', type: 'boolean', defaultValue: false },
];

const ratings = [
  { key: 'looks', type: 'double', defaultValue: 3, range: [0, 5] },
  { key: 'character', type: 'double', defaultValue: 3, range: [0, 5] },
];

export default [...flags, ...ratings];
