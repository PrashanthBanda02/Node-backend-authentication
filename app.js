const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const format = require("date-fns/format");
const isMatch = require("date-fns/isMatch");
var isValid = require("date-fns/isValid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

let db;
const initializeDBandServer = async () => {
  try {
    db = await open({
      filename: path.join(__dirname, "twitterClone.db"),
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running on http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DataBase error is ${error.message}`);
    process.exit(1);
  }
};
initializeDBandServer();

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//API 1

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const getUserQuery = `
    SELECT 
    * 
    FROM 
    user 
    WHERE 
    username = '${username}';`;
  const dbUser = await db.get(getUserQuery);

  if (dbUser === undefined) {
    if (password.length < 6) {
      //password with less than 5 characters
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashPassword = bcrypt.hash(password, 10);
      const addUserQuery = `
      INSERT INTO 
      user ( name ,username, password, gender)
      VALUES ('${name}', '${username}', '${hashPassword}' , '${gender}');
            `;
      await db.run(addUserQuery);
      response.send("User created successfully");
    }
  } else {
    //invalid user
    response.status(400);
    response.send("User already exists");
  }
});

//API 2

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await db.get(selectUserQuery);
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API 3

app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const username = request.username;
  //console.log(username);

  const followerUserIdQuery = ` 
  SELECT 
  user_id
  FROM
  user
  WHERE 
  username = '${username}';`;

  const followerUserIdObject = await db.get(followerUserIdQuery);

  const followerUserId = followerUserIdObject.user_id;

  //console.log(followerUserId);
  const query = `
    SELECT username, tweet, date_time As dateTime
    FROM follower INNER JOIN tweet
    ON follower.following_user_id = tweet.user_id
    NATURAL JOIN user
    WHERE follower.follower_user_id = ${followerUserId}
    ORDER BY dateTime DESC
    LIMIT 4`;

  const data = await db.all(query);
  response.send(data);
});
