//Temiloluwa Olufore 1970625

//Dependencies
const express = require("express");
const app = express();
const bcrypt = require("bcrypt"); //Hashing Library store password
const session = require("express-session");//Store user across requests
const axios = require("axios"); //Promise based axios for simplicity. Built in HTTP requests already. Makes API calls straightfoward
const bodyParser = require("body-parser");
const path = require("path");
const methodOverride = require("method-override");

app.use(bodyParser.json()); //body-parser middleware
app.set("view engine", "ejs"); //ejs templating
app.use(express.static("public")); //img and css files from the public folder being read
app.use(express.urlencoded({ extended: false })); //middleware to parse data from submitted forms
app.use("/node_modules", express.static(path.join(__dirname, "node_modules"))); //node modules directory in order to use the dependecies
app.use(methodOverride("_method")); //Middleware for PUT and DELETE so that the parameters can be passed in the POST form and work.




//LOGIN
let hashedPassword; // declaring hashed globally so we can fetch and read it from the db //Password was hashed with bcrypt before being stored in db
app.get("/login", async (req, res) => {
  const response = await axios.get("http://127.0.0.1:5000/api/login"); //API call to login api on flask backend
  const hashjson = response.data;
  hashedPassword = hashjson[0].HashesforDecrypt; // Hash is in a json array so we use [0] to index and parse the hash and store it for validation on the client side
  res.render("pages/login.ejs"); // The API response is rendered with the page
});

const Authentication = (req, res, next) => { //CHAT GPT Authentication function for client validation
  if (req.session && req.session.user === "user") { //check that the session is only being accessed by "user"
    return next();
  } else {
    return res.redirect("/login"); //Return to login if false
  }
};

app.use(
  session({ //CHAT GPT express session middleware in order to store data on the server and post to dbs
    secret: "86fjldt", //string for assigning session id cookie
    resave: true,
    saveUninitialized: true, //session storing for new visitors
  })
);

app.post("/login", async (req, res) => { //Posting the login data for validation
  const username = req.body.username; //parsing the body the parameters being evaluated
  const password = req.body.password;

  if (username === "user" && (await bcrypt.compare(password, hashedPassword))) {//bcrypt comparing the entered password and hash along with the username
    req.session.user = username; // session for "user"
    res.render("pages/lssf.ejs", { // rendering home page after authentication is true
      username: username,
      auth: true,
    });
  } else {
    res.render("pages/login.ejs", { //login redirect if false
      username: username,
      auth: false,
    });
  }
});
//LOGIN END



//HOME PAGE
app.get("/", Authentication, function (req, res) {
  res.render("pages/lssf.ejs", {});
});
//HOME PAGE



//Every 'app.get' server will be passed through the Authentication function, verifying that the user session is valid



//FLOOR CRUDs
app.get("/floor", Authentication, function (req, res) { //Floor page
  res.render("pages/floor.ejs", {});
});

app.get("/floor/view", Authentication, async (req, res) => {  //Floor View page 
  const response = await axios.get("http://127.0.0.1:5000/api/floor"); //Axios API 'GET' call to flask backend
  const floordata = response.data;
  res.render("pages/floorview.ejs", { floordata }); //response
});

app.get("/floor/add", Authentication, function (req, res) { //Floor Add page
  res.render("pages/flooradd.ejs", {});
});

app.post("/floor/add", async (req, res) => {
  const level = req.body.level; //SQL columns to be added to
  const name = req.body.name;
  const response = await axios.post("http://127.0.0.1:5000/api/floor", { //Axios API 'POST' call to flask backend
    level,
    name,
  });
  const jsondata = response.data;
  const Message = `Floor ${level}, '${name}' added succesfully`; //Sucess message for room
  if (jsondata === null || (Array.isArray(jsondata) && jsondata.length === 0)) { //Empty array or null responses from flask backend (On all POST requests)
    res.render("pages/msgsuc.ejs", { Message });
  } else {
    res.render("pages/err.ejs", { jsondata }); //jsondata will contain error handling messages related to the restrictions on the rubric (Room 101 can on only be on level 1 etc....)
  }
});

app.get("/floor/update", Authentication, async (req, res) => { //Floor Update page
  const floorlevel = req.params.floorlevel;
  const response = await axios.get("http://127.0.0.1:5000/api/floor");
  const floordata = response.data;
  res.render("pages/floorupdate.ejs", { floorlevel, floordata });
});

app.put("/api/floor/:floorlevel", async (req, res) => { //floorlevel being the arg passed
  const floorlevel = req.body.floorlevel;
  const name = req.body.name;
  const response = await axios.put(
    `http://127.0.0.1:5000/api/floor/${floorlevel}`, { //Axios API 'PUT' call to flask backend
      name: name,
    }
  );
  const jsondata = response.data;
  const Message = jsondata.Message;
  if (response.status === 200) { //For PUT DELETE and GETs, the responses are built into the backend so a 200 response accounts for any handling needed.
    res.render("pages/msgsuc.ejs", { Message });
  }
});

app.get("/floor/delete", Authentication, async (req, res) => { //Floor Delete page
  const level = req.query.level;
  const response = await axios.get("http://127.0.0.1:5000/api/floor");
  const floordata = response.data;
  res.render("pages/floordelete.ejs", { floordata, level }); //Floor levels loaded
});

app.delete("/api/floor/:level", async (req, res) => {
  const level = req.body.level;
  const response = await axios.delete(`http://127.0.0.1:5000/api/floor/${level}`,{}); //Axios API 'DELETE' call to flask backend
  const jsondata = response.data;
  const Message = jsondata.Message;
  if (response.status === 200) {
    res.render("pages/msgsuc.ejs", { Message });
  }
});
//FLOOR CRUDs END






//ROOM CRUDs
app.get("/room", Authentication, function (req, res) { //Room CRUD page
  res.render("pages/room.ejs", {});
});

app.get("/room/view", Authentication, async (req, res) => {
  const response = await axios.get("http://127.0.0.1:5000/api/room"); // Room View page
  const roomdata = response.data;
  res.render("pages/roomview.ejs", { roomdata });
});

app.get("/room/add", Authentication, async (req, res) => { //Room Add page
  const response = await axios.get("http://127.0.0.1:5000/api/floor"); // Axios API 'GET' call and floordata from the floors table in order to see the floors available in dropdown
  const floordata = response.data;
  res.render("pages/roomadd.ejs", { floordata });
});

app.post("/room/add", async (req, res) => {
  const number = req.body.number;
  const capacity = req.body.capacity;
  const floor = req.body.floor;
  const response = await axios.post("http://127.0.0.1:5000/api/room", { //Axios API 'POST' call
    number,
    capacity,
    floor,
  });
  const jsondata = response.data;
  const Message = `Room ${number} added succesfully`;
  if (jsondata === null || (Array.isArray(jsondata) && jsondata.length === 0)) {
    res.render("pages/msgsuc.ejs", { Message });
  } else {
    res.render("pages/err.ejs", { jsondata });
  }
}); //Room API Post

app.get("/room/update", Authentication, async (req, res) => {
  const roomnumber = req.params.roomnumber;
  const response = await axios.get("http://127.0.0.1:5000/api/room"); //Roomdata needed in update page
  const roomdata = response.data;
  res.render("pages/roomupdate.ejs", { roomnumber, roomdata });
});

app.put("/api/room/:roomnumber", async (req, res) => {
  const roomnumber = req.body.roomnumber;
  const capacity = req.body.capacity;
  const response = await axios.put(`http://127.0.0.1:5000/api/room/${roomnumber}`,{ //Axios PUT
    capacity: capacity,
    }
  );
  const jsondata = response.data;
  const Message = jsondata.Message;
  if (response.status === 200) {
    res.render("pages/msgsuc.ejs", { Message });
  }
}); //Room API update

app.get("/room/delete", Authentication, async (req, res) => { //Room Delete page
  const number = req.body.number;
  const response = await axios.get("http://127.0.0.1:5000/api/room");
  const roomdata = response.data;
  res.render("pages/roomdelete.ejs", { roomdata, number });
});

app.delete("/api/room/:number", async (req, res) => {
  const number = req.body.number;
  const response = await axios.delete(`http://127.0.0.1:5000/api/room/${number}`, {}); //Delete API call via room number
  const jsondata = response.data;
  const Message = jsondata.Message;
  if (response.status === 200) {
    res.render("pages/msgsuc.ejs", { Message });
  }
});

//ROOM CRUDs END






//RESIDENT CRUDs
app.get("/resident", Authentication, function (req, res) { //Resident CRUDs Page
  res.render("pages/resident.ejs", {});
});

app.get("/resident/view", Authentication, async (req, res) => { //Resident View page
  const response = await axios.get("http://127.0.0.1:5000/api/resident");
  const residentdata = response.data;
  res.render("pages/residentview.ejs", { residentdata });
});

app.get("/resident/add", Authentication, async (req, res) => { //Resident Add page
  const response = await axios.get("http://127.0.0.1:5000/api/room"); // Rendering roomdata for the available rooms to add residents to
  const roomdata = response.data;
  res.render("pages/residentadd.ejs", { roomdata });
});

app.post("/resident/add", async (req, res) => {
  const residentID = req.body.residentID; //Secondary ID (RID) (NOT PK)// Resident ID is generated with a button so that managing residents is easier with one parameter.
  const firstname = req.body.firstname;
  const lastname = req.body.lastname;
  const age = req.body.age;
  const room = req.body.room;
  const response = await axios.post("http://127.0.0.1:5000/api/resident", { // API POST for resident
    residentID,
    firstname,
    lastname,
    age,
    room,
  });
  const Message = `Resident ${firstname[0]}.${lastname} was added succesfully`; //Success message
  const jsondata = response.data;
  if (jsondata === null || (Array.isArray(jsondata) && jsondata.length === 0)) {
    res.render("pages/msgsuc.ejs", { Message });
  } else {
    res.render("pages/err.ejs", { jsondata });
  }
});

app.get("/resident/update", Authentication, async (req, res) => { // Resident Update page
  const residentID = req.body.residentID;
  const response = await axios.get("http://127.0.0.1:5000/api/room");
  const response2 = await axios.get("http://127.0.0.1:5000/api/resident"); //2 Axios GET requests because this operation reassigns the resident's room so both the resident data and room data is needed
  const residentdata = response2.data;
  const roomdata = response.data;
  res.render("pages/residentupdate.ejs", {
    residentID,
    roomdata,
    residentdata,
  });
});

app.put("/api/resident/:residentID", async (req, res) => {
  const residentID = req.body.residentID;
  const room = req.body.room;
  const response = await axios.put(
    `http://127.0.0.1:5000/api/resident/${residentID}`, //Residents Updated via residentID Secondary ID
    { 
      room: room,
    }
  );
  const jsondata = response.data;
  const Message = jsondata.Message;
  if (response.status === 200) {
    res.render("pages/msgsuc.ejs", { Message });
  }
});

app.get("/resident/delete", Authentication, async (req, res) => { //Resident Delete Page
  const residentID = req.body.residentID;
  const response = await axios.get("http://127.0.0.1:5000/api/resident"); //Resident data rendered
  const residentdata = response.data;
  res.render("pages/residentdelete.ejs", { residentdata, residentID });
});

app.delete("/api/resident/:residentID", async (req, res) => {
  const residentID = req.body.residentID;
  const response = await axios.delete(`http://127.0.0.1:5000/api/resident/${residentID}`, {} ); //Resident deleted via residentID
  const jsondata = response.data;
  const Message = jsondata.Message;
  if (response.status === 200) {
    res.render("pages/msgsuc.ejs", { Message });
  }
});
//RESIDENT CRUDs END





app.listen(3000, () => {
  console.log("3000 to the moon"); // App runs on PORT 3000, Flask on PORT 5000
});



//RESOURCES
//CHAT GPT -- Conditional statements for the responses
//CHAT GPT -- Correct routing for PUT and DELETE requests
//CHAT GPT -- Session handling for login

//Stack Overflow -- Path middleware for local use of dependencies. I.E node_modules axios etc...
// Stack Overflow -- MethodOverride middleware for my PUT and DELETEs
//GeeksforGeeks-- ejs redirect after message

//YOUTUBE Build Node.js User Authentication - Password Login https://www.youtube.com/watch?v=Ud5xKCYQTjM bcrypt
//YOUTUBE Node.Js Login and Registration with Database https://www.youtube.com/watch?v=ILviQic0c8g&t=560s
//Formatted with Prettier on VSCode
