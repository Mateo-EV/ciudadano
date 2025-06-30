import authMiddleware from "@/features/auth/server/middleware/authMiddleware";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator as zValidator } from "hono-openapi/zod";
import {
  createGroupSchema,
  sendMessageSchema,
  phoneNumbersSchema,
} from "@/features/chats/schema";
import { db } from "@/server/db";

export const chatRouter = new Hono()
  .post(
    "/groups",
    describeRoute({
      tags: ["Chats"],
      summary: "Crear un grupo de chat",
      description:
        "Crea un nuevo grupo de chat con un nombre, descripción y miembros.",
      responses: {
        201: {
          description: "Grupo creado exitosamente",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  data: {
                    type: "object",
                    properties: {
                      group: { $ref: "#/components/schemas/Group" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    authMiddleware,
    zValidator("json", createGroupSchema),
    async (c) => {
      const { name, description, users } = c.req.valid("json");

      const group = await db.group.create({
        data: {
          name,
          description,
          users: {
            createMany: {
              data: users.map((userId) => ({ user_id: userId })),
            },
          },
          code: Math.random().toString(36).substring(2, 15),
        },
        include: {
          users: {
            include: {
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return c.json(
        {
          message: "Grupo creado exitosamente",
          data: { group },
        },
        201,
      );
    },
  )
  .get(
    "/groups/me",
    describeRoute({
      tags: ["Chats"],
      summary: "Obtener grupos de chat del usuario",
      description:
        "Obtiene todos los grupos de chat a los que pertenece el usuario.",
      responses: {
        200: {
          description: "Grupos obtenidos exitosamente",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Group" },
                  },
                },
              },
            },
          },
        },
      },
    }),
    authMiddleware,
    async (c) => {
      const userId = c.get("user").id;

      const groups = await db.group.findMany({
        where: {
          users: {
            some: {
              user_id: userId,
            },
          },
        },
        include: {
          users: {
            include: {
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return c.json(
        {
          data: groups,
        },
        200,
      );
    },
  )
  .get(
    "/groups/:id/messages",
    describeRoute({
      tags: ["Chats"],
      summary: "Obtener mensajes de un grupo de chat",
      description: "Obtiene todos los mensajes de un grupo de chat específico.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "ID del grupo de chat",
          schema: {
            type: "string",
            format: "cuid",
          },
        },
      ],
    }),
    authMiddleware,
    async (c) => {
      const groupId = c.req.param("id");

      const messages = await db.groupMessage.findMany({
        where: {
          group_id: groupId,
        },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      });

      return c.json(
        {
          message: "Mensajes obtenidos exitosamente",
          data: { messages },
        },
        200,
      );
    },
  )
  .post(
    "/groups/:id/messages",
    describeRoute({
      tags: ["Chats"],
      summary: "Enviar un mensaje a un grupo de chat",
      description: "Envía un nuevo mensaje a un grupo de chat específico.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "ID del grupo de chat",
          schema: {
            type: "string",
            format: "cuid",
          },
        },
      ],
    }),
    authMiddleware,
    zValidator("json", sendMessageSchema),
    async (c) => {
      const groupId = c.req.param("id");
      const { message: content } = c.req.valid("json");

      const message = await db.groupMessage.create({
        data: {
          content,
          user_id: c.get("user").id,
          group_id: groupId,
        },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      });

      return c.json(
        {
          message: "Mensaje enviado exitosamente",
          data: { message },
        },
        201,
      );
    },
  )
  .get(
    "/contacts",
    describeRoute({
      tags: ["Chats"],
      summary: "Obtener contactos",
      description:
        "Obtiene una lista de contactos a partir de los números de teléfono proporcionados.",
      responses: {
        200: {
          description: "Contactos obtenidos exitosamente",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  data: {
                    type: "object",
                    properties: {
                      contacts: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            first_name: { type: "string" },
                            last_name: { type: "string" },
                            email: { type: "string" },
                            phone: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        404: {
          description: "No se encontraron contactos",
        },
      },
    }),
    authMiddleware,
    zValidator("query", phoneNumbersSchema),
    async (c) => {
      const { phones } = c.req.valid("query");

      const contacts = await db.user.findMany({
        where: {
          phone: {
            in: phones,
          },
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
        },
      });

      if (contacts.length === 0) {
        return c.json(
          {
            message: "No se encontraron contactos",
            data: { contacts: [] },
          },
          404,
        );
      }

      return c.json(
        {
          message: "Contactos obtenidos exitosamente",
          data: contacts,
        },
        200,
      );
    },
  );
