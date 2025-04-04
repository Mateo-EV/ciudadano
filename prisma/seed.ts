import { hash } from "@/lib/bcrypt";
import { db } from "@/server/db";
import { faker } from "@faker-js/faker";

async function main() {
  // Crear usuarios
  const password = await hash("password123");

  const firstUser = await db.user.create({
    data: {
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
      phone: faker.phone.number(),
      address: faker.location.streetAddress(),
      email: "riojamatthew@gmail.com",
      dni: faker.string.numeric(8),
      password: password,
    },
  });

  const users = await Promise.all(
    Array.from({ length: 10 }).map(() =>
      db.user.create({
        data: {
          first_name: faker.person.firstName(),
          last_name: faker.person.lastName(),
          phone: faker.phone.number(),
          address: faker.location.streetAddress(),
          email: faker.internet.email(),
          dni: faker.string.numeric(8),
          password: password,
        },
      }),
    ),
  );

  users.unshift(firstUser);

  // Crear contactos entre algunos usuarios (user[0] agrega a user[1..3])
  const contactRelations = await Promise.all(
    [1, 2, 3].map((i) =>
      db.contacts.create({
        data: {
          from_id: firstUser.id,
          to_id: users[i]!.id,
        },
      }),
    ),
  );

  // Crear mensajes entre contactos
  await Promise.all(
    contactRelations.map((contact, i) =>
      db.contactMessage.create({
        data: {
          user_id: firstUser.id,
          contact_id: contact.id,
          content: faker.lorem.sentence(),
          type: "text",
        },
      }),
    ),
  );

  // Crear 2 grupos con miembros aleatorios
  const group1 = await db.group.create({
    data: {
      name: "Alerta Zona Norte",
      description: "Vecinos de la zona norte",
      code: "ZONANORTE01",
    },
  });

  const group2 = await db.group.create({
    data: {
      name: "Alerta Zona Sur",
      description: "Vecinos de la zona sur",
      code: "ZONASUR01",
    },
  });

  // Agregar 5 usuarios a cada grupo
  await Promise.all(
    users.slice(0, 5).map((user) =>
      db.groupUser.create({
        data: {
          user_id: user.id,
          group_id: group1.id,
        },
      }),
    ),
  );

  await Promise.all(
    users.slice(5).map((user) =>
      db.groupUser.create({
        data: {
          user_id: user.id,
          group_id: group2.id,
        },
      }),
    ),
  );

  // Mensajes en grupos
  await Promise.all(
    users.slice(0, 3).map((user) =>
      db.groupMessage.create({
        data: {
          user_id: user.id,
          group_id: group1.id,
          content: faker.lorem.sentence(),
          type: "info",
        },
      }),
    ),
  );

  // Crear incidentes aleatorios
  await Promise.all(
    users.map((user) =>
      db.incendent.create({
        data: {
          user_id: user.id,
          incident_type: faker.helpers.arrayElement([
            "Robo",
            "Asalto",
            "Vandalismo",
          ]),
          description: faker.lorem.sentences(2),
          location_lat: faker.location.latitude({ max: -14.05, min: -14.07 }),
          location_lon: faker.location.longitude({ max: -14.05, min: -14.07 }),
          happend_at: faker.date.recent({ days: 10 }),
        },
      }),
    ),
  );

  // Crear alertas activas
  await Promise.all(
    users.slice(0, 5).map((user) =>
      db.alert.create({
        data: {
          user_id: user.id,
          location_lat: faker.location.latitude({ max: -14.05, min: -14.07 }),
          location_lon: faker.location.longitude({ max: -14.05, min: -14.07 }),
        },
      }),
    ),
  );

  // Crear 5 noticias
  await Promise.all(
    Array.from({ length: 5 }).map(() =>
      db.news.create({
        data: {
          title: faker.lorem.words(5),
          content: faker.lorem.paragraph(),
          image: faker.image.url(),
          category: faker.helpers.arrayElement([
            "Seguridad",
            "Comunidad",
            "Prevención",
          ]),
        },
      }),
    ),
  );
}

main()
  .then(() => {
    console.log("✅ Seed completado");
    return db.$disconnect();
  })
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    return db.$disconnect();
  });
