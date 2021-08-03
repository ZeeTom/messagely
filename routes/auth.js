"use strict";

const Router = require("express").Router;
const router = new Router();
const { UnauthorizedError, BadRequestError } = require("../expressError");
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const User = require("../models/user");

/** POST /login: {username, password} => {token} */

router.post("/login", async function (req, res, next) {
  const { username, password } = req.body;  
  const isAuthenticated = await User.authenticate(username, password);

  if (!isAuthenticated) {
    throw new UnauthorizedError("Username or Password incorrect");
  }

  let token = jwt.sign({ username }, SECRET_KEY);

  return res.json({ token });
});

/** POST /register: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 */

router.post("/register", async function (req, res, next) {
  const { username, password, first_name, last_name, phone } = req.body;

  let newUser;
  try {
    newUser = await User.register({
      username,
      password,
      first_name,
      last_name,
      phone,
    });
  } catch {
    throw new BadRequestError();
  }

  let token = jwt.sign({ username: newUser.username }, SECRET_KEY);

  return res.json({ token });
});

module.exports = router;
