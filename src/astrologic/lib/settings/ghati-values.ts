/* Ancient Indian Time Units - starting from Sun-rise  */
const ghatiValues = [
   {
      key: "mu",
      name: "muhūrta", formula: {
         unit: "dayLength",
         op: "/",
         operand: 30,
         description: "2 x ghaṭi -- - 30 muhūrtas in duration from SunRise to next day SunRise"
      }
   },
   {
      key: "gh",
      name: "ghaṭi",
      formula: {
         unit: "dayLength",
         op: "/",
         operand: 60,
         description: "(duration from SunRise to SunRise (next day)) / 60"
      }
   },
   {
      key: "vi",
      name: "vighaṭi",
      formula: {
         unit: "gh",
         op: "/",
         operand: 60,
         description: "ghaṭi / 60"
      }
   },
   {
      key: "li",
      name: "lipta",
      formula: {
         unit: "vi",
         op: "/",
         operand: 60,
         description: "vighaṭi / 60"
      }
   },
];

export default ghatiValues;