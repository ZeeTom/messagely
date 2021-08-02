"use strict";

const db = require("../db");
const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR } = require("../config");
const { NotFoundError } = require("../expressError");

/** User of the site. */

class User {
  /** Register new user. Returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, firstName, lastName, phone }) {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    const newUser = await db.query(
      `INSERT INTO users(username, password, first_name, last_name, phone)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING username, password, first_name AS firstName, last_name AS lastName, phone`,
      [username, hashedPassword, firstName, lastName, phone]
    );

    return newUser.rows[0];
  }

  /** Authenticate: is username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const result = await db.query(
      `SELECT password
       FROM users
       WHERE username = $1`,
      [username]
    );
    const hashedPassword = result.rows[0].password;
    console.log("result on line 35 is", result.rows[0]);
    return bcrypt.compare(password, hashedPassword) === true;
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const lastLogIn = new Date();

    const result = await db.query(
      `UPDATE last_login_at=$1
        FROM users
        WHERE username=$2
        RETURNING username`,
      [lastLogIn, username]
    );

    if (!result.rows[0]) {
      throw new NotFoundError(`User ${username} not found.`);
    }
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name}, ...] */

  static async all() {
    const result = await db.query(
      `SELECT username, first_name, last_name, phone
        FROM users`
    );
    const users = result.rows;

    return users;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await db.query(
      `SELECT username, first_name, last_name, phone
        FROM users
        WHERE username=$1`,
      [username]
    );
    const user = result.rows[0];

    if (!user) {
      throw new NotFoundError(`User ${username} not found.`);
    }

    return user;
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const result = await db.query(
      `SELECT m.id,
       m.body,
       m.sent_at,
       m.read_at,
       to.username,
       to.first_name,
       to.last_name,
       to.phone
      FROM messages AS m
      JOIN users
      ON m.to_username = to.username
      WHERE m.from_username = $1`,
      [username]
    );

    const messages = result.rows.map((m) => {
      return {
        id: m.id,
        to_user: {
          username: to.username,
          first_name: to.first_name,
          last_name: to.last_name,
          phone: to.phone,
        },
        body: m.body,
        sent_at: m.sent_at,
        read_at: m.read_at,
      };
    });
    return messages;
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {id, first_name, last_name, phone}
   */

  static async messagesTo(username) {}
}

module.exports = User;
