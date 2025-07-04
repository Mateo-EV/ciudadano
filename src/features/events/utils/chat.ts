import type { Group } from "@prisma/client";
import { emitToUsers } from "./to-users";
import { CHAT_EVENTS } from "../constants";

type GroupWithUsers = Group & {
  users: ({
    user: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    };
  } & {
    user_id: string;
    group_id: string;
    join_date: Date;
  })[];
};

type MessageWithUser = {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string;
  };
} & {
  id: string;
  user_id: string;
  created_at: Date;
  content: string;
  group_id: string;
};

export function emitChatGroupCreated(group: GroupWithUsers) {
  emitToUsers(
    group.users.map((user) => user.user_id),
    CHAT_EVENTS.GROUP_CREATED,
    group,
  );
}

export function emitChatGroupMessageSent(
  message: MessageWithUser,
  userIds: string[],
) {
  emitToUsers(userIds, CHAT_EVENTS.GROUP_MESSAGE_SENT, message);
}
