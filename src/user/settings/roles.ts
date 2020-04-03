const roleValues = [
  {
    key: 'superadmin',
    name: 'Super administrator',
    overrides: [],
    adminAccess: true,
    appAccess: false, // would have to use a separate account
    permissions: ['all'],
  },
  {
    key: 'admin',
    name: 'Administrator',
    overrides: [],
    adminAccess: true,
    appAccess: false, // would have to use a separate account
    permissions: ['astrologic_testing', 'member_admin', 'dictionary_admin'],
  },
  {
    key: 'blocked',
    name: 'Blocked user',
    overrides: ['all'], // overrides any other roles for the duration of this status
    adminAccess: false,
    appAccess: false,
    inherits: [],
    permissions: [],
  },
  {
    key: 'active',
    name: 'Active member',
    overrides: [],
    adminAccess: false,
    appAccess: true,
    permissions: ['basic_search', 'basic_matching'],
  },
  {
    key: 'bronze',
    name: 'Bronze member',
    overrides: [],
    adminAccess: false,
    appAccess: true,
    inherits: ['active'],
    permissions: ['advanced_search', 'advanced_matching'],
  },
  {
    key: 'silver',
    name: 'Silver member',
    overrides: [],
    adminAccess: false,
    appAccess: true,
    inherits: ['active', 'bronze'],
    permissions: ['highlighted_profile'],
  },

  {
    key: 'star',
    name: 'Star member',
    overrides: [],
    adminAccess: false,
    appAccess: true,
    inherits: ['active', 'bronze'],
    permissions: ['astrologic_charting'],
  },
  {
    key: 'gold',
    name: 'Gold member',
    overrides: [],
    adminAccess: false,
    appAccess: true,
    inherits: ['active', 'bronze', 'silver'],
    permissions: ['personal_astrologer', 'personal_matchmaker'],
  },
];

export default roleValues;
