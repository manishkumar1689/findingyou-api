db.createView(
  "reported_users",
  "flags", [{
    $lookup: {
      from: 'feedbacks',
      let: { from: "$user", to: "$targetUser" },
      pipeline: [
        {
          $match:
          {
            $expr:
            {
              $and:
                [
                  { $eq: ["$user", "$$from"] },
                  { $eq: ["$targetUser", "$$to"] }
                ]
            }
          }
        },
        { $project: { _id: -1, key: 1, reason: 1, text: 1, deviceDetails: 1, mediaItems: 1, createdAt: 1 } },
        { $sort: { createdAt: -1 } }
      ],
      as: "reports"
    }
  },
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
    $unwind: "$from"
  },
  {
    $unwind: {
      path: "$to",
      preserveNullAndEmptyArrays: true,
    }
  },
  {
    $match: {
      key: "blocked",
    }

  },
  {
    $project: {
      user: 1,
      targetUser: 1,
      modifiedAt: 1,
      reports: 1,
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