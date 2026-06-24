import mongoose from 'mongoose';

import { normalizeObjectIdString, type AuthorInfo } from '@/lib/author-display';
import { UserModel } from '@/models/User';

export async function fetchUsersByIds(userIds: unknown[]): Promise<Map<string, AuthorInfo>> {
  const ids = [
    ...new Set(
      userIds
        .map((userId) => normalizeObjectIdString(userId))
        .filter((userId): userId is string => userId !== null),
    ),
  ];

  if (ids.length === 0) {
    return new Map();
  }

  const users = await UserModel.find({
    _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
  })
    .select('name email')
    .lean<{ _id: mongoose.Types.ObjectId; name: string; email: string }[]>();

  return new Map(
    users.map((user) => [
      String(user._id),
      { name: user.name, email: user.email },
    ]),
  );
}
