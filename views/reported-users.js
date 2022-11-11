db.createView(
  "reported_users",
  "users", [
  {
    $lookup: {
      from: "reporters",
      localField: "_id",
      foreignField: "user",
      as: "reports"
    }
  },
  {
    $match: {
      "reports.key": "user_report",
    }
  },
  {
    $project: {
      targetUser: "$_id",
      reports: 1,
      identifier: 1,
      fullName: 1,
      nickName: 1,
      active: 1,
      roles: 1,
      dob: 1,
      geo: 1,
      gender: 1,
      login: 1,
      joined: "$createdAt",
      modifiedAt: 1,
    }
  }]
);