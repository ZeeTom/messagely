"use strict";

const db = require("../db");
const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR } = require("../config");
const { NotFoundError, BadRequestError } = require("../expressError");

/** User of the site. */

class User {
  /** Register new user. Returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    const joinAt = new Date();
    const lastLogIn = new Date();
    const result = await db.query(
      `INSERT INTO users (username, password, first_name, last_name, phone, join_at, last_login_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING username, password, first_name, last_name, phone`,
      [
        username,
        hashedPassword,
        first_name,
        last_name,
        phone,
        joinAt,
        lastLogIn,
      ]
    );

    return result.rows[0];
  }

  /** Authenticate: is username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const result = await db.query(
      `SELECT password
       FROM users
       WHERE username = $1`,
      [username]
    );

    if (!result.rows[0]) {
      throw new BadRequestError("Username or Password incorrect");
    }

    const hashedPassword = result.rows[0].password;

    return (await bcrypt.compare(password, hashedPassword)) === true;
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const lastLogIn = new Date();

    const result = await db.query(
      `UPDATE users
        SET last_login_at=$1
        WHERE username=$2
        RETURNING last_login_at`,
      [lastLogIn, username]
    );

    if (!result.rows[0]) {
      throw new NotFoundError(`User ${username} not found.`);
    }
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name}, ...] */

  static async all() {
    // order by username (or something)
    const result = await db.query(
      `SELECT username, first_name, last_name
        FROM users
        ORDER BY username`
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
      `SELECT username, first_name, last_name, phone, join_at, last_login_at
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
      `SELECT id,
       body,
       sent_at,
       read_at,
       username,
       first_name,
       last_name,
       phone
      FROM messages
      JOIN users
      ON to_username = username
      WHERE from_username = $1`,
      [username]
    );
    if (!result.rows[0]) {
      new NotFoundError(`User ${username} not found.`);
    }

    const messages = result.rows.map((m) => {
      return {
        id: m.id,
        to_user: {
          username: m.username,
          first_name: m.first_name,
          last_name: m.last_name,
          phone: m.phone,
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
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const result = await db.query(
      `SELECT id,
        body,
        sent_at,
        read_at,
        username,
        first_name,
        last_name,
        phone
      FROM messages
        JOIN users
        ON from_username = username
      WHERE to_username = $1`,
      [username]
    );

    if (!result.rows[0]) {
      new NotFoundError(`User ${username} not found.`);
    }

    const messages = result.rows.map((m) => {
      return {
        id: m.id,
        from_user: {
          username: m.username,
          first_name: m.first_name,
          last_name: m.last_name,
          phone: m.phone,
        },
        body: m.body,
        sent_at: m.sent_at,
        read_at: m.read_at,
      };
    });
    return messages;
  }
}

module.exports = User;
