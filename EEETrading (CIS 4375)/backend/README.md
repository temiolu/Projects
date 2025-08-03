# Data Platform Backend

This implementation is for NodeJS based on [Express](https://expressjs.com/) and [MongoDB](https://www.mongodb.com/) and uses [mongoose](https://mongoosejs.com/) as the ODM.
## Project setup
```
npm install
```

### Before Startup 
Setup a .env file with following variables, e.g.:

```
# everything below are fake values and just to show an example
# link to the DB on MongoDB
MONGO_URL = mongodb+srv://rw-mu:code@cluster0.abc.mongodb.net/mu?rw=true&w=majority
# SECRETKEY CODE
SECRETKEY = "example"
# current organization's ID using the data platform, which will found in the MONGODB in orgData as _id
ORG_ID = 0987654321
# nodemailer credentials for logging in
EMAIL = "example@gmail.com"
PASS = "example"
```
### Compiles and hot-reloads for development
```
npm start
```
