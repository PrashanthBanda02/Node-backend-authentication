const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "goodreads.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Get Books API
app.get("/books/", async (request, response) => {
  const getBooksQuery = `
  SELECT
    *
  FROM
    book
  ORDER BY
    book_id;`;
  const booksArray = await db.all(getBooksQuery);
  response.send(booksArray);
});

// create user API

app.post("/users/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const selectUserQuery = `
  SELECT 
    * 
  FROM 
    user 
  WHERE 
    username = '${username}'`;

  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    //add user in user table
    const addUserQuery = `
      INSERT INTO
      user (username, name, password, gender, location )
      VALUES ( 
          '${username}' ,
          '${name}', 
          '${hashedPassword}', 
          '${gender}', 
          '${location}'
           );`;
    await db.run(addUserQuery);
    response.send("user added successfully");
  } else {
    //send invalid username as response
    response.status(400);
    response.send("username already exists");
  }
});

//user login API

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const userExistQuery = ` 
    SELECT 
    * 
    FROM 
    user
    WHERE 
    username = '${username}';
    `;
  const userExist = await db.get(userExistQuery);

  if (userExist == undefined) {
    //user does not exist
    response.status(400);
    response.send("invalid user");
  } else {
    //compare password , hashedPassword
    const isPasswordMatched = await bcrypt.compare(
      password,
      userExist.password
    );
    if (isPasswordMatched === true) {
      response.send("login success");
    } else {
      response.status(400);
      response.send("invalid password");
    }
  }
});

module.exports = app;
