"use strict";

const Router = require("express").Router;
const router = new Router();
const Message = require("../models/message");
const { UnauthorizedError, NotFoundError } = require("../expressError");
const {
  authenticateJWT,
  ensureLoggedIn,
  ensureCorrectUser,
} = require("../middleware/auth");

/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Makes sure that the currently-logged-in users is either the to or from user.
 *
 **/
router.get("/:id", ensureLoggedIn, async function (req, res, next) {
  const id = req.params.id;
  const message = await Message.get(id);

  // If current user not sender/receipient, throw unauth err
  const username = res.locals.user.username;
  if (
    !(message.from_user.username === username) &&
    !(message.to_user.username === username)
  ) {
    throw new UnauthorizedError();
  }

  return res.json(message);
});

/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/
router.post("/", ensureLoggedIn, async function (req, res, next) {
  const from_username = res.locals.user.username;
  const { to_username, body } = req.body;
  let message;
  try {
    message = await Message.create({ from_username, to_username, body });
  } catch {
    throw new NotFoundError(`User ${to_username} not found`);
  }

  return res.status(201).json(message);
});

/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Makes sure that the only the intended recipient can mark as read.
 *
 **/

router.post("/:id/read", ensureLoggedIn, async function (req, res, next) {
  const { id } = req.params;
  let message = await Message.get(id);

  // If current user not msg recipient, throw unauth err
  const username = res.locals.user.username;
  if (!(message.to_user.username === username)) {
    throw new UnauthorizedError();
  }

  message = await Message.markRead(id);

  return res.json({ message });
});

module.exports = router;
