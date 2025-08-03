const express = require("express");
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
//importing data model schemas
let { userdata } = require("../models/defaultModels"); 
const nodemailer = require("../services/nodemailer.config");
const mysql = require("mysql2/promise");
const randomString = require('randomstring');
const orgID = process.env.ORG_ID;
const dataSocietyOrgID = process.env.ORG_ID_DATASOCIETY;
//importing authUser function to secure routes
const userAuthentication = require('../services/basicAuth');
let authUser = userAuthentication.authUser;

//POST
router.post('/register', async (req, res, next) => {
    try {
      const filter = req.body.email;
      const existingUser = await userdata.findOne({ email: filter }).exec();
      if (existingUser) {
        return res.status(401).json({
          title: 'Existing Email',
          error: 'Email already exists.',
        });
      }
  
      const key = randomString.generate({
        length: 6,
        charset: 'numeric',
      });
      let date = new Date();

      const crypto = require('crypto');

      function hashID(id) {
        return crypto.createHash('sha256').update(id).digest('hex');
      }
      
      // Store the hash value you generated
      const storedHash = "69c84183c6ff294215175eb78721054c151ca42ea445de05441e565ae7312487";

      const storedHashTwo = "960eea8bc9712f618113b87a0f725e47a0e4dfd529838319a08757b42fe7b1ae";
      
      // At runtime, you'd use this:
      const orgIDHash = hashID(process.env.ORG_ID);
      
      // Compare the hashed ORG_ID with the stored hash
      const tempRole = (orgIDHash === storedHash || storedHashTwo) ? 'Student' : 'Basic';
      console.log('tempRole: ', tempRole)

      const newUser = new userdata({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber,
        password: bcrypt.hashSync(req.body.password, 10),
        organizationID: orgID,
        //next line says that default role for this organization = student while the others = basic
        role: tempRole,
        confirmationCode: key,
        expiresAt: date.setMinutes(date.getMinutes() + 10),
      });
  
      const savedUser = await newUser.save();
  
      nodemailer.sendConfirmationEmail(
        savedUser.firstName,
        savedUser.email,
        savedUser.confirmationCode
      );
  
      res.json(savedUser);
    } catch (err) {
      console.error(err);
      res.status(500).json({
        title: 'server error',
        error: err.message,
      });
    }
  });
  

//login page
router.post('/login', (req, res, next) => {
    userdata.findOne({email: req.body.email, organizationID: orgID }, (err, userdata) => {
        if(err) return res.status(500).json({
            title: 'server error',
            error: err
        })
        //existing user check
        if (!userdata) {
            return res.status(401).json({
                title: 'User not found.',
                error: 'Invalid credentials.'
            })
        }
        //incorect password check
        if (!bcrypt.compareSync(req.body.password, userdata.password)) {
            return res.status(401).json({
                title: 'Login Failed.',
                error: 'Invalid Password.',
            })
        }
        //active user check
        if (userdata.userStatus != "Active") {
            return res.status(401).json({
                title: 'Pending user account',
                error: 'Pending Account. Please Verify Your Email.'
            })
        }
        //If all is good create a token and sent to frontend
        let token = jwt.sign({userId: userdata._id, userRole: userdata.role}, process.env.SECRETKEY, {expiresIn: "200min"});
        return res.status(200).json({
            title: 'Login success',
            token: token,
            userID: userdata._id,
            userRole: userdata.role
        })

    })
});

// Gets generated token from login and uses it to output the user's name for the welcome message
router.get('/user', authUser, (req, res, next) => {
  let token = req.headers.token;

  jwt.verify(token, process.env.SECRETKEY, (err, decoded) => {
      if (err) {
          return res.status(401).json({ title: 'Unauthorized' });
      }

      // Token is valid
      userdata.findById(decoded.userId, (err, user) => {
          if (err) {
              return next(err);  // Passing the error to the error-handling middleware
          }

          if (!user) {
              return res.status(404).json({ title: 'User not found' });
          }

          return res.status(200).json({
              title: 'User grabbed',
              user: {
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email,
                  userID: user._id
              }
          });
      });
  });
});


router.get("/", async (req, res) => {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    try {

      const [userData] = await connection.execute(
        "SELECT id, email, role FROM users"
      );
      if (!userData.length) return res.status(404).json({ message: "No users found" });
      res.json(userData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching images", error });
    } finally {
      connection.end();
    }
  });

//user email confiramtion route
router.put('/verify', async (req, res, next) => {
    const filter = {confirmationCode: req.body.code};
    userdata.findOne({confirmationCode: req.body.code }, async (err, user) => {
            if (!user) {
                return res.status(401).json({
                    title: 'User not found.',
                    error: 'Invalid code.'
                })
            }
            else if (user.expiresAt <= new Date()) {
                return res.status(401).json({
                    title: 'Expired code',
                    error: 'The code you entered has expired.'
                })
            }
            else{
                const updateSuccsses = await userdata.findOneAndUpdate(filter, {userStatus: 'Active'}, {
                    returnOriginal: false
                });
                return res.status(200).json({
                    title: 'success',
                    error: 'The account has been successfully activated.'
                })
            }
    })

    
})
//reset password route
router.put('/resetPassword', async (req, res, next) => {
    const key = randomString.generate({
        length: 6,
        charset: 'numeric'
    });
    let date = new Date();
    const filter = {email: req.body.email};
    const update = {confirmationCode: key, expiresAt: date.setMinutes(date.getMinutes() + 10)};
    const updateSuccsses = await userdata.findOneAndUpdate(filter, update, {
        returnOriginal: false
    });
    if (!updateSuccsses) {
        return res.status(401).json({
            title: 'User not found.',
            error: 'Invalid email.'
        })
    }
    nodemailer.sendResetPasswordEmail(
        req.body.email,
        key
    );
    return res.status(200).json({
        title: ' seccess',
        error: 'Please check your email and follow the steps to reset your password.'
    })
    
})
//reset password form route
router.put('/resetPasswordForm', async (req, res, next) => {
    const newHashedPassword = bcrypt.hashSync(req.body.newPassword, 10);
    const filter = {confirmationCode: req.body.code};
    const update = {password: newHashedPassword, 
                };
    userdata.findOne({confirmationCode: req.body.code }, async (err, user) => {
        if (!user) {
            return res.status(401).json({
                title: 'User not found.',
                error: 'Invalid code.'
            })
        }else if (user.expiresAt <= new Date()) {
            return res.status(401).json({
                    title: 'Expired code',
                    error: 'The code you entered has expired.'
                    })
        }
        else{
            const updateSuccsses = await userdata.findOneAndUpdate(filter, update, {
                returnOriginal: false
            });
            return res.status(200).json({
                title: 'Success',
                error: 'Your password has been successfully reset.'
            })
        }
    })
})


// Update password form route
router.put('/updatePasswordForm', authUser, async (req, res, next) => {
  const newHashedPassword = bcrypt.hashSync(req.body.newPassword, 10);
  const oldPassword = req.body.code;
  const token = req.headers.token;

  jwt.verify(token, process.env.SECRETKEY, async (err, decoded) => {
      if (err) {
          return res.status(401).json({
              title: 'Unauthorized',
              error: 'Invalid token'
          });
      }

      // Token is valid
      const filter = {_id: decoded.userId};
      userdata.findById(decoded.userId, async (err, user) => {
          if (err) {
              return next(err);  // Passing the error to the error-handling middleware
          }

          if (!bcrypt.compareSync(oldPassword, user.password)) {
              return res.status(401).json({
                  title: 'Old password incorrect',
                  error: 'The current password does not match our records.'
              });
          }

          user.password = newHashedPassword;  // Assigning the new hashed password
          await user.save();  // Saving the updated user with new password

          res.status(200).json({
              title: 'Success',
              message: 'Your password has been successfully updated.'
          });
      });
  });
});

// Update user form route
router.put('/updateUserData', authUser, async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;
  const token = req.headers.token;

  try {
      const decoded = jwt.verify(token, process.env.SECRETKEY);

      // Token is valid
      const user = await userdata.findById(decoded.userId);

      if (!user) {
          return res.status(404).json({
              title: 'User Not Found',
              error: 'No user found for the provided token.'
          });
      }

      if (!bcrypt.compareSync(password, user.password)) {
          // Send password incorrect error as JSON response
          return res.status(401).json({
              title: 'Password Incorrect',
              error: 'The current password does not match our records.'
          });
      }

      // Update user data
      user.firstName = firstName;
      user.lastName = lastName;
      user.email = email;
      await user.save();

      return res.status(200).json({
          title: 'Success',
          message: 'Your user data has been successfully updated.'
      });
  } catch (error) {
      // Handle the MongoDB duplicate key error and send appropriate error message
      if (error.code === 11000) {
          return res.status(400).json({
              title: 'Duplicate Email',
              error: 'The email address you provided already exists in our system.'
          });
      }
      // Handle any other errors that occurred during the request processing
      return next(error);  // Passing the error to the error-handling middleware
  }
});


//sends new code 
router.put('/sendNewCode', async (req, res, next) => {
    try {
        // Fetch user by email
        const userEmail = req.body.email;        

        // Generate a new confirmation code
        const key = randomString.generate({
            length: 6,
            charset: 'numeric',
        });

        let date = new Date();
        const filter = { email: userEmail };
        const update = {
            confirmationCode: key,
            expiresAt: date.setMinutes(date.getMinutes() + 10),
        };
        const updateSuccess = await userdata.findOneAndUpdate(filter, update, {
            returnOriginal: false,
        });

        if (!updateSuccess) {
            return res.status(404).json({
                title: 'User not found.',
                error: 'Invalid email.',
            });
        }

        nodemailer.sendNewCode(userEmail, key);

        return res.status(200).json({
            title: 'Success',
            message: 'Please check your email and follow the steps to reset your password.',
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            title: 'Internal Server Error',
            error: 'An internal server error occurred. Please try again later.',
        });
    }
});

// Get user email address (to reset password)
router.get('/getUserEmail', authUser, async (req, res, next) => {
  const userID = req.query.userID; // Get userID from query parameter

  try {
    const user = await userdata.findById(userID); // Find user by userID
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.status(200).json({
      email: user.email // Send the user's email address in the response
    });
  } catch (error) {
    next(error);  // Passing the error to the error-handling middleware
  }
});


// Update status of the user's account using PUT
router.put("/userStatusUpdate/:id", authUser, async (req, res, next) => {
  try {
      const user = await userdata.findById(req.params.id);

      if (!user) {
          return res.status(404).json({ message: "User not found." });
      }

      user.userStatus = req.body.userStatus;
      await user.save();

      res.status(200).json({
          message: "User status updated successfully.",
          updatedStatus: user.userStatus
      });
  } catch (error) {
      next(error);  // Passing the error to the error-handling middleware
  }
});




module.exports = router;