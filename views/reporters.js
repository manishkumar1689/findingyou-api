db.createView(
  "reporters",
  "feedbacks", [
  {
    $lookup: {
      from: "users",
      localField: "user",
      foreignField: "_id",
      as: "from"
    }
  },
  {
    $unwind: "$from"
  },
  {
    $match: {
      key: "user_report",
    }
  },
  {
    $project: {
      user: 1,
      targetUser: 1,
      key: 1,
      reason: 1,
      text: 1,
      createdAt: 1,
      modifiedAt: 1,
      identifier: "$from.identifier",
      fullName: "$from.fullName",
      nickName: "$from.nickName",
      active: "$from.active",
      roles: "$from.roles",
      dob: "$from.dob",
      geo: "$from.geo",
      login: "$from.login",
      gender: "$from.gender",
      joined: "$from.createdAt"
    },
  },
  {
    $sort: {
      createdAt: -1,
    }
  }
]
);