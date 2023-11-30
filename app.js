const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");

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

//API 1 REGISTER

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const getUserQuery = `
    SELECT 
    * 
    FROM 
    user 
    WHERE 
    username = '${username}';
    `;
  const dbUser = await db.get(getUserQuery);

  if (dbUser === undefined) {
    if (password.length < 5) {
      //password with less than 5 characters
      response.status(400);
      response.send("Password is too short");
    } else {
      //add user
      const hashPassword = await bcrypt.hash(password, 10);
      const addUserQuery = `
            INSERT INTO 
            user ( username, name, password, gender, location )
            VALUES ('${username}', '${name}', '${hashPassword}' , '${gender}' , '${location}');
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

//API 2 LOGIN

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `
    SELECT 
    * 
    FROM 
    user 
    WHERE 
    username = '${username}';
    `;
  const dbUser = await db.get(getUserQuery);

  if (dbUser === undefined) {
    //invalid user
    response.status(400);
    response.send("Invalid user");
  } else {
    //valid user
    let validPassword = await bcrypt.compare(password, dbUser.password);
    if (validPassword) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API 1 CHANGE-PASSWORD

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const getUserQuery = `
    SELECT 
    * 
    FROM 
    user 
    WHERE 
    username = '${username}';
    `;
  const dbUser = await db.get(getUserQuery);

  if (dbUser === undefined) {
    //invalid user
    response.status(400);
    response.send("Invalid user");
  } else {
    //valid user
    let validPassword = await bcrypt.compare(oldPassword, dbUser.password);
    if (validPassword) {
      if (newPassword.length < 5) {
        //password with less than 5 characters
        response.status(400);
        response.send("Password is too short");
      } else {
        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
            UPDATE user 
            SET password = '${newHashedPassword}'
            WHERE username = '${username}';
            `;
        await db.run(updatePasswordQuery);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
