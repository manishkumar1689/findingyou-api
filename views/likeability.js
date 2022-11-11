db.createView(
  "likeability",
  "flags", [
  {
    $lookup: {
      from: "users",
      localField: "user",
      foreignField: "_id",
      as: "from"
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "targetUser",
      foreignField: "_id",
      as: "to"
    }
  },
  {
    $lookup: {
      from: 'flags',
      let: { from: "$user", to: "$targetUser" },
      pipeline: [
        {
          $match:
          {
            $expr:
            {
              $and:
                [
                  { $eq: ["$key", "likeability"] },
                  { $eq: ["$user", "$$to"] },
                  { $eq: ["$targetUser", "$$from"] }
                ]
            }
          }
        },
        { $project: { _id: 0, value: 1, createdAt: 1 } },
        { $sort: { createdAt: -1 } }
      ],
      as: "recip"
    }
  },
  {
    $unwind: "$from"
  },
  {
    $unwind: "$to"
  },
  {
    $match: {
      key: "likeability",
    }
  },
  {
    $project: {
      user: 1,
      targetUser: 1,
      value: 1,
      modifiedAt: 1,
      recip: "$recip",
      from: {
        identifier: 1,
        fullName: 1,
        nickName: 1,
        active: 1,
        roles: 1,
        dob: 1,
        geo: 1,
        gender: 1
      },
      to: {
        identifier: 1,
        fullName: 1,
        nickName: 1,
        active: 1,
        roles: 1,
        dob: 1,
        geo: 1,
        gender: 1
      }
    }
  }]
);