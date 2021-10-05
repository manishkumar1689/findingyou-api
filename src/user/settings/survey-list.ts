const surveyList = [
  {
    key: 'preference',
    name: 'Core Preferences',
    multiscales: '',
    type: 'preferences',
    enabled: true,
  },
  {
    key: 'personality',
    name: 'Big Five',
    multiscales: 'big5',
    type: 'psychometric',
    enabled: true,
    range: [1, 5],
  },
  {
    key: 'jungian',
    name: 'Jungian',
    multiscales: 'jungian',
    type: 'psychometric',
    enabled: true,
    range: [1, 10],
  },
  {
    key: 'feedback',
    name: 'Feedback',
    multiscales: '',
    type: 'feedback',
    enabled: true,
  },
];

export default surveyList;
