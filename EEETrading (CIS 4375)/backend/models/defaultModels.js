const uuid = require('uuid');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//collection for orgDataSchema
const orgDataSchema = new Schema ({
    organizationName: {
        type: String,
        required: true
    }
}, {
    collection: 'orgData',
    timestamps: true
});

//collection for primaryDataSchema which should be accessible across all organizations
let primaryDataSchema = new Schema({
    _id: { type: String, default: uuid.v1 },
    organizationID: {
        type: Array,
        ref: 'orgData',
        required: true
    },
    primaryStatus:{
        activeStatus: {
            type:Boolean,
            default:true,
            required:true
        },
        statusChangeDate:{
            type:Date
        }
    },
    birthMonth: {
        type: Number,
        required: true,
        min: 1,
        max: 12   
    },
    birthDay: {
        type: Number,
        required: true,
        min: 1,
        max: 31
    },
}, {
    collection: 'primaryData',
    timestamps: true
});

//collection for clientDataSchema (formally known as secondaryDataSchema)     HOOKAH WHOLESALE
let clientDataSchema = new Schema({
    _id: { type: String, default: uuid.v1 },
    primaryDataID: { 
        type: String, 
        ref: 'primaryData', // connecting clientid to primaryData
        required: true
    },
    organizationID: {
        type: String,
        ref: 'orgData',
        required: true
    },
    phoneNumbers: {
        type: Array,
        required: true
    },
    address: {
        line1: {
            type: String
        },
        line2: {
            type: String,
        },
        city: {
            type: String,
            required: true
        },
        county: {
            type: String,
        },
        zip: {
            type: String,
        }
    },
}, {
    collection: 'clientData',
    timestamps: true
});

//collection for eventData
let eventDataSchema = new Schema({
    _id: { type: String, default: uuid.v1 },
    organizationID: {
        type: Array,
        ref: 'orgData',
        required: true
    },
    eventName: {
        type: String,
        require: true
    },
    services: {
        type: Array
    },
    date: {
        type: Date,
        required: true
    },
    address: {
        line1: {
            type: String
        },
        line2: {
            type: String,
        },
        city: {
            type: String,
        },
        county: {
            type: String,
        },
        zip: {
            type: String,
        }
    },
    description: {
        type: String,
    },
    attendees: [{
        type: String
    }]
}, {
    collection: 'eventData'
});

//collection for projectDataSchema
let projectDataSchema = new Schema({
    _id: { type: String, default: uuid.v1 },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    }
}, {
    collection: 'projectData',
    timestamps: true
});

//collection for userData
let userDataSchema = new Schema({
    _id: { type: String, default: uuid.v1 },    
    organizationID: {
        type: Array,
        ref: 'orgData',
        required: true
    },
    firstName: {
        type: String,
    },
    lastName: {
        type: String
    },
    email: {
        unique: true,
        type: String,
        required: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
        length: 256,
    },
    role: {
        type: String,
        enum: ['customer', 'owner'],
        default: 'customer'
    },
    userStatus: {
        type: String,
        enum: ['Pending', 'Active','Inactive'],
        default: 'Pending',
    },
    confirmationCode: {
        type: String,
        unique: true
    },
    expiresAt: { 
        type: Date, 
        required: true }
}, {
    collection: 'userData',
    timestamps: true
});



// userDataSchema.path('email').validate(async (email) => {
//    const emailCount =  await mongoose.models.userData.countDocuments({ email })
//     return !emailCount
// }, title= 'EMAIL ALREADY EXISTS')


// create models from mongoose schemas
const orgdata = mongoose.model('orgData', orgDataSchema);
const primarydata = mongoose.model('primaryData', primaryDataSchema);
const clientdata = mongoose.model('clientData', clientDataSchema);
const eventdata = mongoose.model('eventData', eventDataSchema);
const projectdata = mongoose.model('projectData', eventDataSchema);
const userdata = mongoose.model('userData', userDataSchema);
// package the models in an object to export 
module.exports = { orgdata, primarydata, clientdata, eventdata, projectdata, userdata}
